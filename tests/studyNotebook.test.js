import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createNotebookReference,
  notebookEntryKey,
  notebookQuestionFingerprint,
  notebookSourceGroup,
  notebookNote,
  emptyNotebookState,
  notebookAnswerChange,
  transitionNotebookState,
  validateNotebookState,
  validateNotebookEntry,
} from '../src/utils/studyNotebook.js';
import { reorderedMaps } from './fixtures/reorderedMaps.js';
import {
  questionParts,
  partOptions,
  isStructuredQuestion,
  shuffleQuestionOptions,
} from '../src/utils/questionModel.js';
import { MAX_NOTEBOOK_ENTRY_BYTES } from '../src/data/studyNotebookLimits.js';

const example = (name) =>
  JSON.parse(fs.readFileSync(new URL(`../public/examples/quiz-${name}.json`, import.meta.url)))[0];
const formats = [
  'single',
  'multiple',
  'yes-no',
  'dropdown-rows',
  'dropdown-inline',
  'drag-drop-rows',
  'drag-drop-inline',
];
const bank = (question) => ({ id: 'aws-aip-c01', kind: 'bank', questions: [question] });
const uuid = '11111111-1111-4111-8111-111111111111';
const privateQuiz = (question) => ({
  id: `cloud:slot-1:${uuid}`,
  slotId: 'slot-1',
  instanceId: uuid,
  contentVersion: 1,
  kind: 'cloud-custom',
  owner: 'alice',
  questions: [question],
});
const error = (code) => ({ code: `NOTEBOOK_${code}` });
const correct = (question) =>
  isStructuredQuestion(question)
    ? { ...question.answer }
    : question.answer.length === 1
      ? question.answer[0]
      : [...question.answer];

for (const format of formats) {
  test(`notebook fingerprint/source and complete-answer contract: ${format}`, async () => {
    const question = example(format);
    const ref = await createNotebookReference(bank(question), question, 'alice');
    assert.equal(ref.questionId, String(question.id));
    assert.equal(ref.fingerprint, await notebookQuestionFingerprint(reorderedMaps(question)));
    assert.equal(
      ref.fingerprint,
      await notebookQuestionFingerprint(shuffleQuestionOptions(question, () => 0.2))
    );
    assert.deepEqual(notebookAnswerChange(question, correct(question)), {
      kind: 'outcome',
      correct: true,
    });
    let incomplete, wrong;
    if (isStructuredQuestion(question)) {
      const first = questionParts(question)[0].id;
      incomplete = { [first]: question.answer[first] };
      wrong = {
        ...question.answer,
        [first]: Object.keys(partOptions(question, first)).find(
          (key) => key !== question.answer[first]
        ),
      };
    } else if (question.answer.length > 1) {
      incomplete = [question.answer[0]];
      wrong = [
        question.answer[0],
        Object.keys(question.options).find((key) => !question.answer.includes(key)),
      ];
    } else {
      incomplete = null;
      wrong = Object.keys(question.options).find((key) => key !== question.answer[0]);
    }
    assert.equal(notebookAnswerChange(question, incomplete), null);
    assert.deepEqual(notebookAnswerChange(question, wrong), { kind: 'outcome', correct: false });
    const modified = { ...question, question: question.question + ' changed' };
    assert.notEqual(
      await notebookEntryKey(ref),
      await notebookEntryKey(await createNotebookReference(bank(modified), modified, 'alice'))
    );
  });
}

test('references normalize aliases and include MC instructions but exclude explanation/private metadata', async () => {
  const question = example('single');
  const legacy = { ...bank(question), id: 'aws-ace' };
  const canonical = { ...legacy, id: 'gcp-ace' };
  assert.equal(
    await notebookEntryKey(await createNotebookReference(legacy, question, 'alice')),
    await notebookEntryKey(await createNotebookReference(canonical, question, 'alice'))
  );
  assert.notEqual(
    await notebookQuestionFingerprint(question),
    await notebookQuestionFingerprint({ ...question, instruction: 'Different constraint' })
  );
  const extra = {
    ...question,
    explanation: 'unverified included content',
    privateExtra: 'must-not-copy',
  };
  assert.equal(
    await notebookQuestionFingerprint(question),
    await notebookQuestionFingerprint(extra)
  );
  const ref = await createNotebookReference(bank(extra), extra, 'alice');
  assert.equal(JSON.stringify(ref).includes('must-not-copy'), false);
  assert.equal(JSON.stringify(ref).includes(question.question), false);
  await assert.rejects(
    createNotebookReference(bank(question), { ...question, question: 'forged content' }, 'alice'),
    error('SOURCE_CHANGED')
  );
  await assert.rejects(createNotebookReference(bank(question), question, null), error('AUTH'));
  assert.equal(notebookAnswerChange({ ...question, answer: [] }, 'A'), null);
});

