# Proposal

## Why

Learners can filter questions immediately after an exam. When revisiting a saved result, the picker currently lists every question. Tracking is in [#230](https://github.com/tuanvipandpro/QuizMos/issues/230).

## What Changes

- Use the same question filters and matching rules in immediate and archived exam review.
- Keep original numbers in the picker and navigate only among questions matching the current filter.
- Capture flags in newly saved snapshots. Explain when a legacy snapshot lacks flag data.

## Capabilities

### Modified Capabilities

- `exam-history` gains question-level filters in archived review.

## Impact

Changes the review UI and the hashed snapshot payload. Existing summaries, Firestore Rules and indexes, grading, and ownership contracts remain in force.
