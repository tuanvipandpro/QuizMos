import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createExamSession,
  examEligibleQuestions,
  examStats,
  finishExam,
  initialStudySession,
  questionFingerprint,
  readStudySession,
  sessionKey,
  clearStudySessions,
} from '../src/utils/studySession.js';
import { emptyAnswer } from '../src/utils/questionModel.js';
import { PCA_PRACTICE_REVIEW } from '../src/data/pcaPracticeReview.js';
import { createHistoryAttempt, examHistorySource } from '../src/utils/examHistory.js';
import { projectQuizPdf, quizPdfAccess } from '../src/utils/quizPdf.js';

const questions = [
  { id: 'one', question: 'Pick one', options: { A: 'First', B: 'Second' }, answer: ['A'] },
  {
    id: 'two',
    question: 'Pick two',
    options: { A: 'First', B: 'Second', C: 'Third' },
    answer: ['A', 'C'],
  },
  {
    id: 'three',
    type: 'yes_no',
    question: 'Decide',
    statements: [
      { id: 's1', text: 'First statement' },
      { id: 's2', text: 'Second statement' },
    ],
    options: { Y: 'Yes', N: 'No' },
    answer: { s1: 'Y', s2: 'N' },
  },
];
const storage = () => {
  const values = {};
  Object.defineProperties(values, {
    getItem: { value: (key) => values[key] ?? null },
    setItem: {
      value: (key, value) => {
        values[key] = value;
      },
    },
    removeItem: {
      value: (key) => {
        delete values[key];
      },
    },
  });
  return values;
};

test('known additive PCA and GAL updates preserve compatible account-scoped drafts', () => {
  for (const [id, file, oldCount] of [
    ['gcp-pca', 'PCA', 279],
    ['gcp-gal', 'GAL', 56],
  ]) {
    const bank = JSON.parse(
      readFileSync(new URL(`../public/quiz/Google/GCP-${file}.json`, import.meta.url))
    )
      .slice(0, oldCount)
      .map((question) =>
        id === 'gcp-pca' ? PCA_PRACTICE_REVIEW.originals[question.id] || question : question
      )
      .map(({ retired: _retired, ...question }) => question);
    const updated = [{ ...bank[0], retired: true }, ...bank.slice(1), questions[0]];
    const store = storage();
    const key = sessionKey('alice', id, 'practice');
    const draft = {
      signature: questionFingerprint(bank),
      index: 0,
      answers: bank.map(emptyAnswer),
    };
    draft.answers[0] = ['A'];
    store.setItem(key, JSON.stringify(draft));
    const migrated = readStudySession(store, key, updated, 'practice');
    assert.deepEqual(migrated.answers[0], ['A']);
    assert.deepEqual(migrated.answers.at(-1), emptyAnswer(questions[0]));
    assert.equal(migrated.index, 0);
    assert.equal(
      readStudySession(store, sessionKey('bob', id, 'practice'), updated, 'practice'),
      null
    );
    store.setItem(key, JSON.stringify(migrated));
    assert.deepEqual(readStudySession(store, key, updated, 'practice'), migrated);

    const examKey = sessionKey('alice', id, 'exam');
    const exam = createExamSession(bank, 1, 60, { idFactory: () => 'attempt', random: () => 0.99 });
    store.setItem(examKey, JSON.stringify(exam));
    const restored = readStudySession(store, examKey, updated, 'exam');
    assert.deepEqual(restored.questions, exam.questions);
    assert.deepEqual(restored.answers, exam.answers);
    assert.equal(restored.deadline, exam.deadline);
    assert.equal(restored.signature, questionFingerprint(updated));
    const changed = [{ ...updated[0], question: 'Changed content' }, ...updated.slice(1)];
    assert.equal(readStudySession(store, examKey, changed, 'exam'), null);
    store.setItem(
      examKey,
      JSON.stringify({ ...exam, questions: [{ ...exam.questions[0], answer: ['invalid'] }] })
    );
    assert.equal(readStudySession(store, examKey, updated, 'exam'), null);
    store.setItem(key, JSON.stringify({ ...draft, answers: [] }));
    assert.equal(readStudySession(store, key, updated, 'practice'), null);
    store.setItem(key, JSON.stringify({ ...draft, index: bank.length }));
    assert.equal(readStudySession(store, key, updated, 'practice'), null);
    let hash = 2166136261;
    const raw = JSON.stringify(bank);
    for (let i = 0; i < raw.length; i++) hash = Math.imul(hash ^ raw.charCodeAt(i), 16777619);
    store.setItem(
      key,
      JSON.stringify({ ...draft, signature: `${(hash >>> 0).toString(36)}:${bank.length}` })
    );
    assert.equal(readStudySession(store, key, updated, 'practice').answers.length, bank.length + 1);
  }
});

