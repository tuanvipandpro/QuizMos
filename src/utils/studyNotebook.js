import { findQuiz } from '../data/quizzes.js';
import { canonicalQuizId } from '../data/quizAliases.js';
import { cloudQuizId, parseCloudQuizId } from './customQuizModel.js';
import { archivedQuestion } from './examHistorySnapshot.js';
import { contentHash } from './contentHash.js';
import { orderObjectKeys } from './questionFingerprint.js';
import {
  isAnswerComplete,
  isAnswerCorrect,
  questionType,
  validateQuizQuestions,
} from './questionModel.js';
import { UUID_PATTERN } from './secureId.js';
import {
  NOTEBOOK_SCHEMA,
  MAX_NOTEBOOK_NOTE_CHARACTERS,
  MAX_NOTEBOOK_NOTE_BYTES,
  MAX_NOTEBOOK_ENTRY_BYTES,
  MAX_NOTEBOOK_QUESTION_ID_BYTES,
} from '../data/studyNotebookLimits.js';

export const notebookError = (code) =>
  Object.assign(new Error(`NOTEBOOK_${code}`), { code: `NOTEBOOK_${code}` });
const invalid = () => {
  throw notebookError('INVALID');
};
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) =>
  record(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const digest = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
const bytes = (value) => new TextEncoder().encode(value).length;
const canonical = (value) => JSON.stringify(orderObjectKeys(value));
const REF_FIELDS = [
  'kind',
  'quizId',
  'slotId',
  'instanceId',
  'contentVersion',
  'questionId',
  'fingerprint',
];
export const NOTEBOOK_STATE_FIELDS = [
  'bookmarked',
  'note',
  'mistake',
  'reviewed',
  'lastWrongAt',
  'lastReviewedAt',
];
export const NOTEBOOK_ENTRY_FIELDS = [
  'schemaVersion',
  'entryKey',
  'ref',
  'sourceGroup',
  ...NOTEBOOK_STATE_FIELDS,
  'revision',
  'lastOperationId',
  'lastOperationFingerprint',
  'createdAt',
  'updatedAt',
];

export function notebookNote(value) {
  if (typeof value !== 'string') invalid();
  if (
    [...value].some(
      (character) =>
        character.length === 1 &&
        character.charCodeAt(0) >= 0xd800 &&
        character.charCodeAt(0) <= 0xdfff
    )
  )
    invalid();
  // Preserve whitespace and text exactly; no HTML/Markdown interpretation here.
  if ([...value].length > MAX_NOTEBOOK_NOTE_CHARACTERS || bytes(value) > MAX_NOTEBOOK_NOTE_BYTES)
    throw notebookError('SIZE');
  return value;
}

export function validateNotebookReference(ref) {
  if (
    !exact(ref, REF_FIELDS) ||
    typeof ref.quizId !== 'string' ||
    typeof ref.questionId !== 'string' ||
    !ref.questionId.trim() ||
    !digest(ref.fingerprint)
  )
    invalid();
  if (bytes(ref.questionId) > MAX_NOTEBOOK_QUESTION_ID_BYTES) throw notebookError('SIZE');
  if (ref.kind === 'bank') {
    if (
      !/^[a-z0-9-]{1,120}$/.test(ref.quizId) ||
      canonicalQuizId(ref.quizId) !== ref.quizId ||
      ref.slotId !== null ||
      ref.instanceId !== null ||
      ref.contentVersion !== null
    )
      invalid();
  } else if (ref.kind === 'custom') {
    const id = parseCloudQuizId(ref.quizId);
    if (
      !id ||
      id.slotId !== ref.slotId ||
      id.instanceId !== ref.instanceId ||
      !whole(ref.contentVersion) ||
      ref.contentVersion < 1
    )
      invalid();
  } else invalid();
  return ref;
}

export function notebookSourceGroup(ref) {
  validateNotebookReference(ref);
  return ref.kind === 'bank'
    ? `bank:${ref.quizId}`
    : `custom:${ref.instanceId}:v${ref.contentVersion}`;
}

export async function notebookEntryKey(ref) {
  validateNotebookReference(ref);
  return contentHash(canonical({ schemaVersion: NOTEBOOK_SCHEMA, ref }));
}

export async function notebookQuestionFingerprint(question) {
  validateQuizQuestions([question]);
  const projected = archivedQuestion(question);
  return contentHash(
    canonical({
      ...projected,
      id: String(question.id),
      type: questionType(question),
      imageUrl: question.imageUrl || '',
      instruction: question.instruction || '',
      layout: question.layout || '',
      template: question.template || '',
    })
  );
}

export async function createNotebookReference(quiz, question, uid) {
  if (typeof uid !== 'string' || !uid || uid.includes('/')) throw notebookError('AUTH');
  if (!quiz || !Array.isArray(quiz.questions)) throw notebookError('SOURCE_UNAVAILABLE');
  const current = quiz.questions.find((item) => String(item.id) === String(question?.id));
  if (!current) throw notebookError('SOURCE_UNAVAILABLE');
  const fingerprint = await notebookQuestionFingerprint(current);
  if ((await notebookQuestionFingerprint(question)) !== fingerprint)
    throw notebookError('SOURCE_CHANGED');
  const base = { questionId: String(question.id), fingerprint };
  if (quiz.kind === 'bank') {
    if (!findQuiz(quiz.id)) throw notebookError('SOURCE_UNAVAILABLE');
    return validateNotebookReference({
      ...base,
      kind: 'bank',
      quizId: canonicalQuizId(quiz.id),
      slotId: null,
      instanceId: null,
      contentVersion: null,
    });
  }
  const identity = parseCloudQuizId(quiz.id);
  if (
    quiz.kind !== 'cloud-custom' ||
    quiz.owner !== uid ||
    !identity ||
    identity.slotId !== quiz.slotId ||
    identity.instanceId !== quiz.instanceId ||
    quiz.invalid
  )
    throw notebookError('SOURCE_UNAVAILABLE');
  return validateNotebookReference({
    ...base,
    kind: 'custom',
    quizId: cloudQuizId(quiz.slotId, quiz.instanceId),
    slotId: quiz.slotId,
    instanceId: quiz.instanceId,
    contentVersion: quiz.contentVersion,
  });
}

export const emptyNotebookState = () => ({
  bookmarked: false,
  note: '',
  mistake: false,
  reviewed: false,
  lastWrongAt: null,
  lastReviewedAt: null,
});
export const notebookStateFromEntry = (entry) =>
  Object.fromEntries(NOTEBOOK_STATE_FIELDS.map((key) => [key, entry[key]]));

export function validateNotebookState(state) {
  if (
    !exact(state, NOTEBOOK_STATE_FIELDS) ||
    ['bookmarked', 'mistake', 'reviewed'].some((key) => typeof state[key] !== 'boolean') ||
    (state.reviewed && !state.mistake)
  )
    invalid();
  notebookNote(state.note);
  if ([state.lastWrongAt, state.lastReviewedAt].some((time) => time !== null && !whole(time)))
    invalid();
  if (
    state.mistake !== (state.lastWrongAt !== null) ||
    (state.reviewed && state.lastReviewedAt === null) ||
    (!state.mistake && state.lastReviewedAt !== null)
  )
    invalid();
  return state;
}

export function notebookAnswerChange(question, answer) {
  // Legacy ungradable questions remain usable by Study, but aren't notebook evidence.
  try {
    validateQuizQuestions([question]);
  } catch {
    return null;
  }
  return isAnswerComplete(question, answer)
    ? { kind: 'outcome', correct: isAnswerCorrect(question, answer) }
    : null;
}

export function transitionNotebookState(current, change, now = Date.now()) {
  const state = current ? { ...validateNotebookState(current) } : emptyNotebookState();
  if (!whole(now) || !record(change)) invalid();
  switch (change.kind) {
    case 'bookmark':
      if (!exact(change, ['kind', 'value']) || typeof change.value !== 'boolean') invalid();
      state.bookmarked = change.value;
      break;
    case 'note':
      if (!exact(change, ['kind', 'value'])) invalid();
      state.note = notebookNote(change.value);
      break;
    case 'outcome':
      if (!exact(change, ['kind', 'correct']) || typeof change.correct !== 'boolean') invalid();
      if (!change.correct) {
        state.mistake = true;
        state.reviewed = false;
        state.lastWrongAt = now;
      } else if (state.mistake) {
        state.reviewed = true;
        state.lastReviewedAt = now;
      }
      break;
    case 'remove':
      if (!exact(change, ['kind'])) invalid();
      return null;
    default:
      invalid();
  }
  return state.bookmarked || state.mistake || state.note.length
    ? validateNotebookState(state)
    : null;
}

export async function validateNotebookEntry(entry) {
  if (
    !exact(entry, NOTEBOOK_ENTRY_FIELDS) ||
    entry.schemaVersion !== NOTEBOOK_SCHEMA ||
    !digest(entry.entryKey) ||
    !whole(entry.revision) ||
    entry.revision < 1 ||
    typeof entry.lastOperationId !== 'string' ||
    !UUID_PATTERN.test(entry.lastOperationId) ||
    !digest(entry.lastOperationFingerprint)
  )
    invalid();
  validateNotebookState(notebookStateFromEntry(entry));
  if (!whole(entry.createdAt) || !whole(entry.updatedAt) || entry.updatedAt < entry.createdAt)
    invalid();
  if (
    [entry.lastWrongAt, entry.lastReviewedAt].some(
      (time) => time !== null && time > entry.updatedAt
    )
  )
    invalid();
  if (
    entry.sourceGroup !== notebookSourceGroup(entry.ref) ||
    entry.entryKey !== (await notebookEntryKey(entry.ref))
  )
    invalid();
  if (!entry.bookmarked && !entry.mistake && !entry.note.length) invalid();
  if (bytes(JSON.stringify(entry)) > MAX_NOTEBOOK_ENTRY_BYTES) throw notebookError('SIZE');
  return entry;
}
