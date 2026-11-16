import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveExamSettings } from '../src/utils/studySettings.js';
import { examStartup } from '../src/utils/examStartup.js';
import {
  createExamSession,
  initialStudySession,
  questionFingerprint,
  finishExam,
  answerExamQuestion,
} from '../src/utils/studySession.js';
import { createHistoryAttempt, examHistorySource } from '../src/utils/examHistory.js';
const questions = Array.from({ length: 80 }, (_, id) => ({
  id: String(id),
  question: 'Pick ' + id,
  options: { A: 'One', B: 'Two' },
  answer: ['A'],
}));
const idFactory = () => '00000000-0000-4000-8000-000000000082';
const key = 'quiz-study-v1:alice:aws-aip-c01:exam';
const now = 1794700000000;
const source = examHistorySource({ kind: 'bank', id: 'aws-aip-c01' }, 'alice');
function configured() {
  const plan = resolveExamSettings({
    quizId: 'aws-aip-c01',
    questions,
    kind: 'cert',
    count: 75,
    minutes: 180,
  });
  return createExamSession(questions, 75, 180, {
    ...plan,
    sessionSettings: plan.settings,
    random: () => 0.4,
    now,
    idFactory,
    historyOwner: 'alice',
    captureHistory: true,
    historySource: source,
  });
}
test('saved v2 settings, shuffled options, flags, answers and absolute deadlines beat altered registry/URL choices', () => {
  const session = {
    ...configured(),
    freshToken: '2000',
    index: 3,
    flags: [2],
    answers: questions.slice(0, 75).map(() => ['A']),
  };
  const store = { getItem: () => JSON.stringify(session) };
  for (const params of [
    new URLSearchParams('count=no&time=0&format=invalid'),
    new URLSearchParams('fresh=1000&count=1&time=1'),
  ]) {
    assert.deepEqual(
      examStartup(store, key, questions, 'aws-aip-c01', params, '2030-01-01').restored,
      session
    );
    assert.deepEqual(
      initialStudySession(store, key, questions, 'exam', () => assert.fail('must not replace'), {
        fresh: params.get('fresh'),
        historyOwner: 'alice',
        captureHistory: true,
        historySource: source,
      }),
      { ...session, entryToken: undefined }
    );
  }
  assert.equal(configured().deadline, now + 180 * 60000);
  const expired = answerExamQuestion(session, ['B'], session.deadline + 1);
  assert.equal(expired.submitted, true);
  assert.deepEqual(expired.answers, session.answers);
  assert.equal(expired.endedAt, session.deadline);
  const older = { ...session };
  delete older.sessionSettings;
  delete older.feedbackMode;
  const legacy = examStartup(
    { getItem: () => JSON.stringify(older) },
    key,
    questions,
    'aws-aip-c01',
    new URLSearchParams('time=bad')
  );
  assert.equal(legacy.restored.feedbackMode, 'standard');
  assert.equal(legacy.restored.deadline, session.deadline);
});
test('new exact papers reject shortages/foreign pool data and legacy direct count/time URLs stay custom', () => {
  const startup = examStartup(
    { getItem: () => null },
    key,
    questions,
    'aws-aip-c01',
    new URLSearchParams('count=20&time=15')
  );
  assert.equal(startup.plan.settings.kind, 'custom');
  assert.equal(startup.plan.settings.minutes, 15);
  assert.throws(
    () =>
      examStartup(
        { getItem: () => null },
        key,
        questions,
        'aws-aip-c01',
        new URLSearchParams('count=20&time=0')
      ),
    { code: 'SESSION_INVALID' }
  );
  assert.throws(() => createExamSession(questions, 81, 180, { selectionQuestions: questions }), {
    code: 'SESSION_INSUFFICIENT',
  });
  assert.throws(
    () =>
      createExamSession(questions, 1, 60, {
        selectionQuestions: [{ ...questions[0], answer: ['B'] }],
      }),
    { code: 'SESSION_INVALID_POOL' }
  );
  const session = configured();
  assert.equal(session.signature, questionFingerprint(questions));
  assert.equal(new Set(session.questions.map((q) => q.id)).size, 75);
});
test('local certification metadata never changes immutable History v1 hashes, answers, grades or receipts', async () => {
  const session = finishExam(configured(), now + 10000, true);
  const before = await createHistoryAttempt(session, 'alice', questions);
  const plain = { ...session };
  delete plain.sessionSettings;
  const after = await createHistoryAttempt(plain, 'alice', questions);
  assert.deepEqual(before, after);
  assert.equal(JSON.stringify(before).includes('sessionSettings'), false);
});
