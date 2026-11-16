import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudyNotebookStore } from '../src/services/studyNotebookStore.js';
import { createNotebookDraftStorage } from '../src/services/studyNotebookDrafts.js';
import {
  createNotebookReference,
  transitionNotebookState,
  notebookStateFromEntry,
  notebookSourceGroup,
  notebookError,
} from '../src/utils/studyNotebook.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
async function fixture() {
  const q = {
    id: 'store-fixture',
    question: 'Choose A',
    options: { A: 'Yes', B: 'No' },
    answer: ['A'],
  };
  const ref = await createNotebookReference(
    { kind: 'bank', id: 'gcp-ace', questions: [q] },
    q,
    'alice'
  );
  const accounts = new Map(),
    writes = [],
    storage = new Map();
  const drafts = createNotebookDraftStorage(() => ({
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }));
  const account = (uid) => {
    if (!accounts.has(uid))
      accounts.set(uid, { entries: new Map(), state: { count: 0, revision: 0, generation: 0 } });
    return accounts.get(uid);
  };
  const service = {
    async state(uid) {
      return structuredClone(account(uid).state);
    },
    async get(uid, key) {
      const data = account(uid);
      return structuredClone({ entry: data.entries.get(key) || null, state: data.state });
    },
    async listPage(uid) {
      return { entries: [...account(uid).entries.values()], next: null };
    },
    async mutate(uid, cmd) {
      writes.push(cmd);
      assert.equal(cmd.owner, uid);
      const data = account(uid),
        old = data.entries.get(cmd.entryKey),
        marker = old || data.state;
      if (marker.lastOperationId === cmd.operationId) {
        assert.equal(marker.lastOperationFingerprint, cmd.fingerprint);
        return { entry: old || null, state: data.state, replayed: true };
      }
      if (
        (old?.revision || 0) !== cmd.expectedRevision ||
        data.state.generation !== cmd.expectedGeneration
      )
        throw notebookError('CONFLICT');
      const next = transitionNotebookState(
        old && notebookStateFromEntry(old),
        cmd.change,
        1000 + data.state.revision
      );
      if (!old && !next) return { entry: null, state: data.state, noop: true };
      const markers = {
        lastOperationId: cmd.operationId,
        lastOperationFingerprint: cmd.fingerprint,
      };
      if (next)
        data.entries.set(cmd.entryKey, {
          schemaVersion: 1,
          entryKey: cmd.entryKey,
          ref: cmd.ref,
          sourceGroup: notebookSourceGroup(cmd.ref),
          ...next,
          revision: (old?.revision || 0) + 1,
          ...markers,
          createdAt: old?.createdAt || 1000,
          updatedAt: 1000 + data.state.revision,
        });
      else data.entries.delete(cmd.entryKey);
      data.state = {
        count: data.state.count + (next ? (old ? 0 : 1) : -1),
        revision: data.state.revision + 1,
        generation: data.state.generation + (next ? 0 : 1),
        lastEntryKey: cmd.entryKey,
        ...markers,
      };
      return { committed: true };
    },
  };
  const store = createStudyNotebookStore(service, { drafts });
  await store.activate('alice', true);
  return { store, service, ref, drafts, storage, writes, account };
}

test('offline/denied saves preserve input and exact pending command; response loss retries do not consume capacity twice', async () => {
  for (const failure of ['NETWORK', 'DENIED']) {
    const { store, service, ref, writes } = await fixture();
    const key = await store.open(ref);
    store.input(key, 'Typed before failure');
    const mutate = service.mutate;
    let fail = true;
    service.mutate = async (uid, cmd) => {
      const result = await mutate(uid, cmd);
      if (fail) {
        fail = false;
        throw notebookError(failure);
      }
      return result;
    };
    await assert.rejects(store.change(key, { kind: 'note', value: 'Typed before failure' }), {
      code: `NOTEBOOK_${failure}`,
    });
    const failed = store.getSnapshot().editors[key];
    assert.equal(failed.input, 'Typed before failure');
    assert.equal(failed.status, 'error');
    assert.equal(failed.dirty, true);
    await store.retry(key);
    assert.deepEqual(writes[0], writes[1]);
    assert.equal(store.getSnapshot().editors[key].status, 'saved');
    assert.equal((await service.state('alice')).count, 1);
    assert.equal((await service.state('alice')).revision, 1);
  }
});

