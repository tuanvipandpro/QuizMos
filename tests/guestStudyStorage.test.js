import test from 'node:test';
import assert from 'node:assert/strict';
import { examHistorySource } from '../src/utils/examHistory.js';
import {
  commitGuestStudyTransfer,
  prepareGuestStudyTransfer,
  TAB_UPLOAD_KEY,
} from '../src/services/guestStudyStorage.js';
import {
  createQuickPracticeStorage,
  quickPracticeSlot,
} from '../src/services/quickPracticeStorage.js';
import {
  createExamSession,
  finishExam,
  questionFingerprint,
  sessionKey,
} from '../src/utils/studySession.js';

const questions = Array.from({ length: 12 }, (_, index) => ({
  id: String(index),
  question: 'Pick one',
  options: { A: 'First', B: 'Second' },
  answer: ['A'],
}));
const bank = { kind: 'bank', id: 'gcp-ace', questions };
const uid = 'alice';
function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
const practice = (pool) => ({
  index: 1,
  answers: pool.map((_, index) => (index === 1 ? 'A' : null)),
  signature: questionFingerprint(pool),
});

test('a guest Practice transfer detects an aliased destination, writes only the chosen slot and strips forcing parameters', () => {
  const tab = storage();
  const guestKey = sessionKey(null, bank.id, 'practice');
  const targetKey = sessionKey(uid, bank.id, 'practice');
  const oldAlias = 'quiz-study-v1:alice:aws-ace:practice';
  const otherKey = sessionKey('bob', bank.id, 'practice');
  const guest = practice(questions);
  tab.setItem(guestKey, JSON.stringify(guest));
  tab.setItem(oldAlias, JSON.stringify({ ...guest, index: 4 }));
  tab.setItem(otherKey, 'another-account');
  const plan = prepareGuestStudyTransfer(
    tab,
    { quiz: bank, mode: 'practice', params: new URLSearchParams('resume=1&entry=1&question=4') },
    uid,
    false
  );
  assert.equal(plan.conflict, true);
  assert.equal(plan.resumeAccount, true);
  assert.equal(plan.resumeHash, '#/quiz/gcp-ace/practice');
  assert.equal(tab.getItem(targetKey), null);
  assert.equal(JSON.parse(tab.getItem(oldAlias)).index, 4);
  commitGuestStudyTransfer(tab, plan);
  assert.deepEqual(JSON.parse(tab.getItem(targetKey)), { ...guest, notebook: null });
  assert.equal(tab.getItem(oldAlias), null);
  assert.equal(tab.getItem(otherKey), 'another-account');
});

test('a completed guest exam carries its settings, deadline, answers, flags and review without enabling capture', () => {
  const tab = storage();
  const exam = createExamSession(questions, 3, 60, { now: 1000, random: () => 0.99 });
  const result = finishExam(
    {
      ...exam,
      reviewFilter: 'flagged',
      index: 1,
      flags: [1],
      answers: ['A', 'B', null],
      freshToken: '1000',
      sessionSettings: { kind: 'custom', minutes: 60, count: 3 },
    },
    1500,
    true
  );
  tab.setItem(sessionKey(null, bank.id, 'exam'), JSON.stringify(result));
  const transfer = prepareGuestStudyTransfer(
    tab,
    { quiz: bank, mode: 'exam', params: new URLSearchParams('fresh=1000&time=60') },
    uid,
    true
  );
  assert.equal(transfer.conflict, false);
  assert.equal(transfer.resumeHash, '#/quiz/gcp-ace/exam');
  commitGuestStudyTransfer(tab, transfer);
  assert.deepEqual(JSON.parse(tab.getItem(sessionKey(uid, bank.id, 'exam'))), {
    ...result,
    historyOwner: null,
    historySource: examHistorySource(bank, uid),
    captureHistory: false,
    notebook: null,
  });
});

test('a short uploaded Practice keeps its manifest and source, and restores previous values if a write fails', () => {
  const tab = storage();
  const quiz = {
    id: 'custom',
    kind: 'tab-upload',
    owner: null,
    name: 'Guest test upload',
    questions,
  };
  tab.setItem(TAB_UPLOAD_KEY, JSON.stringify(quiz));
  const guest = createQuickPracticeStorage({ storage: () => tab, now: () => 1000 }).resolve({
    sourceId: quiz.id,
    questions,
    size: 10,
  });
  tab.setItem(guest.draftKey, JSON.stringify(practice(guest.questions)));
  const target = quickPracticeSlot(uid, quiz.id, 10);
  tab.setItem(target + ':practice', 'prior-account-draft');
  const plan = prepareGuestStudyTransfer(
    tab,
    { quiz, mode: 'practice', params: new URLSearchParams('size=10&fresh=1000') },
    uid,
    true
  );
  assert.equal(plan.conflict, true);
  assert.equal(plan.resumeHash, '#/quiz/custom/practice?size=10');
  const failing = {
    ...tab,
    setItem(key, value) {
      if (key === TAB_UPLOAD_KEY) throw Error('write failed');
      tab.setItem(key, value);
    },
  };
  assert.throws(() => commitGuestStudyTransfer(failing, plan), /write failed/);
  assert.equal(tab.getItem(target + ':practice'), 'prior-account-draft');
  assert.equal(tab.getItem(target + ':manifest'), null);
  assert.deepEqual(JSON.parse(tab.getItem(TAB_UPLOAD_KEY)), quiz);
  commitGuestStudyTransfer(tab, plan);
  assert.deepEqual(JSON.parse(tab.getItem(TAB_UPLOAD_KEY)), { ...quiz, owner: uid });
  const resumed = createQuickPracticeStorage({ storage: () => tab }).resolve({
    uid,
    sourceId: quiz.id,
    questions,
    size: 10,
  });
  assert.equal(resumed.manifest.runId, guest.manifest.runId);
  assert.deepEqual(resumed.indices, guest.indices);
  assert.deepEqual(JSON.parse(tab.getItem(resumed.draftKey)), {
    ...practice(guest.questions),
    notebook: null,
  });
});
