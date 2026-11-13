import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  runTransaction,
  query,
  limit,
  setDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { createStudyNotebookRepository } from '../../src/services/studyNotebookRepository.js';
import { createNotebookCommand } from '../../src/utils/studyNotebookCommand.js';
import {
  createNotebookReference,
  notebookSourceGroup,
  emptyNotebookState,
} from '../../src/utils/studyNotebook.js';
import { createCustomQuizService } from '../../src/services/customQuizRepository.js';
import { createCustomCandidate, cloudQuizId } from '../../src/utils/customQuizModel.js';
import { secureId } from '../../src/utils/secureId.js';
import { notebookFilterShapes } from '../../src/utils/studyNotebookQuery.js';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
let env;
const client = (uid = 'alice', anonymous = false) =>
  uid
    ? env
        .authenticatedContext(uid, {
          firebase: { sign_in_provider: anonymous ? 'anonymous' : 'google.com' },
        })
        .firestore()
    : env.unauthenticatedContext().firestore();
const repo = (db = client(), options) => createStudyNotebookRepository(db, options);
const paths = (db, key, uid = 'alice') => ({
  entry: doc(db, `users/${uid}/notebookEntries/${key}`),
  quota: doc(db, `users/${uid}/notebookState/quota`),
});
const q = {
  id: 'notebook-fixture',
  question: 'Choose A',
  options: { A: 'Yes', B: 'No' },
  answer: ['A'],
};
const reference = async (id = q.id) => {
  const question = { ...q, id };
  return createNotebookReference(
    { kind: 'bank', id: 'gcp-ace', questions: [question] },
    question,
    'alice'
  );
};
const command = async (ref, change = { kind: 'note', value: 'Owner note' }, base = {}) =>
  createNotebookCommand({
    owner: 'alice',
    ref,
    change,
    expectedRevision: 0,
    expectedGeneration: 0,
    ...base,
  });
const next = async (service, cmd, change) => {
  const context = await service.get('alice', cmd.entryKey);
  return command(cmd.ref, change, {
    expectedRevision: context.entry?.revision || 0,
    expectedGeneration: context.state.generation,
  });
};
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await fs.readFile(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8'),
    },
  });
});
beforeEach(() => env.clearFirestore());
after(() => env?.cleanup());

function rawData(cmd, { entry = {}, state = {} } = {}) {
  return {
    entry: {
      schemaVersion: 1,
      entryKey: cmd.entryKey,
      ref: cmd.ref,
      sourceGroup: notebookSourceGroup(cmd.ref),
      ...emptyNotebookState(),
      note: 'fixture',
      revision: 1,
      lastOperationId: cmd.operationId,
      lastOperationFingerprint: cmd.fingerprint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...entry,
    },
    state: {
      count: 1,
      revision: 1,
      generation: 0,
      lastEntryKey: cmd.entryKey,
      lastOperationId: cmd.operationId,
      lastOperationFingerprint: cmd.fingerprint,
      updatedAt: serverTimestamp(),
      ...state,
    },
  };
}
function rawCreate(db, cmd, options = {}) {
  const data = rawData(cmd, options),
    target = paths(db, cmd.entryKey),
    batch = writeBatch(db);
  if (options.omit !== 'entry') batch.set(target.entry, data.entry);
  if (options.omit !== 'quota') batch.set(target.quota, data.state);
  return batch.commit();
}

test('owner notes synchronize across clients; Bob, guest and anonymous owner cannot read/write notebook children', async () => {
  const cmd = await command(await reference(), { kind: 'note', value: '🌱'.repeat(2000) });
  const profile = {
    quizProgress: { 'gcp-ace': { questionId: 'kept-checkpoint', questionIndex: 2, savedAt: 1000 } },
  };
  await setDoc(doc(client(), 'users/alice'), profile);
  await repo().mutate('alice', cmd);
  const loaded = await repo().get('alice', cmd.entryKey);
  assert.equal(loaded.entry.note, '🌱'.repeat(2000));
  assert.equal(loaded.state.count, 1);
  assert.equal(typeof loaded.entry.createdAt, 'number');
  assert.deepEqual((await getDoc(doc(client(), 'users/alice'))).data(), profile);
  for (const db of [client('bob'), client(null), client('alice', true)]) {
    for (const target of Object.values(paths(db, cmd.entryKey))) {
      await assertFails(getDoc(target));
      await assertFails(deleteDoc(target));
    }
    await assertFails(getDocs(query(collection(db, 'users/alice/notebookEntries'), limit(20))));
    await assertFails(rawCreate(db, await command(await reference('other'))));
  }
  const db = client();
  await assertSucceeds(getDocs(query(collection(db, 'users/alice/notebookEntries'), limit(20))));
  await assertFails(getDocs(collection(db, 'users/alice/notebookEntries')));
  await assertFails(getDocs(query(collection(db, 'users/alice/notebookEntries'), limit(21))));
  await assertFails(getDocs(query(collection(db, 'users/alice/notebookState'), limit(20))));
  await assertFails(getDocs(query(collectionGroup(db, 'notebookEntries'), limit(20))));
  await assertFails(setDoc(doc(db, 'users/alice/unknownChild/x'), { note: 'no inherited access' }));
});