test('conflict retains input; only explicit refresh changes expectations, and refresh never auto-submits', async () => {
  const { store, service, ref, account, writes } = await fixture();
  const key = await store.open(ref);
  store.input(key, 'Initial');
  await store.change(key, { kind: 'note', value: 'Initial' });
  store.input(key, 'My local draft');
  const row = account('alice').entries.get(key);
  account('alice').entries.set(key, { ...row, note: 'Other device', revision: 2 });
  account('alice').state.revision++;
  await assert.rejects(store.change(key, { kind: 'note', value: 'My local draft' }), {
    code: 'NOTEBOOK_CONFLICT',
  });
  assert.equal(store.getSnapshot().editors[key].input, 'My local draft');
  assert.equal(store.getSnapshot().editors[key].base.revision, 1);
  assert.throws(() => store.retry(key), { code: 'NOTEBOOK_CONFLICT' });
  const count = writes.length;
  await store.refreshEditor(ref);
  assert.equal(writes.length, count);
  const refreshed = store.getSnapshot().editors[key];
  assert.equal(refreshed.input, 'My local draft');
  assert.equal(refreshed.entry.note, 'Other device');
  assert.equal(refreshed.base.revision, 2);
  await store.change(key, { kind: 'note', value: refreshed.input });
  assert.equal((await service.get('alice', key)).entry.note, 'My local draft');
});

test('new input while a save is in flight survives confirmation and duplicate actions are blocked', async () => {
  const { store, service, ref, writes } = await fixture();
  const key = await store.open(ref),
    gate = deferred(),
    mutate = service.mutate;
  service.mutate = async (...args) => {
    await gate.promise;
    return mutate(...args);
  };
  store.input(key, 'First note');
  const first = store.change(key, { kind: 'note', value: 'First note' });
  while (!store.getSnapshot().editors[key].saving) await new Promise((done) => setImmediate(done));
  store.input(key, 'New input while waiting');
  await assert.rejects(store.change(key, { kind: 'bookmark', value: true }), {
    code: 'NOTEBOOK_BUSY',
  });
  gate.resolve();
  await first;
  const editor = store.getSnapshot().editors[key];
  assert.equal(editor.input, 'New input while waiting');
  assert.equal(editor.entry.note, 'First note');
  assert.equal(editor.dirty, true);
  assert.equal(editor.status, 'unsaved');
  assert.equal(writes.length, 1);
});

test('late reads/writes cannot populate a new account or rebind the original command to it', async () => {
  const { store, service, ref, writes } = await fixture();
  const gate = deferred(),
    get = service.get;
  service.get = async (...args) => {
    await gate.promise;
    return get(...args);
  };
  const read = store.open(ref);
  await new Promise((done) => setImmediate(done));
  await store.activate('bob', true);
  gate.resolve();
  await assert.rejects(read, { code: 'NOTEBOOK_SESSION_CHANGED' });
  assert.deepEqual(store.getSnapshot().editors, {});
  service.get = get;
  await store.activate('alice', true);
  const key = await store.open(ref),
    writeGate = deferred(),
    mutate = service.mutate;
  service.mutate = async (...args) => {
    await writeGate.promise;
    return mutate(...args);
  };
  store.input(key, 'Alice only');
  const save = store.change(key, { kind: 'note', value: 'Alice only' });
  while (!store.getSnapshot().editors[key].saving) await new Promise((done) => setImmediate(done));
  await store.activate('bob', true);
  writeGate.resolve();
  await assert.rejects(save, { code: 'NOTEBOOK_SESSION_CHANGED' });
  assert.equal(writes[0].owner, 'alice');
  assert.deepEqual(store.getSnapshot().editors, {});
  assert.equal((await service.state('bob')).count, 0);
});