const pcaAfterReview = JSON.parse(
  readFileSync(new URL('../public/quiz/Google/GCP-PCA.json', import.meta.url))
);
const pcaBeforeReview = pcaAfterReview.map(
  (question) => PCA_PRACTICE_REVIEW.originals[question.id] || question
);
const pcaBeforeExpansion = pcaBeforeReview
  .slice(0, 279)
  .map(({ retired: _retired, ...question }) => question);

test('PCA corrections appear in Practice and PDF and reset only the altered responses', () => {
  const revised = pcaAfterReview.filter((question) =>
    Object.hasOwn(PCA_PRACTICE_REVIEW.originals, question.id)
  );
  assert.deepEqual(
    revised.map((question) => question.id),
    ['55', '102']
  );
  assert.ok(revised.every((question) => question.retired && question.explanation));
  assert.ok(examEligibleQuestions(pcaAfterReview).every((question) => !revised.includes(question)));
  const quiz = { kind: 'bank', id: 'gcp-pca', questions: revised };
  const pdf = projectQuizPdf(quiz, null, quizPdfAccess(quiz, null));
  assert.match(pdf.questions[0].answers[0], /Import the externally generated key material/);
  assert.match(pdf.questions[1].answers[0], /metric\.labels\.state = "used"/);
  const key = sessionKey('alice', 'gcp-pca', 'practice');
  for (const oldBank of [pcaBeforeExpansion, pcaBeforeReview]) {
    const answers = oldBank.map((question) => question.answer);
    const index = oldBank.findIndex((question) => question.id === '55');
    const store = storage();
    store.setItem(key, JSON.stringify({ index, answers, signature: questionFingerprint(oldBank) }));
    const draft = readStudySession(store, key, pcaAfterReview, 'practice');
    assert.equal(draft.index, index);
    assert.equal(draft.answers.length, pcaAfterReview.length);
    pcaAfterReview.forEach((question, i) => {
      assert.deepEqual(
        draft.answers[i],
        i >= oldBank.length || revised.includes(question) ? emptyAnswer(question) : answers[i]
      );
    });
  }
});

