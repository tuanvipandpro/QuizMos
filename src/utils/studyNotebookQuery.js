import { NOTEBOOK_PAGE_SIZE } from '../data/studyNotebookLimits.js';
import { notebookError } from './studyNotebook.js';
import { UUID_PATTERN } from './secureId.js';

const fields = ['sourceGroup', 'mistakes', 'bookmarks', 'review'];
const invalid = () => {
  throw notebookError('INVALID');
};
const source = (value) => {
  if (typeof value !== 'string') return false;
  if (/^bank:[a-z0-9-]{1,120}$/.test(value)) return true;
  const match = /^custom:([^:]+):v([1-9][0-9]*)$/.exec(value);
  return !!match && UUID_PATTERN.test(match[1]) && Number.isSafeInteger(Number(match[2]));
};
export function notebookFilters(input = {}) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !fields.includes(key))
  )
    invalid();
  const value = { sourceGroup: null, mistakes: false, bookmarks: false, review: 'all', ...input };
  if (
    (value.sourceGroup !== null && !source(value.sourceGroup)) ||
    typeof value.mistakes !== 'boolean' ||
    typeof value.bookmarks !== 'boolean' ||
    !['all', 'pending', 'reviewed'].includes(value.review) ||
    (!value.mistakes && value.review !== 'all')
  )
    invalid();
  return value;
}

/** Exhaustive legal predicate shapes; concrete source identity never affects indexes. */
export function notebookFilterShapes() {
  return [null, 'bank:gcp-ace'].flatMap((sourceGroup) =>
    [false, true].flatMap((mistakes) =>
      [false, true].flatMap((bookmarks) =>
        (mistakes ? ['all', 'pending', 'reviewed'] : ['all']).map((review) => ({
          sourceGroup,
          mistakes,
          bookmarks,
          review,
        }))
      )
    )
  );
}

export function notebookQueryPlan(input = {}, after = null) {
  const filter = notebookFilters(input),
    equalities = [];
  if (filter.sourceGroup) equalities.push(['sourceGroup', filter.sourceGroup]);
  if (filter.mistakes) equalities.push(['mistake', true]);
  if (filter.bookmarks) equalities.push(['bookmarked', true]);
  if (filter.review !== 'all') equalities.push(['reviewed', filter.review === 'reviewed']);
  if (
    after !== null &&
    (!after ||
      typeof after !== 'object' ||
      Object.keys(after).length !== 3 ||
      !Number.isSafeInteger(after.seconds) ||
      after.seconds < 0 ||
      after.seconds > 253402300799 ||
      !Number.isSafeInteger(after.nanoseconds) ||
      after.nanoseconds < 0 ||
      after.nanoseconds >= 1000000000 ||
      typeof after.entryKey !== 'string' ||
      !/^[0-9a-f]{64}$/.test(after.entryKey))
  )
    invalid();
  return {
    equalities,
    order: [
      ['updatedAt', 'desc'],
      ['__name__', 'desc'],
    ],
    after,
    limit: NOTEBOOK_PAGE_SIZE,
  };
}

export function notebookIndexFields(input) {
  const plan = notebookQueryPlan(input);
  // With no equality predicate, the automatic descending single-field index
  // already orders the document ID descending; don't create a redundant index.
  if (!plan.equalities.length) return null;
  return [
    ...plan.equalities.map(([fieldPath]) => ({ fieldPath, order: 'ASCENDING' })),
    ...plan.order.map(([fieldPath]) => ({ fieldPath, order: 'DESCENDING' })),
  ];
}
