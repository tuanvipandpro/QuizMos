import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotebookReference, notebookEntryKey } from '../src/utils/studyNotebook.js';
import { notebookSelection } from '../src/utils/studyNotebookSelection.js';
import { createNotebookSelectionStorage } from '../src/services/studyNotebookSelectionStorage.js';
import {
  createNotebookSourceResolver,
  resolveNotebookSelection,
} from '../src/services/studyNotebookSources.js';
import { questionFingerprint, initialStudySession, sessionKey } from '../src/utils/studySession.js';

const q = { id: 'shared-q1', question: 'Choose A', options: { A: 'Yes', B: 'No' }, answer: ['A'] };
const bank = (id = 'gcp-ace', questions = [q]) => ({ kind: 'bank', id, questions });
const uuid = '60000000-0000-4000-8000-000000000001';
const custom = (patch = {}) => ({
  kind: 'cloud-custom',
  owner: 'alice',
  slotId: 'slot-1',
  instanceId: uuid,
  contentVersion: 1,
  id: `cloud:slot-1:${uuid}`,
  questions: [q],
  ...patch,
});
async function entry(quiz, question = q) {
  const ref = await createNotebookReference(quiz, question, 'alice');
  return { entryKey: await notebookEntryKey(ref), ref };
}
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('selection manifests contain only canonical references; order is stable and account tab recovery cannot cross owners', async () => {
  const a = { ...(await entry(bank())), note: 'private note', questions: [q] },
    b = await entry(custom());
  const first = await notebookSelection([a, b]),
    second = await notebookSelection([b, a]);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify(first).includes('private note'), false);
  assert.equal(JSON.stringify(first).includes(q.question), false);
  assert.equal(first.sessionId.startsWith('notebook:'), true);
  await assert.rejects(notebookSelection([a, a]), { code: 'NOTEBOOK_INVALID' });
  await assert.rejects(notebookSelection([{ ...a, entryKey: 'a'.repeat(64) }]), {
    code: 'NOTEBOOK_INVALID',
  });
  const tab = storage(),
    repository = createNotebookSelectionStorage(() => tab);
  await repository.save('alice', [a, b]);
  assert.deepEqual(await repository.read('alice', first.id), first);
  await assert.rejects(repository.read('bob', first.id), { code: 'NOTEBOOK_MISSING' });
  tab.setItem('quiz-notebook-selection-v1:alice:' + first.id, JSON.stringify([a]));
  await assert.rejects(repository.read('alice', first.id), { code: 'NOTEBOOK_INVALID' });
  await assert.rejects(
    createNotebookSelectionStorage(() => {
      throw new Error('Denied');
    }).save('alice', [a]),
    { code: 'NOTEBOOK_STORAGE' }
  );
});

test('current mixed-source selections preserve original IDs, share per-bank IO and isolate revision/full-bank drafts', async () => {
  const entries = [await entry(bank()), await entry(bank('aws-aip-c01')), await entry(custom())];
  const calls = [];
  const resolve = createNotebookSourceResolver({
    loadBank: async (bank) => {
      calls.push(bank.id);
      return [q];
    },
    loadPrivate: async (uid, slot) => {
      calls.push(uid + slot);
      return custom();
    },
  });
  const selected = await notebookSelection(entries),
    pool = await resolveNotebookSelection('alice', selected.manifest, resolve);
  assert.equal(pool.current.length, 3);
  assert.deepEqual(
    pool.questions.map((item) => item.id),
    ['shared-q1', 'shared-q1', 'shared-q1']
  );
  assert.deepEqual(
    new Set(pool.sources.map((item) => item.id)),
    new Set(entries.map((item) => item.ref.quizId))
  );
  assert.deepEqual(pool.excluded, []);
  await resolveNotebookSelection('alice', selected.manifest, resolve);
  assert.equal(calls.length, 3);
  const tab = storage(),
    fullKey = sessionKey('alice', 'gcp-ace', 'practice');
  const full = { signature: questionFingerprint([q]), answers: ['A'], index: 0 };
  tab.setItem(fullKey, JSON.stringify(full));
  const key = sessionKey('alice', selected.sessionId, 'practice');
  assert.notEqual(key, fullKey);
  const revision = initialStudySession(tab, key, pool.questions, 'practice', () => ({
    signature: questionFingerprint(pool.questions),
    answers: pool.questions.map(() => null),
    index: 0,
  }));
  assert.deepEqual(revision.answers, [null, null, null]);
  tab.setItem(key, JSON.stringify({ ...revision, answers: ['B', null, null] }));
  assert.deepEqual(JSON.parse(tab.getItem(fullKey)), full);
  assert.deepEqual(initialStudySession(tab, key, pool.questions, 'practice', () => null).answers, [
    'B',
    null,
    null,
  ]);
});

test('changed, missing, replaced, invalid and unauthorized sources are excluded without substituting a quiz or dropping a note', async () => {
  const publicEntry = { ...(await entry(bank())), note: 'Keep this note' },
    privateEntry = await entry(custom());
  for (const [quiz, expected] of [
    [null, 'missing'],
    [custom({ instanceId: '60000000-0000-4000-8000-000000000002' }), 'replaced'],
    [custom({ contentVersion: 2 }), 'changed'],
    [custom({ owner: 'bob' }), 'unavailable'],
    [custom({ invalid: true }), 'changed'],
  ]) {
    const resolve = createNotebookSourceResolver({
      loadBank: async () => [q],
      loadPrivate: async () => quiz,
    });
    const result = await resolveNotebookSelection('alice', [privateEntry, publicEntry], resolve);
    assert.equal(result.current.length, 1);
    assert.equal(result.current[0].ref.quizId, 'gcp-ace');
    assert.equal(result.excluded[0].state, expected);
    assert.equal(publicEntry.note, 'Keep this note');
  }
  const changed = createNotebookSourceResolver({
    loadBank: async () => [{ ...q, question: 'Changed wording' }],
    loadPrivate: async () => null,
  });
  const result = await resolveNotebookSelection('alice', [publicEntry, privateEntry], changed);
  assert.equal(result.current.length, 0);
  assert.deepEqual(result.questions, []);
  assert.deepEqual(
    result.excluded.map((item) => item.state),
    ['changed', 'missing']
  );
  const denied = createNotebookSourceResolver({
    loadBank: async () => {
      throw new Error('Denied');
    },
    loadPrivate: async () => null,
  });
  assert.equal((await denied('alice', publicEntry.ref)).state, 'unavailable');
  const missing = createNotebookSourceResolver({
    loadBank: async () => [],
    loadPrivate: async () => null,
  });
  // Invalid or empty bank contents do not reach Study.
  assert.equal((await missing('alice', publicEntry.ref)).state, 'unavailable');
});