test('private references protect owner, instance/content version and slot reuse', async () => {
  const q = example('drag-drop-rows');
  const quiz = privateQuiz(q);
  const ref = await createNotebookReference(quiz, q, 'alice');
  assert.equal(notebookSourceGroup(ref), `custom:${uuid}:v1`);
  const replaced = { ...quiz, contentVersion: 2 };
  assert.notEqual(
    await notebookEntryKey(ref),
    await notebookEntryKey(await createNotebookReference(replaced, q, 'alice'))
  );
  const occupant = {
    ...quiz,
    id: 'cloud:slot-1:22222222-2222-4222-8222-222222222222',
    instanceId: '22222222-2222-4222-8222-222222222222',
  };
  assert.notEqual(
    await notebookEntryKey(ref),
    await notebookEntryKey(await createNotebookReference(occupant, q, 'alice'))
  );
  await assert.rejects(createNotebookReference(quiz, q, 'bob'), error('SOURCE_UNAVAILABLE'));
  await assert.rejects(
    createNotebookReference(
      { ...quiz, instanceId: '22222222-2222-4222-8222-222222222222' },
      q,
      'alice'
    ),
    error('SOURCE_UNAVAILABLE')
  );
  await assert.rejects(
    createNotebookReference({ id: 'custom', kind: 'upload', questions: [q] }, q, 'alice'),
    error('SOURCE_UNAVAILABLE')
  );
});

test('correct review retains mistake, note and bookmark; later wrong reopens without erasing review history', () => {
  let state = transitionNotebookState(null, { kind: 'bookmark', value: true }, 1);
  state = transitionNotebookState(
    state,
    { kind: 'note', value: '  ghi chú 🌱\n<script>text only</script>' },
    2
  );
  state = transitionNotebookState(state, { kind: 'outcome', correct: false }, 3);
  const before = structuredClone(state);
  state = transitionNotebookState(state, { kind: 'outcome', correct: true }, 4);
  assert.equal(state.mistake, true);
  assert.equal(state.reviewed, true);
  assert.equal(state.note, before.note);
  assert.equal(state.bookmarked, true);
  assert.equal(before.reviewed, false);
  state = transitionNotebookState(state, { kind: 'outcome', correct: false }, 5);
  assert.equal(state.reviewed, false);
  assert.equal(state.lastReviewedAt, 4);
  assert.equal(state.lastWrongAt, 5);
  state = transitionNotebookState(state, { kind: 'bookmark', value: false }, 6);
  assert.equal(state.note, before.note);
  assert.equal(state.mistake, true);
  assert.equal(transitionNotebookState(state, { kind: 'remove' }, 7), null);
  assert.equal(transitionNotebookState(null, { kind: 'outcome', correct: true }, 1), null);
  assert.equal(transitionNotebookState(null, { kind: 'note', value: '' }, 1), null);
  assert.deepEqual(emptyNotebookState(), emptyNotebookState());
  assert.throws(
    () => transitionNotebookState(state, { kind: 'outcome', correct: false, note: 'overwrite' }),
    error('INVALID')
  );
  assert.throws(
    () => validateNotebookState({ ...state, mistake: false, reviewed: true }),
    error('INVALID')
  );
});

test('note limits count Unicode code points and bytes without truncation or malformed surrogate normalization', () => {
  assert.equal(notebookNote('🌱'.repeat(2000)), '🌱'.repeat(2000));
  assert.throws(() => notebookNote('🌱'.repeat(2001)), error('SIZE'));
  assert.throws(() => notebookNote('a'.repeat(2001)), error('SIZE'));
  assert.throws(() => notebookNote('\ud800'), error('INVALID'));
  assert.throws(() => notebookNote({ text: 'not a string' }), error('INVALID'));
});

test('normalized wire entries verify source/key integrity, exact envelopes and total byte bounds', async () => {
  const q = example('single');
  const ref = await createNotebookReference(bank(q), q, 'alice');
  const entry = {
    schemaVersion: 1,
    entryKey: await notebookEntryKey(ref),
    ref,
    sourceGroup: notebookSourceGroup(ref),
    ...transitionNotebookState(null, { kind: 'note', value: 'hello' }, 1),
    revision: 1,
    lastOperationId: uuid,
    lastOperationFingerprint: 'a'.repeat(64),
    createdAt: 1,
    updatedAt: 1,
  };
  assert.deepEqual(await validateNotebookEntry(entry), entry);
  for (const patch of [
    { extra: 'unexpected' },
    { entryKey: 'b'.repeat(64) },
    { sourceGroup: 'bank:other' },
    { revision: 0 },
    { lastOperationId: 'bad' },
    { updatedAt: 0 },
  ])
    await assert.rejects(validateNotebookEntry({ ...entry, ...patch }), error('INVALID'));
  const longQuestion = { ...q, id: 'q'.repeat(MAX_NOTEBOOK_ENTRY_BYTES) };
  await assert.rejects(
    createNotebookReference(bank(longQuestion), longQuestion, 'alice'),
    error('SIZE')
  );
});