test('PCA archive retries keep the same historical questions, flags and frozen envelope across the correction', async () => {
  assert.equal(questionFingerprint(pcaAfterReview), PCA_PRACTICE_REVIEW.correctedSignature);
  assert.equal(questionFingerprint(pcaBeforeReview), PCA_PRACTICE_REVIEW.signature);
  const uid = 'alice';
  const key = sessionKey(uid, 'gcp-pca', 'exam');
  for (const oldBank of [pcaBeforeExpansion, pcaBeforeReview]) {
    const plan = createExamSession(oldBank, 2, 60, {
      now: 1000,
      random: () => 0.99,
      selectionQuestions:
        oldBank === pcaBeforeExpansion
          ? oldBank.filter((question) => ['55', '102'].includes(question.id))
          : null,
      historyOwner: uid,
      historySource: examHistorySource({ kind: 'bank', id: 'gcp-pca' }, uid),
      captureHistory: true,
    });
    plan.answers = plan.questions.map((question) => question.answer);
    plan.flags = [1];
    plan.index = 1;
    const store = storage();
    store.setItem(key, JSON.stringify(plan));
    const resumed = readStudySession(store, key, pcaAfterReview, 'exam');
    assert.deepEqual(resumed.questions, plan.questions);
    assert.deepEqual(resumed.answers, plan.answers);
    assert.deepEqual(resumed.flags, [1]);
    assert.equal(resumed.index, 1);
    assert.equal(resumed.deadline, plan.deadline);
    assert.equal(resumed.attemptId, plan.attemptId);
    const original = await createHistoryAttempt(finishExam(plan, 2000, true), uid, oldBank);
    const replacement = await createHistoryAttempt(
      finishExam(resumed, 2000, true),
      uid,
      pcaAfterReview
    );
    assert.deepEqual(replacement, original);
    const unrelatedEdit = [
      { ...pcaAfterReview[0], question: 'Unsupported edit' },
      ...pcaAfterReview.slice(1),
    ];
    assert.equal(readStudySession(store, key, unrelatedEdit, 'exam'), null);
  }
});

test('new exams exclude retired questions without changing practice or compatible drafts', () => {
  const bank = [questions[0], { ...questions[1], retired: true }, questions[2]];
  assert.deepEqual(
    examEligibleQuestions(bank).map((q) => q.id),
    ['one', 'three']
  );
  for (const random of [() => 0, () => 0.99]) {
    const exam = createExamSession(bank, 50, 60, { random, idFactory: () => 'attempt' });
    assert.equal(exam.questions.length, 2);
    assert.ok(exam.questions.every((q) => q.retired !== true));
    assert.equal(exam.signature, questionFingerprint(bank));
  }
  assert.equal(bank.length, 3);
  assert.throws(() => createExamSession([{ ...questions[0], retired: true }], 1, 60), /eligible/);
  assert.throws(() => createExamSession(bank, 1, 60, { selectionQuestions: [bank[1]] }), {
    code: 'SESSION_INVALID_POOL',
  });
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const draft = createExamSession(bank, 2, 60, { idFactory: () => 'attempt' });
  draft.questions = [bank[1]];
  draft.answers = [['A', 'C']];
  store.setItem(key, JSON.stringify(draft));
  assert.deepEqual(readStudySession(store, key, bank, 'exam'), draft);
});

test('Google ACE restores a legacy practice draft within the same account and preserves existing canonical answers', () => {
  const store = storage();
  const legacyKey = 'quiz-study-v1:alice:aws-ace:practice';
  const key = sessionKey('alice', 'gcp-ace', 'practice');
  const draft = {
    signature: questionFingerprint(questions),
    index: 1,
    answers: ['A', ['A', 'C'], {}],
  };
  store.setItem(legacyKey, JSON.stringify(draft));
  assert.equal(sessionKey('alice', 'aws-ace', 'practice'), key);
  assert.deepEqual(readStudySession(store, key, questions, 'practice'), draft);
  assert.equal(
    readStudySession(store, sessionKey('bob', 'gcp-ace', 'practice'), questions, 'practice'),
    null
  );
  assert.equal(
    readStudySession(store, sessionKey(null, 'gcp-ace', 'practice'), questions, 'practice'),
    null
  );
  const canonical = { ...draft, index: 2 };
  store.setItem(key, JSON.stringify(canonical));
  assert.deepEqual(readStudySession(store, key, questions, 'practice'), canonical);
  assert.equal(
    readStudySession(store, key, [...questions, { ...questions[0], id: 'new' }], 'practice'),
    null
  );
  clearStudySessions(store, 'alice');
  assert.equal(store.getItem(legacyKey), null);
  assert.equal(store.getItem(key), null);
});

