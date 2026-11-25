import { findQuiz } from '../data/quizzes.js';
import { canonicalQuizId } from '../data/quizAliases.js';
import { isRoadmapDay, roadmapDayInZone, ROADMAP_SLOTS } from './studyRoadmap.js';
import { UUID_PATTERN } from './secureId.js';

export const OUTCOME_SLOTS = Array.from({ length: 6 }, (_, index) => 'slot-' + (index + 1));
export const OUTCOME_NOTE_MAX = 1200;
export const OUTCOME_EXPERIENCE_MAX = 400;
export const OUTCOME_SCORE_MAX = 1000000;

export const outcomeError = (code) => Object.assign(new Error(code), { outcomeCode: code });
export const isOutcomeId = (id) => typeof id === 'string' && UUID_PATTERN.test(id);
export const validResult = (value) => value === 'passed' || value === 'not-passed';
const bankFormat = (value) => typeof value === 'string' && /^[a-z0-9-]{1,120}$/.test(value);
const exact = (value, keys) =>
  !!value &&
  typeof value === 'object' &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const stringLimit = (value, max) => typeof value === 'string' && value.length <= max;
const validScore = (value, max) =>
  (value === null && max === null) ||
  (Number.isFinite(value) &&
    Number.isFinite(max) &&
    max > 0 &&
    max <= OUTCOME_SCORE_MAX &&
    value >= 0 &&
    value <= max);
const rev = (value) => Number.isSafeInteger(value) && value >= 1;

export function normalizeOutcome(
  form,
  today = roadmapDayInZone(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone)
) {
  const bankId = canonicalQuizId(form.bankId);
  if (!findQuiz(bankId)) return { field: 'bankId', error: 'Choose an available quiz bank.' };
  if (!isRoadmapDay(form.examDate) || form.examDate < '1900-01-01' || form.examDate > today)
    return { field: 'examDate', error: 'Choose an exam date through today.' };
  if (!validResult(form.result)) return { field: 'result', error: 'Choose an exam outcome.' };
  const score = form.score === '' ? null : Number(form.score);
  const scoreMax = form.scoreMax === '' ? null : Number(form.scoreMax);
  if (!validScore(score, scoreMax))
    return { field: 'score', error: 'Enter a score and its maximum, or leave both blank.' };
  if (!stringLimit(form.note, OUTCOME_NOTE_MAX))
    return { field: 'note', error: 'The private note is too long.' };
  return {
    value: {
      bankId,
      examDate: form.examDate,
      result: form.result,
      score,
      scoreMax,
      note: form.note,
    },
  };
}

export function readOutcome(slot, data) {
  if (
    !OUTCOME_SLOTS.includes(slot) ||
    !exact(data, [
      'schemaVersion',
      'instanceId',
      'revision',
      'bankId',
      'examDate',
      'result',
      'score',
      'scoreMax',
      'note',
      'planSlot',
      'planId',
    ]) ||
    data.schemaVersion !== 1 ||
    !isOutcomeId(data.instanceId) ||
    !rev(data.revision) ||
    !bankFormat(data.bankId) ||
    !isRoadmapDay(data.examDate) ||
    data.examDate < '1900-01-01' ||
    !validResult(data.result) ||
    !validScore(data.score, data.scoreMax) ||
    !stringLimit(data.note, OUTCOME_NOTE_MAX) ||
    !(
      (data.planSlot === null && data.planId === null) ||
      (ROADMAP_SLOTS.includes(data.planSlot) && isOutcomeId(data.planId))
    )
  )
    throw outcomeError('invalid');
  return { ...data, slot };
}

export function readOutcomeReport(data) {
  if (
    !data ||
    typeof data.owner !== 'string' ||
    !OUTCOME_SLOTS.includes(data.slot) ||
    !bankFormat(data.bankId) ||
    !validResult(data.result) ||
    !stringLimit(data.experience, OUTCOME_EXPERIENCE_MAX) ||
    !['pending', 'published', 'rejected', 'removed'].includes(data.status) ||
    !rev(data.revision)
  )
    throw outcomeError('invalid');
  return data;
}

export function matchingPlan(plan, record) {
  return (
    plan?.slot === record.planSlot &&
    plan?.instanceId === record.planId &&
    canonicalQuizId(plan.bankId) === canonicalQuizId(record.bankId)
  );
}

export function sameOutcomeVersion(current, command) {
  return (
    !!current && current.instanceId === command.instanceId && current.revision === command.revision
  );
}

export function outcomeRecordEdit(current, { slot, instanceId, revision, fields }) {
  const candidate = { schemaVersion: 1, instanceId, revision: revision + 1, ...fields };
  readOutcome(slot, candidate);
  if (current && Object.keys(candidate).every((field) => current[field] === candidate[field]))
    return null;
  if (!(current ? sameOutcomeVersion(current, { instanceId, revision }) : revision === 0))
    throw outcomeError('conflict');
  return candidate;
}

export function changedOutcomeClaim(before, after) {
  return before.bankId !== after.bankId || before.result !== after.result;
}

export function withdrawOutcomeReport(current, revision) {
  if (current?.status === 'removed' && current.revision === revision + 1) return null;
  if (!current || current.revision !== revision || current.status === 'removed')
    throw outcomeError('conflict');
  return {
    owner: current.owner,
    slot: current.slot,
    bankId: current.bankId,
    result: current.result,
    experience: '',
    status: 'removed',
    revision: revision + 1,
  };
}
