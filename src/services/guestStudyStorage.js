import { quickPracticeSlot, readQuickPracticeManifest } from './quickPracticeStorage.js';
import { notebookSession } from '../utils/studyNotebookCapture.js';
import { examHistorySource } from '../utils/examHistory.js';
import {
  questionFingerprint,
  readStudySession,
  sessionKey,
  studySessionKeys,
} from '../utils/studySession.js';
import { quizUrl } from '../utils/navigation.js';

export const TAB_UPLOAD_KEY = 'quiz-tab-upload-v1';

export function prepareGuestStudyTransfer(storage, { quiz, mode, params }, uid, capturePractice) {
  if (
    !uid ||
    uid === 'guest' ||
    !['practice', 'exam'].includes(mode) ||
    !quiz ||
    (quiz.kind !== 'bank' && !(quiz.kind === 'tab-upload' && quiz.owner === null))
  )
    return null;
  if (quiz.kind === 'tab-upload') {
    const uploaded = JSON.parse(storage.getItem(TAB_UPLOAD_KEY));
    if (
      !uploaded ||
      uploaded.owner !== null ||
      uploaded.id !== quiz.id ||
      !Array.isArray(uploaded.questions) ||
      questionFingerprint(uploaded.questions) !== questionFingerprint(quiz.questions)
    )
      return null;
  }
  const size = params.get('size');
  const quick = mode === 'practice' && !!size && size !== 'all';
  const pickSlot = (owner) =>
    quick
      ? quickPracticeSlot(owner, quiz.id, size) + ':practice'
      : sessionKey(owner, quiz.id, mode);
  const oldKey = pickSlot(null);
  const newKey = pickSlot(uid);
  const manifest = quick
    ? readQuickPracticeManifest(storage, null, quiz.id, quiz.questions, size)
    : null;
  if (quick && !manifest) return null;
  const questions = manifest
    ? manifest.indices.map((index) => quiz.questions[index])
    : quiz.questions;
  const guest = readStudySession(storage, oldKey, questions, mode);
  if (!guest || (mode === 'exam' && guest.historyOwner != null)) return null;

  const targets = studySessionKeys(newKey, mode);
  const manifestKey = quick ? quickPracticeSlot(uid, quiz.id, size) + ':manifest' : null;
  const destination = [...targets, ...(manifestKey ? [manifestKey] : [])];
  const conflict = destination.some((key) => storage.getItem(key) !== null);
  const accountManifest = quick
    ? readQuickPracticeManifest(storage, uid, quiz.id, quiz.questions, size)
    : null;
  const accountQuestions = accountManifest
    ? accountManifest.indices.map((index) => quiz.questions[index])
    : questions;
  const resumeAccount =
    quiz.kind === 'bank' &&
    (!quick || !!accountManifest) &&
    (quick && storage.getItem(newKey) === null
      ? true
      : !!readStudySession(storage, newKey, accountQuestions, mode));
  const session =
    mode === 'exam'
      ? {
          ...guest,
          historyOwner: null,
          historySource: examHistorySource(quiz, uid),
          captureHistory: false,
          notebook: null,
        }
      : { ...guest, notebook: notebookSession(uid, capturePractice && quiz.kind === 'bank') };
  const writes = [[newKey, JSON.stringify(session)], ...targets.slice(1).map((key) => [key, null])];
  if (manifestKey) writes.push([manifestKey, JSON.stringify({ ...manifest, owner: uid })]);
  if (quiz.kind === 'tab-upload')
    writes.push([TAB_UPLOAD_KEY, JSON.stringify({ ...quiz, owner: uid })]);

  return {
    conflict,
    resumeAccount,
    writes,
    resumeHash: quizUrl(quiz.id, mode, {
      ...(quick ? { size } : {}),
      ...(params.get('from') === 'summary' ? { from: 'summary' } : {}),
    }),
  };
}

export function commitGuestStudyTransfer(storage, { writes }) {
  const originals = writes.map(([key]) => storage.getItem(key));
  const write = (key, value) =>
    value === null ? storage.removeItem(key) : storage.setItem(key, value);
  let applied = 0;
  try {
    for (const [key, value] of writes) {
      write(key, value);
      applied++;
    }
  } catch (error) {
    for (let index = applied - 1; index >= 0; index--) {
      try {
        write(writes[index][0], originals[index]);
      } catch {
        /* Storage may have become unavailable. The guest draft is still untouched. */
      }
    }
    throw error;
  }
}
