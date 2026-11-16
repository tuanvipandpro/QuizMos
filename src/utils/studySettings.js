import { getCertificationProfile } from '../data/certificationProfiles.js';
import { certificationProfileStatus, sessionSettingsError } from './certificationProfile.js';
import { getExamFeedbackMode } from '../data/examModes.js';
import { validateQuizQuestions, questionType } from './questionModel.js';
import {
  QUICK_PRACTICE_COUNTS,
  CUSTOM_EXAM_MAX_QUESTIONS,
  CUSTOM_EXAM_MAX_MINUTES,
  STUDY_SETTINGS_SCHEMA,
} from '../data/studySettingsLimits.js';

export function studyInteger(value, field) {
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) value = Number(value);
  if (!Number.isSafeInteger(value) || value < 1) throw sessionSettingsError('INVALID', field);
  return value;
}

/** Retains originals/source indices; never repairs questions or invents tags. */
export function eligibleStudyPool(questions, { formats = null, identities = null } = {}) {
  if (
    !Array.isArray(questions) ||
    (identities && (!Array.isArray(identities) || identities.length !== questions.length))
  )
    throw sessionSettingsError('INVALID_POOL');
  const items = [],
    excluded = [],
    keys = new Set();
  for (const [index, question] of questions.entries()) {
    try {
      validateQuizQuestions([question]);
    } catch {
      excluded.push({ index, reason: 'ungradable' });
      continue;
    }
    if (formats && !formats.includes(questionType(question))) {
      excluded.push({ index, reason: 'format' });
      continue;
    }
    const key = identities ? identities[index] : String(question.id);
    if (typeof key !== 'string' || !key || keys.has(key))
      throw sessionSettingsError('INVALID_POOL');
    keys.add(key);
    items.push({ key, index, question });
  }
  return { items, excluded };
}

export function sampleStudyPool(items, requested, random = Math.random) {
  const count = studyInteger(requested, 'count');
  if (!Array.isArray(items) || count > items.length)
    throw sessionSettingsError('INSUFFICIENT', 'count');
  if (new Set(items.map((item) => item.key)).size !== items.length)
    throw sessionSettingsError('INVALID_POOL');
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1)
      throw sessionSettingsError('INVALID_RANDOM');
    const other = Math.floor(value * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result.slice(0, count);
}

export function practiceSize(value) {
  if (value === null || value === undefined || value === 'all') return 'all';
  const count = studyInteger(value, 'count');
  if (!QUICK_PRACTICE_COUNTS.includes(count)) throw sessionSettingsError('INVALID', 'count');
  return count;
}

export function defaultExamSetup(quizId, questions, day) {
  const profile = getCertificationProfile(quizId);
  if (certificationProfileStatus(profile, day) === 'verified')
    return {
      kind: 'cert',
      count: profile.count.min,
      minutes: profile.minutes,
      feedbackMode: 'standard',
    };
  const pool = eligibleStudyPool(questions);
  return {
    kind: 'custom',
    count: Math.min(50, pool.items.length) || null,
    minutes: profile?.minutes || 60,
    feedbackMode: 'standard',
  };
}

export function resolveExamSettings({
  quizId,
  questions,
  kind,
  count,
  minutes,
  feedbackMode,
  day,
}) {
  if (!['cert', 'custom'].includes(kind)) throw sessionSettingsError('INVALID', 'kind');
  const profile = getCertificationProfile(quizId),
    mode = getExamFeedbackMode(feedbackMode).id;
  const selectedCount = studyInteger(count, 'count'),
    selectedMinutes = studyInteger(minutes, 'minutes');
  if (selectedCount > CUSTOM_EXAM_MAX_QUESTIONS) throw sessionSettingsError('INVALID', 'count');
  if (
    !Number.isSafeInteger(selectedMinutes * 60000) ||
    selectedMinutes * 60000 > 8640000000000000 - Date.now()
  )
    throw sessionSettingsError('INVALID', 'minutes');
  if (kind === 'cert') {
    if (certificationProfileStatus(profile, day) !== 'verified')
      throw sessionSettingsError('UNVERIFIED_PROFILE', 'kind');
    if (selectedCount < profile.count.min || selectedCount > profile.count.max)
      throw sessionSettingsError('INVALID', 'count');
    if (selectedMinutes !== profile.minutes) throw sessionSettingsError('INVALID', 'minutes');
  } else if (selectedMinutes > CUSTOM_EXAM_MAX_MINUTES)
    throw sessionSettingsError('INVALID', 'minutes');
  const pool = eligibleStudyPool(questions, { formats: kind === 'cert' ? profile.formats : null });
  if (selectedCount > pool.items.length) throw sessionSettingsError('INSUFFICIENT', 'count');
  const snapshot = profile ? JSON.parse(JSON.stringify(profile)) : null;
  return {
    settings: {
      schemaVersion: STUDY_SETTINGS_SCHEMA,
      kind: kind === 'cert' && mode === 'standard' ? 'cert' : 'custom',
      count: selectedCount,
      minutes: selectedMinutes,
      feedbackMode: mode,
      profile: snapshot,
    },
    selectionQuestions: pool.items.map((item) => item.question),
    excluded: pool.excluded,
  };
}

/** Existing explicit count/time links are training; missing settings use profile defaults. */
export function examSetupFromParams(params, quizId, questions, day) {
  const defaults = defaultExamSetup(quizId, questions, day);
  const explicit = params.has('count') || params.has('time');
  return {
    kind: params.has('format') ? params.get('format') : explicit ? 'custom' : defaults.kind,
    count: params.has('count') ? params.get('count') : defaults.count,
    minutes: params.has('time') ? params.get('time') : defaults.minutes,
    feedbackMode: getExamFeedbackMode(params.get('feedback')).id,
  };
}