test('tab recovery keeps original account/revision/generation and operation; no automatic resubmission after reload', async () => {
  const { store, service, ref, drafts, account, writes } = await fixture();
  const key = await store.open(ref),
    mutate = service.mutate;
  service.mutate = async () => {
    throw notebookError('NETWORK');
  };
  store.input(key, 'Unsaved recovery text');
  await assert.rejects(store.change(key, { kind: 'note', value: 'Unsaved recovery text' }));
  const operation = store.getSnapshot().editors[key].command;
  // Another device intentionally deletes a row while this tab is offline.
  account('alice').state.generation = 1;
  service.mutate = mutate;
  const fresh = createStudyNotebookStore(service, { drafts });
  await fresh.activate('bob', true);
  assert.deepEqual(fresh.getSnapshot().editors, {});
  await fresh.activate('alice', true);
  await fresh.open(ref);
  assert.equal(writes.length, 0);
  assert.equal(fresh.getSnapshot().editors[key].input, 'Unsaved recovery text');
  assert.deepEqual(fresh.getSnapshot().editors[key].command, operation);
  assert.equal(fresh.getSnapshot().editors[key].base.generation, 0);
  await assert.rejects(fresh.retry(key), { code: 'NOTEBOOK_CONFLICT' });
  assert.equal((await service.state('alice')).count, 0);
});

test('validation/storage failures retain typed text; disabled storage makes no cloud requests', async () => {
  const { store, ref } = await fixture();
  const key = await store.open(ref),
    oversized = 'x'.repeat(2001);
  store.input(key, oversized);
  await assert.rejects(store.change(key, { kind: 'note', value: oversized }), {
    code: 'NOTEBOOK_SIZE',
  });
  assert.equal(store.getSnapshot().editors[key].input, oversized);
  assert.equal(store.getSnapshot().editors[key].error.code, 'NOTEBOOK_SIZE');
  const disabled = createStudyNotebookStore(
    new Proxy(
      {},
      {
        get: () => {
          throw new Error('Unexpected IO');
        },
      }
    )
  );
  await disabled.activate('alice', false);
  await assert.rejects(disabled.open(ref), { code: 'NOTEBOOK_AUTH' });
  assert.deepEqual(disabled.getSnapshot().entries, []);
  const denied = createNotebookDraftStorage(() => {
    throw new Error('Storage denied');
  });
  assert.deepEqual(await denied.read('alice'), {});
  assert.equal(denied.write('alice', {}), false);
});

test('paged state rejects changed cursors/duplicate rows and late pages; note input survives list refresh', async () => {
  const { store, service, ref, account } = await fixture();
  const key = await store.open(ref);
  store.input(key, 'Local draft');
  const gate = deferred();
  service.listPage = async () => gate.promise;
  const older = store.loadPage();
  await new Promise((done) => setImmediate(done));
  service.listPage = async () => ({ entries: [], next: null });
  await store.loadPage({ bookmarks: true });
  gate.resolve({ entries: [{ entryKey: 'old' }], next: null });
  await older;
  assert.deepEqual(store.getSnapshot().entries, []);
  assert.equal(store.getSnapshot().filters.bookmarks, true);
  assert.equal(store.getSnapshot().editors[key].input, 'Local draft');
  service.listPage = async () => ({
    entries: [{ entryKey: 'duplicate' }, { entryKey: 'duplicate' }],
    next: null,
  });
  await store.loadPage();
  assert.equal(store.getSnapshot().error.code, 'NOTEBOOK_INVALID');
  service.listPage = async () => {
    account('alice').state.revision++;
    return { entries: [], next: null };
  };
  await store.loadPage();
  assert.equal(store.getSnapshot().error.code, 'NOTEBOOK_CONFLICT');
});