test('aliased exam links keep the newest draft, exact shuffle, answers, flags and deadline', () => {
  const store = storage();
  const legacyKey = 'quiz-study-v1:alice:aws-ace:exam';
  const key = sessionKey('alice', 'gcp-ace', 'exam');
  const legacy = {
    ...createExamSession(questions, 3, 60, { now: 2000, random: () => 0.25 }),
    freshToken: '2000',
    index: 1,
    flags: [1],
  };
  legacy.answers[0] = ['A'];
  store.setItem(legacyKey, JSON.stringify(legacy));
  store.setItem(
    key,
    JSON.stringify({ ...createExamSession(questions, 2, 60, { now: 1000 }), freshToken: '1000' })
  );
  const neverCreate = () => {
    throw new Error('Must not restart the timer or reshuffle');
  };
  const restored = initialStudySession(store, key, questions, 'exam', neverCreate, {
    fresh: '2000',
  });
  assert.deepEqual(restored.questions, legacy.questions);
  assert.deepEqual(restored.answers, legacy.answers);
  assert.deepEqual(restored.flags, legacy.flags);
  assert.equal(restored.deadline, legacy.deadline);
  const canonical = { ...legacy, freshToken: '3000', deadline: 3603000 };
  store.setItem(key, JSON.stringify(canonical));
  assert.equal(
    initialStudySession(store, key, questions, 'exam', neverCreate, { fresh: '2000' }).deadline,
    canonical.deadline
  );
});

test('an old resume URL does not reset a continued practice draft to its earlier cloud checkpoint', () => {
  const store = storage();
  const oldLink = '#/quiz/aws-ace/practice?resume=1&entry=100';
  const newLink = '#/quiz/gcp-ace/practice?resume=1&entry=100';
  store.setItem(
    'quiz-study-v1:alice:aws-ace:practice',
    JSON.stringify({
      signature: questionFingerprint(questions),
      index: 2,
      answers: ['A', ['A', 'C'], {}],
      entryToken: oldLink,
    })
  );
  const restored = initialStudySession(
    store,
    sessionKey('alice', 'gcp-ace', 'practice'),
    questions,
    'practice',
    () => {
      throw new Error('Must restore');
    },
    { initialIndex: 0, entryToken: newLink }
  );
  assert.equal(restored.index, 2);
  assert.equal(restored.entryToken, newLink);
  assert.deepEqual(restored.answers[1], ['A', 'C']);
});

test('reopening a new-exam URL restores the exact order, choices, answers and deadline', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const make = () => createExamSession(questions, 3, 60, { now: 1000, random: () => 0.25 });
  const first = initialStudySession(store, key, questions, 'exam', make, { fresh: 'new-exam-1' });
  first.index = 1;
  first.answers[1] = ['A'];
  first.flags = [1];
  store.setItem(key, JSON.stringify(first));
  const restored = initialStudySession(
    store,
    key,
    questions,
    'exam',
    () => {
      throw new Error('Must restore, not recreate');
    },
    { fresh: 'new-exam-1' }
  );
  assert.deepEqual(restored, first);
  assert.equal(restored.deadline, 3601000);
  const fresh = initialStudySession(store, key, questions, 'exam', make, { fresh: 'new-exam-2' });
  assert.equal(fresh.index, 0);
  assert.deepEqual(fresh.answers, fresh.questions.map(emptyAnswer));
});

test('returning to an older exam link cannot reset a newer running exam', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const make = () => createExamSession(questions, 3, 60, { now: 1000 });
  const running = initialStudySession(store, key, questions, 'exam', make, { fresh: '2000' });
  running.answers[0] = 'A';
  store.setItem(key, JSON.stringify(running));
  const restored = initialStudySession(
    store,
    key,
    questions,
    'exam',
    () => {
      throw new Error('Must keep the running exam');
    },
    { fresh: '1000' }
  );
  assert.deepEqual(restored, running);
});

