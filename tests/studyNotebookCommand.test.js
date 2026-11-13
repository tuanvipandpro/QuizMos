import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNotebookCommand,
  validateNotebookCommand,
  normalizeNotebookError,
} from '../src/utils/studyNotebookCommand.js';
import { createNotebookReference, validateNotebookReference } from '../src/utils/studyNotebook.js';

const q = {
  id: 'command-fixture',
  question: 'Choose A',
  options: { A: 'Yes', B: 'No' },
  answer: ['A'],
};
const base = async () => ({
  owner: 'alice',
  ref: await createNotebookReference({ id: 'gcp-ace', kind: 'bank', questions: [q] }, q, 'alice'),
  expectedRevision: 0,
  expectedGeneration: 0,
  change: { kind: 'note', value: 'private input' },
});

test('commands bind owner, generation, revision, content and operation body; retry cannot silently rebase them', async () => {
  const cmd = await createNotebookCommand(await base());
  assert.equal(Object.isFrozen(cmd), true);
  assert.equal(Object.isFrozen(cmd.ref), true);
  assert.equal(Object.isFrozen(cmd.change), true);
  assert.equal(
    (await validateNotebookCommand(JSON.parse(JSON.stringify(cmd)), 'alice')) instanceof Object,
    true
  );
  await assert.rejects(validateNotebookCommand(cmd, 'bob'), { code: 'NOTEBOOK_AUTH' });
  for (const patch of [
    { expectedRevision: 1 },
    { expectedGeneration: 1 },
    { expectedRevision: -1 },
    { operationId: 'bad' },
    { change: { kind: 'note', value: 'changed input' } },
    { fingerprint: 'a'.repeat(64) },
    { extra: 'unexpected' },
    { ref: { ...cmd.ref, questionId: 'other' } },
  ])
    await assert.rejects(validateNotebookCommand({ ...cmd, ...patch }, 'alice'), {
      code: 'NOTEBOOK_INVALID',
    });
  const copy = { ...(await base()), ref: cmd.ref, operationId: cmd.operationId };
  assert.deepEqual(await createNotebookCommand(copy), cmd);
  for (const patch of [{ expectedGeneration: 1 }, { change: { kind: 'bookmark', value: true } }])
    assert.notEqual(
      (await createNotebookCommand({ ...copy, ...patch })).fingerprint,
      cmd.fingerprint
    );
});

test('unknown historical bank references remain readable while new actions require a current known source', async () => {
  const { ref } = await base();
  assert.equal(
    validateNotebookReference({ ...ref, quizId: 'retired-bank' }).quizId,
    'retired-bank'
  );
  await assert.rejects(
    createNotebookReference({ kind: 'bank', id: 'retired-bank', questions: [q] }, q, 'alice'),
    { code: 'NOTEBOOK_SOURCE_UNAVAILABLE' }
  );
});

test('IO failures expose bounded status codes without leaking server messages or note content', () => {
  for (const [code, expected] of [
    ['permission-denied', 'DENIED'],
    ['unauthenticated', 'DENIED'],
    ['unavailable', 'NETWORK'],
    ['firestore/aborted', 'NETWORK'],
    ['unknown', 'INVALID'],
  ]) {
    const normalized = normalizeNotebookError({ code, message: 'private raw server detail' });
    assert.equal(normalized.code, `NOTEBOOK_${expected}`);
    assert.equal(normalized.message.includes('private'), false);
  }
});