test('explicit Rules reject uncoupled writes, forged fields/types/counts/revisions and note/ref bounds', async () => {
  const cmd = await command(await reference()),
    db = client();
  for (const options of [
    { omit: 'entry' },
    { omit: 'quota' },
    { entry: { extra: 'leak' } },
    { entry: { note: 5 } },
    { entry: { note: 'x'.repeat(2001) } },
    { entry: { note: '🌱'.repeat(2001) } },
    { entry: { ref: { ...cmd.ref, questionId: 'x'.repeat(1025) } } },
    { entry: { ref: { ...cmd.ref, extra: 'field' } } },
    { entry: { revision: 2 } },
    { entry: { lastOperationId: 'bad' } },
    { entry: { lastOperationFingerprint: 'bad' } },
    { entry: { reviewed: true } },
    { entry: { mistake: true } },
    { entry: { createdAt: new Date(1) } },
    { state: { count: 2 } },
    { state: { count: 501 } },
    { state: { revision: 2 } },
    { state: { generation: 1 } },
    { state: { lastEntryKey: 'a'.repeat(64) } },
    { state: { lastOperationId: secureId() } },
    { state: { extra: 'field' } },
  ])
    await assertFails(rawCreate(db, cmd, options));
  await assertSucceeds(rawCreate(db, cmd));
  await assertFails(deleteDoc(paths(db, cmd.entryKey).entry));
  await assertFails(deleteDoc(paths(db, cmd.entryKey).quota));
});

test('concurrent duplicates and response-loss retry consume one slot; stale note writes cannot overwrite another client', async () => {
  const cmd = await command(await reference()),
    a = repo(),
    b = repo();
  await Promise.all([a.mutate('alice', cmd), b.mutate('alice', cmd)]);
  assert.equal((await a.state('alice')).count, 1);
  const update = await next(a, cmd, { kind: 'note', value: 'Newer note' });
  const stale = await next(a, cmd, { kind: 'note', value: 'Old tab input' });
  let lose = true;
  const flaky = repo(client(), {
    transact: async (db, operation) => {
      const result = await runTransaction(db, operation);
      if (lose) {
        lose = false;
        throw Object.assign(new Error('Synthetic lost response'), { code: 'unavailable' });
      }
      return result;
    },
  });
  await assert.rejects(flaky.mutate('alice', update), { code: 'NOTEBOOK_NETWORK' });
  await flaky.mutate('alice', update);
  await assert.rejects(b.mutate('alice', stale), { code: 'NOTEBOOK_CONFLICT' });
  await assert.rejects(a.mutate('alice', cmd), { code: 'NOTEBOOK_CONFLICT' });
  assert.equal((await a.get('alice', cmd.entryKey)).entry.note, 'Newer note');
  assert.equal((await a.state('alice')).revision, 2);
});

test('deletion invalidates stale commands, supports response replay and only a fresh action recreates a row', async () => {
  const service = repo(),
    cmd = await command(await reference());
  await service.mutate('alice', cmd);
  const stale = await next(service, cmd, { kind: 'note', value: 'Stale input' });
  const other = await command(await reference('another'));
  const remove = await next(service, cmd, { kind: 'remove' });
  await service.mutate('alice', remove);
  await service.mutate('alice', remove);
  assert.equal((await service.state('alice')).count, 0);
  assert.equal((await service.state('alice')).generation, 1);
  for (const old of [cmd, stale, other])
    await assert.rejects(service.mutate('alice', old), { code: 'NOTEBOOK_CONFLICT' });
  const fresh = await next(service, cmd, { kind: 'bookmark', value: true });
  await service.mutate('alice', fresh);
  assert.equal((await service.get('alice', cmd.entryKey)).entry.revision, 1);
  await assert.rejects(service.mutate('alice', stale), { code: 'NOTEBOOK_CONFLICT' });
  await assert.rejects(service.mutate('alice', remove), { code: 'NOTEBOOK_CONFLICT' });
});