test('cloud resume sets a position once; refreshing keeps the subsequent local position', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'practice');
  const make = () => ({
    signature: questionFingerprint(questions),
    index: 0,
    answers: questions.map(emptyAnswer),
  });
  const resumed = initialStudySession(store, key, questions, 'practice', make, {
    initialIndex: 1,
    entryToken: 'resume-1',
  });
  resumed.index = 2;
  resumed.answers[0] = 'A';
  store.setItem(key, JSON.stringify(resumed));
  const refreshed = initialStudySession(store, key, questions, 'practice', make, {
    initialIndex: 1,
    entryToken: 'resume-1',
  });
  assert.equal(refreshed.index, 2);
  assert.equal(refreshed.answers[0], 'A');
  assert.equal(
    initialStudySession(store, key, questions, 'practice', make, {
      initialIndex: 1,
      entryToken: 'resume-2',
    }).index,
    1
  );
});

test('content changes, corrupted storage and invalid sessions never restore a different quiz', () => {
  const store = storage();
  const key = sessionKey(null, 'bank', 'exam');
  const session = createExamSession(questions, 80, 60, { now: 1000 });
  store.setItem(key, JSON.stringify(session));
  assert.equal(session.questions.length, questions.length);
  const changed = questions.map((question, index) =>
    index === 0 ? { ...question, answer: ['B'] } : question
  );
  assert.equal(readStudySession(store, key, changed, 'exam'), null);
  for (const corrupt of [
    '{',
    JSON.stringify({ ...session, questions: [{ ...questions[0], id: 'unknown' }] }),
    JSON.stringify({ ...session, index: 900 }),
    JSON.stringify({ ...session, answers: [] }),
    JSON.stringify({ ...session, flags: [-1] }),
  ]) {
    store.setItem(key, corrupt);
    assert.equal(readStudySession(store, key, questions, 'exam'), null);
  }
  assert.equal(
    readStudySession(
      {
        getItem() {
          throw new Error('Denied');
        },
      },
      key,
      questions,
      'exam'
    ),
    null
  );
});

test('expiry and manual submission lock the same exam once, without extending its deadline', () => {
  const session = createExamSession(questions, 2, 60, { now: 1000 });
  assert.equal(finishExam(session, session.deadline - 1), session);
  const expired = finishExam(session, session.deadline);
  assert.equal(expired.submitted, true);
  assert.equal(expired.timeExpired, true);
  assert.equal(expired.deadline, session.deadline);
  assert.equal(finishExam(expired, session.deadline + 10000), expired);
  const submitted = finishExam(session, 2000, true);
  assert.equal(submitted.submitted, true);
  assert.equal(submitted.timeExpired, false);
});

test('result counts distinguish incorrect answers from incomplete and unanswered questions', () => {
  assert.deepEqual(examStats({ questions, answers: ['B', ['A'], { s1: 'Y' }] }), {
    correct: 0,
    answered: 1,
    incorrect: 1,
    unanswered: 2,
  });
  assert.deepEqual(examStats({ questions, answers: ['A', ['A', 'C'], { s1: 'Y', s2: 'N' }] }), {
    correct: 3,
    answered: 3,
    incorrect: 0,
    unanswered: 0,
  });
});

test('account changes clear only that account’s drafts and preserve unrelated preferences', () => {
  const store = storage();
  const alice = sessionKey('alice', 'bank', 'practice');
  const bob = sessionKey('bob', 'bank', 'exam');
  assert.notEqual(alice, sessionKey('bob', 'bank', 'practice'));
  store.setItem(alice, '{}');
  store.setItem(bob, '{}');
  store.setItem('quiz-app-language', 'vi');
  clearStudySessions(store, 'alice');
  assert.equal(store.getItem(alice), null);
  assert.equal(store.getItem(bob), '{}');
  assert.equal(store.getItem('quiz-app-language'), 'vi');
});

