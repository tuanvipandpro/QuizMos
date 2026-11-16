import { CERTIFICATION_SOURCES } from '../data/certificationProfiles.js';
import { findQuiz } from '../data/quizzes.js';
import { canonicalQuizId } from '../data/quizAliases.js';

export const sessionSettingsError = (code, field = null) =>
  Object.assign(new Error(`SESSION_${code}`), { code: `SESSION_${code}`, field });
const invalid = () => {
  throw sessionSettingsError('INVALID_PROFILE');
};
const whole = (value) => Number.isSafeInteger(value) && value > 0;
const date = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const exact = (value, keys) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const fields = [
  'schemaVersion',
  'quizId',
  'code',
  'phase',
  'revision',
  'reviewedAt',
  'count',
  'minutes',
  'score',
  'formats',
  'versionConfirmed',
  'effectiveUntil',
  'seatMinutes',
  'notes',
  'sources',
];

export function validateCertificationProfile(p) {
  if (
    !exact(p, fields) ||
    p.schemaVersion !== 1 ||
    !findQuiz(p.quizId) ||
    canonicalQuizId(p.quizId) !== p.quizId ||
    typeof p.code !== 'string' ||
    !p.code.trim() ||
    p.phase !== 'standard' ||
    !date(p.revision) ||
    !date(p.reviewedAt) ||
    typeof p.versionConfirmed !== 'boolean' ||
    (p.effectiveUntil !== null && !date(p.effectiveUntil)) ||
    (p.minutes !== null && !whole(p.minutes)) ||
    (p.seatMinutes !== null &&
      (!whole(p.seatMinutes) || (p.minutes !== null && p.seatMinutes < p.minutes)))
  )
    invalid();
  const c = p.count,
    s = p.score;
  if (
    !exact(c, ['kind', 'min', 'max']) ||
    !['exact', 'range', 'unknown'].includes(c.kind) ||
    (c.kind === 'unknown'
      ? c.min !== null || c.max !== null
      : !whole(c.min) || !whole(c.max) || c.min > c.max) ||
    (c.kind === 'exact' && c.min !== c.max) ||
    (c.kind === 'range' && c.min === c.max)
  )
    invalid();
  if (
    !exact(s, ['kind', 'threshold', 'minimum', 'maximum']) ||
    !['scaled', 'points', 'undisclosed', 'unverified'].includes(s.kind)
  )
    invalid();
  if (['scaled', 'points'].includes(s.kind)) {
    if (
      !whole(s.threshold) ||
      !Number.isSafeInteger(s.minimum) ||
      s.minimum < 0 ||
      !whole(s.maximum) ||
      s.threshold < s.minimum ||
      s.threshold > s.maximum
    )
      invalid();
  } else if ([s.threshold, s.minimum, s.maximum].some((value) => value !== null)) invalid();
  if (
    (p.formats !== null &&
      (!Array.isArray(p.formats) ||
        !p.formats.length ||
        new Set(p.formats).size !== p.formats.length ||
        p.formats.some(
          (type) => !['multiple_choice', 'yes_no', 'dropdown', 'drag_drop'].includes(type)
        ))) ||
    !Array.isArray(p.notes) ||
    p.notes.some((note) => typeof note !== 'string' || !note.trim()) ||
    !Array.isArray(p.sources) ||
    !p.sources.length ||
    new Set(p.sources).size !== p.sources.length ||
    p.sources.some((key) => !Object.hasOwn(CERTIFICATION_SOURCES, key))
  )
    invalid();
  return p;
}

export function certificationProfileStatus(profile, day = new Date().toISOString().slice(0, 10)) {
  if (!profile) return 'unverified';
  validateCertificationProfile(profile);
  if (!date(day)) invalid();
  if (profile.effectiveUntil && day > profile.effectiveUntil) return 'legacy';
  return profile.versionConfirmed &&
    profile.count.kind !== 'unknown' &&
    profile.minutes !== null &&
    profile.formats
    ? 'verified'
    : 'partial';
}