test('correct-only outcomes create no row; review retains note/bookmark and wrong answers reopen it', async () => {
  const service = repo(),
    ref = await reference();
  const correct = await command(ref, { kind: 'outcome', correct: true });
  await service.mutate('alice', correct);
  assert.equal((await service.state('alice')).revision, 0);
  const wrong = await command(ref, { kind: 'outcome', correct: false });
  await service.mutate('alice', wrong);
  for (const change of [
    { kind: 'note', value: 'Keep this' },
    { kind: 'bookmark', value: true },
    { kind: 'outcome', correct: true },
  ])
    await service.mutate('alice', await next(service, wrong, change));
  let row = (await service.get('alice', wrong.entryKey)).entry;
  assert.equal(row.reviewed, true);
  assert.equal(row.note, 'Keep this');
  assert.equal(row.bookmarked, true);
  const reviewedAt = row.lastReviewedAt;
  await service.mutate('alice', await next(service, wrong, { kind: 'outcome', correct: false }));
  row = (await service.get('alice', wrong.entryKey)).entry;
  assert.equal(row.reviewed, false);
  assert.equal(row.lastReviewedAt, reviewedAt);
  assert.equal((await service.state('alice')).count, 1);
});

test('clearing the last bookmark/note physically deletes the row and advances generation without erasing another entry', async () => {
  const service = repo(),
    ref = await reference();
  const bookmark = await command(ref, { kind: 'bookmark', value: true });
  await service.mutate('alice', bookmark);
  const stale = await next(service, bookmark, {
    kind: 'note',
    value: 'Do not restore deleted bookmark',
  });
  await service.mutate('alice', await next(service, bookmark, { kind: 'bookmark', value: false }));
  assert.equal((await service.get('alice', bookmark.entryKey)).entry, null);
  assert.equal((await service.state('alice')).generation, 1);
  await assert.rejects(service.mutate('alice', stale), { code: 'NOTEBOOK_CONFLICT' });
  const note = await next(service, bookmark, { kind: 'note', value: 'Note only' });
  await service.mutate('alice', note);
  const other = await command(
    await reference('kept'),
    { kind: 'note', value: 'Keep me' },
    { expectedGeneration: 1 }
  );
  await service.mutate('alice', other);
  await service.mutate('alice', await next(service, bookmark, { kind: 'note', value: '' }));
  assert.equal((await service.get('alice', bookmark.entryKey)).entry, null);
  assert.equal((await service.state('alice')).generation, 2);
  assert.equal((await service.state('alice')).count, 1);
  assert.equal((await service.get('alice', other.entryKey)).entry.note, 'Keep me');
});

test('private creation/outcomes recheck current content; orphaned retained notes remain editable and removable', async () => {
  const db = client(),
    custom = createCustomQuizService(db),
    service = repo(db);
  await custom.create('alice', createCustomCandidate('Notebook private fixture', [q]));
  let quiz = (await custom.list('alice'))[0];
  const ref = await createNotebookReference(
    {
      ...quiz,
      kind: 'cloud-custom',
      owner: 'alice',
      id: cloudQuizId(quiz.slotId, quiz.instanceId),
    },
    q,
    'alice'
  );
  const cmd = await command(ref);
  await service.mutate('alice', cmd);
  await custom.replace('alice', quiz, {
    title: quiz.title,
    questions: [{ ...q, question: 'Changed' }],
  });
  await assert.rejects(
    service.mutate('alice', await next(service, cmd, { kind: 'outcome', correct: false })),
    { code: 'NOTEBOOK_SOURCE_CHANGED' }
  );
  // Rules also reject a direct forgery of a stale private source on creation.
  const forged = await command({ ...ref, questionId: 'another' });
  await assertFails(rawCreate(db, forged, { state: { count: 2, revision: 2 } }));
  quiz = (await custom.list('alice'))[0];
  await custom.remove('alice', quiz);
  await service.mutate(
    'alice',
    await next(service, cmd, { kind: 'note', value: 'Source gone; keep note' })
  );
  assert.equal((await service.get('alice', cmd.entryKey)).entry.note, 'Source gone; keep note');
  await service.mutate('alice', await next(service, cmd, { kind: 'remove' }));
  await assert.rejects(
    service.mutate('alice', await next(service, cmd, { kind: 'note', value: 'No resurrection' })),
    { code: 'NOTEBOOK_SOURCE_CHANGED' }
  );
});

