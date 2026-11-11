import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createExamSession,
  finishExam,
  initialStudySession,
  questionFingerprint,
  readStudySession,
  sessionKey,
} from '../src/utils/studySession.js';
import { createHistoryAttempt } from '../src/utils/examHistory.js';
import { emptyAnswer, isStructuredQuestion } from '../src/utils/questionModel.js';
import { reorderedMaps } from './fixtures/reorderedMaps.js';

const formats = [
  'single',
  'multiple',
  'yes-no',
  'dropdown-rows',
  'dropdown-inline',
  'drag-drop-rows',
  'drag-drop-inline',
];
const questions = formats.flatMap((name) =>
  JSON.parse(fs.readFileSync(new URL(`../public/examples/quiz-${name}.json`, import.meta.url))).map(
    (question) => ({ ...question, id: `${name}-${question.id}` })
  )
);
// Captured from the released raw-JSON fingerprint before the v2 correction.
const legacySignature = '1xq5ku6:7';
const instanceId = '11111111-1111-4111-8111-111111111111';
const cloudId = `cloud:slot-1:${instanceId}:v1`;
const source = {
  kind: 'custom',
  id: instanceId,
  instanceId,
  slotId: 'slot-1',
  contentVersion: 1,
  title: 'Synthetic serialization quiz',
};
const storeFor = (key, value) => ({
  getItem: (asked) => (asked === key ? JSON.stringify(value) : null),
});
const legacyExam = () => ({
  ...createExamSession(questions, 3, 60, {
    now: 1000,
    random: () => 0.37,
    historyOwner: 'alice',
    historySource: source,
    captureHistory: true,
  }),
  signature: legacySignature,
  freshToken: '1000',
  index: 1,
  flags: [1],
});

test('v2 fingerprints ignore nested map order across all seven formats, preserving arrays and content', () => {
  const signature = questionFingerprint(questions);
  assert.match(signature, /^v2:/);
  assert.equal(questionFingerprint(reorderedMaps(questions)), signature);
  assert.notEqual(questionFingerprint([...questions].reverse()), signature);
  const changed = structuredClone(questions);
  changed[3].slots.reverse();
  assert.notEqual(questionFingerprint(changed), signature);
  changed[0].options.A += ' changed';
  assert.notEqual(questionFingerprint(changed), signature);
});

test('unchanged legacy bank drafts migrate only signature metadata; mismatching banks fail closed', () => {
  const key = sessionKey('alice', 'bank', 'exam');
  const saved = legacyExam();
  const restored = readStudySession(storeFor(key, saved), key, questions, 'exam');
  assert.deepEqual(restored, { ...saved, signature: questionFingerprint(questions) });
  assert.equal(readStudySession(storeFor(key, saved), key, reorderedMaps(questions), 'exam'), null);
});

test('legacy versioned cloud exam migration preserves exact answers, shuffle, flags, deadline and attempt', async () => {
  const key = sessionKey('alice', cloudId, 'exam');
  const saved = legacyExam();
  saved.answers = saved.questions.map((question) =>
    !isStructuredQuestion(question) && question.answer.length === 1
      ? question.answer[0]
      : structuredClone(question.answer)
  );
  const current = reorderedMaps(questions);
  const restored = initialStudySession(
    storeFor(key, saved),
    key,
    current,
    'exam',
    () => {
      throw new Error('Must not restart or reshuffle the saved exam');
    },
    { fresh: '1000', historyOwner: 'alice', historySource: source, captureHistory: true }
  );
  assert.deepEqual(restored.questions, saved.questions);
  assert.deepEqual(restored.answers, saved.answers);
  for (const field of [
    'index',
    'flags',
    'deadline',
    'attemptId',
    'startedAt',
    'freshToken',
    'feedbackMode',
  ])
    assert.deepEqual(restored[field], saved[field]);
  assert.equal(restored.signature, questionFingerprint(current));
  const preHistory = { ...saved };
  delete preHistory.historyOwner;
  delete preHistory.historySource;
  delete preHistory.captureHistory;
  assert.deepEqual(readStudySession(storeFor(key, preHistory), key, current, 'exam'), {
    ...preHistory,
    signature: questionFingerprint(current),
  });
  const archive = await createHistoryAttempt(finishExam(restored, 2000, true), 'alice', current);
  assert.equal(archive.summary.questionCount, 3);
  assert.equal(archive.summary.correct, 3);
  assert.equal(archive.summary.attemptId, saved.attemptId);
});

test('legacy cloud Practice uses the same immutable versioned identity without inventing history metadata', () => {
  const key = sessionKey('alice', cloudId, 'practice');
  const saved = { signature: legacySignature, index: 2, answers: questions.map(emptyAnswer) };
  const restored = readStudySession(
    storeFor(key, saved),
    key,
    reorderedMaps(questions),
    'practice'
  );
  assert.deepEqual(restored, { ...saved, signature: questionFingerprint(questions) });
});

test('canonical cloud drafts still invalidate real array/content edits and other account/version keys', () => {
  const key = sessionKey('alice', cloudId, 'exam');
  const saved = { ...legacyExam(), signature: questionFingerprint(questions) };
  const store = storeFor(key, saved);
  assert.equal(readStudySession(store, key, [...questions].reverse(), 'exam'), null);
  assert.equal(
    readStudySession(store, sessionKey('bob', cloudId, 'exam'), questions, 'exam'),
    null
  );
  assert.equal(
    readStudySession(
      store,
      sessionKey('alice', cloudId.replace(':v1', ':v2'), 'exam'),
      questions,
      'exam'
    ),
    null
  );
  const changed = questions.map((question, index) =>
    index === 0 ? { ...question, question: 'Changed source text' } : question
  );
  assert.equal(readStudySession(store, key, changed, 'exam'), null);
});

test('legacy cloud recovery rejects changed selected content, forged source metadata and unknown signature versions', () => {
  const key = sessionKey('alice', cloudId, 'exam');
  const saved = legacyExam();
  const changed = reorderedMaps(questions).map((question) =>
    question.id === saved.questions[0].id ? { ...question, question: 'Changed content' } : question
  );
  assert.equal(readStudySession(storeFor(key, saved), key, changed, 'exam'), null);
  for (const patch of [
    { historyOwner: 'bob' },
    { historySource: { ...source, contentVersion: 2 } },
    { historySource: { ...source, slotId: 'slot-2' } },
    { historySource: { ...source, instanceId: '22222222-2222-4222-8222-222222222222' } },
    { signature: 'v3:unknown:7' },
  ])
    assert.equal(
      readStudySession(
        storeFor(key, { ...saved, ...patch }),
        key,
        reorderedMaps(questions),
        'exam'
      ),
      null
    );
});
