export const EXAM_REVIEW_FILTERS = [
  ['all', 'All questions'],
  ['missed', 'Missed questions'],
  ['correct', 'Correct'],
  ['incorrect', 'Incorrect'],
  ['unanswered', 'Unanswered'],
  ['flagged', 'Flagged'],
];

export function matchesExamReviewFilter(filter, { complete, correct }, flagged) {
  return (
    filter === 'all' ||
    (filter === 'missed' && !correct) ||
    (filter === 'correct' && correct) ||
    (filter === 'incorrect' && complete && !correct) ||
    (filter === 'unanswered' && !complete) ||
    (filter === 'flagged' && flagged)
  );
}