test(
  'last-slot contention yields one winner and cannot forge a second entry in the same quota update',
  { timeout: 60000 },
  async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore(),
        batch = writeBatch(db);
      for (let i = 0; i < 499; i++) {
        const cmd = await command(await reference(`seed-${i}`)),
          data = rawData(cmd);
        batch.set(paths(db, cmd.entryKey).entry, data.entry);
        if (i === 498)
          batch.set(paths(db, cmd.entryKey).quota, { ...data.state, count: 499, revision: 499 });
      }
      await batch.commit();
    });
    const a = await command(await reference('contender-a')),
      b = await command(await reference('contender-b'));
    const result = await Promise.allSettled([repo().mutate('alice', a), repo().mutate('alice', b)]);
    assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(result.find((r) => r.status === 'rejected').reason.code, 'NOTEBOOK_QUOTA');
    assert.equal((await repo().state('alice')).count, 500);
    await env.clearFirestore();
    const db = client(),
      batch = writeBatch(db),
      aa = rawData(a),
      bb = rawData(b);
    batch.set(paths(db, a.entryKey).entry, aa.entry);
    batch.set(paths(db, b.entryKey).entry, bb.entry);
    batch.set(paths(db, a.entryKey).quota, aa.state);
    await assertFails(batch.commit());
  }
);

test('SDK pages preserve timestamp precision/document-ID order and apply every legal server filter combination', async () => {
  const rows = [];
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore(),
      batch = writeBatch(db);
    for (let i = 0; i < 45; i++) {
      const cmd = await command(await reference(`page-${i}`));
      const mistake = i % 2 === 0,
        reviewed = mistake && i % 4 === 0;
      // Firestore persists microseconds; keep distinct server-representable
      // instants inside one millisecond, plus a large exact-timestamp tie.
      const updatedAt = new Timestamp(1000, i < 25 ? 123456000 : 123456000 + i * 1000);
      const data = rawData(cmd, {
        entry: {
          bookmarked: i % 3 === 0,
          mistake,
          reviewed,
          lastWrongAt: mistake ? new Timestamp(100, 0) : null,
          lastReviewedAt: reviewed ? new Timestamp(200, 0) : null,
          createdAt: new Timestamp(100, 0),
          updatedAt,
        },
      });
      batch.set(paths(db, cmd.entryKey).entry, data.entry);
      rows.push({ ...data.entry, nanos: updatedAt.nanoseconds });
    }
    await batch.commit();
  });
  const service = repo(),
    actual = [],
    sizes = [];
  let after = null;
  do {
    const page = await service.listPage('alice', {}, after);
    actual.push(...page.entries.map((entry) => entry.entryKey));
    sizes.push(page.entries.length);
    after = page.next;
  } while (after);
  assert.deepEqual(sizes, [20, 20, 5]);
  assert.deepEqual(
    actual,
    rows
      .sort((a, b) => b.nanos - a.nanos || (a.entryKey > b.entryKey ? -1 : 1))
      .map((r) => r.entryKey)
  );
  assert.equal(new Set(actual).size, 45);
  for (const filter of notebookFilterShapes()) {
    const expected = rows
      .filter(
        (r) =>
          (!filter.sourceGroup || r.sourceGroup === filter.sourceGroup) &&
          (!filter.mistakes || r.mistake) &&
          (!filter.bookmarks || r.bookmarked) &&
          (filter.review === 'all' || r.reviewed === (filter.review === 'reviewed'))
      )
      .slice(0, 20);
    const result = await service.listPage('alice', filter);
    assert.deepEqual(
      result.entries.map((r) => r.entryKey),
      expected.map((r) => r.entryKey)
    );
  }
});