test('new exams default to Standard unless Learning is explicitly recognized', () => {
  for (const feedbackMode of [undefined, null, '', 'unknown', 'constructor', {}, ['learning']]) {
    const session = createExamSession(questions, 2, 60, { now: 1000, feedbackMode });
    assert.equal(session.feedbackMode, 'standard');
    assert.equal(session.deadline, 3601000);
  }
  assert.equal(
    createExamSession(questions, 2, 60, { feedbackMode: 'learning' }).feedbackMode,
    'learning'
  );
});

test('legacy and invalid feedback values keep a valid draft as Standard without resetting it', () => {
  const store = storage();
  const key = sessionKey('alice', 'bank', 'exam');
  const draft = {
    ...createExamSession(questions, 3, 60, { now: 1000 }),
    index: 1,
    flags: [1],
    freshToken: '1000',
  };
  draft.answers[0] = 'B';
  for (const feedbackMode of [undefined, null, 'invalid', {}, ['learning']]) {
    store.setItem(key, JSON.stringify({ ...draft, feedbackMode }));
    assert.deepEqual(readStudySession(store, key, questions, 'exam'), draft);
  }
});

test('resume keeps the stored feedback mode and only a new exam uses changed settings', () => {
  for (const feedbackMode of ['standard', 'learning']) {
    const store = storage();
    const key = sessionKey('alice', 'bank', 'exam');
    const create = (value) => () =>
      createExamSession(questions, 3, 60, { now: 1000, feedbackMode: value });
    const draft = initialStudySession(store, key, questions, 'exam', create(feedbackMode), {
      fresh: '2000',
    });
    draft.index = 1;
    draft.flags = [1];
    draft.answers[0] = 'B';
    store.setItem(key, JSON.stringify(draft));
    const otherMode = feedbackMode === 'standard' ? 'learning' : 'standard';
    for (const fresh of [null, '2000', '1000']) {
      assert.deepEqual(
        initialStudySession(store, key, questions, 'exam', create(otherMode), { fresh }),
        draft
      );
    }
    const next = initialStudySession(store, key, questions, 'exam', create(otherMode), {
      fresh: '3000',
    });
    assert.equal(next.feedbackMode, otherMode);
    assert.equal(next.index, 0);
    assert.deepEqual(next.flags, []);
    assert.deepEqual(next.answers, next.questions.map(emptyAnswer));
  }
});

test('learning drafts never cross quiz or account boundaries and logout clears their state', () => {
  const store = storage();
  const key = sessionKey('alice', 'one-bank', 'exam');
  store.setItem(
    key,
    JSON.stringify(createExamSession(questions, 3, 60, { feedbackMode: 'learning' }))
  );
  for (const otherKey of [
    sessionKey('bob', 'one-bank', 'exam'),
    sessionKey(null, 'one-bank', 'exam'),
    sessionKey('alice', 'another-bank', 'exam'),
    sessionKey('alice', 'custom', 'exam'),
  ]) {
    const next = initialStudySession(store, otherKey, questions, 'exam', () =>
      createExamSession(questions, 3, 60)
    );
    assert.equal(next.feedbackMode, 'standard');
    assert.deepEqual(next.answers, next.questions.map(emptyAnswer));
  }
  clearStudySessions(store, 'alice');
  assert.equal(store.getItem(key), null);
});

test('both feedback modes retain final answers, mode and deadline after submit or expiry', () => {
  for (const feedbackMode of ['standard', 'learning']) {
    const session = createExamSession([questions[0]], 1, 60, { now: 1000, feedbackMode });
    session.answers[0] = 'B';
    assert.equal(examStats(session).incorrect, 1);
    session.answers[0] = 'A';
    for (const finished of [
      finishExam(session, 2000, true),
      finishExam(session, session.deadline),
    ]) {
      assert.equal(finished.feedbackMode, feedbackMode);
      assert.equal(finished.deadline, session.deadline);
      assert.equal(examStats(finished).correct, 1);
      assert.equal(finishExam(finished, session.deadline + 1000), finished);
    }
  }
});
