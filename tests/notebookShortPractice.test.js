import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotebookReference, notebookEntryKey } from '../src/utils/studyNotebook.js';
import { notebookSelection } from '../src/utils/studyNotebookSelection.js';
import {
  createNotebookSourceResolver,
  resolveNotebookSelection,
} from '../src/services/studyNotebookSources.js';
import { createQuickPracticeStorage } from '../src/services/quickPracticeStorage.js';
import { notebookCaptureEvent } from '../src/utils/studyNotebookCapture.js';
const uid = 'alice';
const banks = ['aws-aip-c01', 'gcp-ace'].map((id) => ({
  kind: 'bank',
  id,
  questions: Array.from({ length: 6 }, (_, index) => ({
    id: 'shared-' + index,
    question: id + ' question ' + index,
    options: { A: 'Correct', B: 'Wrong' },
    answer: ['A'],
  })),
}));
async function entry(quiz, q) {
  const ref = await createNotebookReference({ ...quiz, questions: [q] }, q, uid);
  return { entryKey: await notebookEntryKey(ref), ref, note: 'Private note kept' };
}
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}
async function setup() {
  const entries = [];
  for (const bank of banks) for (const q of bank.questions) entries.push(await entry(bank, q));
  const selection = await notebookSelection(entries);
  return { entries, selection };
}
test('accepted Notebook resolver and subset manifests preserve each original ID/source/capture reference across reload', async () => {
  const { entries, selection } = await setup(),
    tab = storage();
  const pool = await resolveNotebookSelection(
    uid,
    selection.manifest,
    createNotebookSourceResolver({
      loadBank: async (bank) => banks.find((b) => b.id === bank.id).questions,
      loadPrivate: () => assert.fail('no private IO'),
    })
  );
  const options = {
    uid,
    sourceId: selection.sessionId,
    questions: pool.questions,
    identities: pool.current.map((x) => x.entryKey),
    size: 10,
  };
  const run = createQuickPracticeStorage({ storage: () => tab, random: () => 0.4 }).resolve(
    options
  );
  assert.equal(run.questions.length, 10);
  assert.equal(new Set(run.manifest.keys).size, 10);
  assert.ok(new Set(run.questions.map((q) => q.id)).size < 10);
  for (const [i, index] of run.indices.entries()) {
    const event = await notebookCaptureEvent(pool.sources[index], run.questions[i], 'B', uid);
    assert.equal(await notebookEntryKey(event.ref), run.manifest.keys[i]);
    assert.equal(event.ref.questionId, run.questions[i].id);
  }
  assert.deepEqual(
    createQuickPracticeStorage({
      storage: () => tab,
      random: () => assert.fail('must not resample'),
    }).resolve(options).manifest,
    run.manifest
  );
  assert.equal(JSON.stringify(run.manifest).includes('Private note'), false);
  assert.equal(
    entries.every((e) => e.note === 'Private note kept'),
    true
  );
});
test('changed/missing/unauthorized selections never enter a short pool, and zero/insufficient pools cannot be shortened', async () => {
  const { entries } = await setup();
  const missing = await entry(banks[0], { ...banks[0].questions[0], id: 'removed' });
  const changed = await entry(banks[0], { ...banks[0].questions[1], question: 'Old version' });
  const privateQuiz = {
    kind: 'cloud-custom',
    owner: uid,
    slotId: 'slot-1',
    instanceId: '60000000-0000-4000-8000-000000000001',
    contentVersion: 1,
    id: 'cloud:slot-1:60000000-0000-4000-8000-000000000001',
    questions: [banks[0].questions[0]],
  };
  const denied = await entry(privateQuiz, privateQuiz.questions[0]);
  const selection = await notebookSelection([...entries, missing, changed, denied]);
  const pool = await resolveNotebookSelection(
    uid,
    selection.manifest,
    createNotebookSourceResolver({
      loadBank: async (bank) => banks.find((b) => b.id === bank.id).questions,
      loadPrivate: async () => ({ ...privateQuiz, owner: 'bob' }),
    })
  );
  assert.deepEqual(
    new Set(pool.excluded.map((e) => e.state)),
    new Set(['missing', 'changed', 'unavailable'])
  );
  assert.equal(pool.current.length, 12);
  const service = createQuickPracticeStorage({ storage: () => storage() });
  const options = {
    uid,
    sourceId: selection.sessionId,
    questions: pool.questions,
    identities: pool.current.map((e) => e.entryKey),
  };
  assert.throws(() => service.resolve({ ...options, size: 20 }), { code: 'SESSION_INSUFFICIENT' });
  assert.equal(service.resolve({ ...options, size: 10 }).questions.length, 10);
  assert.throws(() => service.resolve({ ...options, questions: [], identities: [], size: 10 }), {
    code: 'SESSION_INSUFFICIENT',
  });
});
