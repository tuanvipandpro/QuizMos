# Design

## Decision

Share the existing Exam results filter labels and matching rules. Archived review uses its stored `complete` and `correct` outcomes. An incomplete structured answer is unanswered, like in immediate review. The archived picker and Previous/Next use the same list of original indices. Changing the filter selects its first matching question.

Store zero-based `flags` only inside the immutable snapshot JSON payload. Preserve the existing summary and envelope. Validate uniqueness and bounds and serialize flags in ascending order. Missing flags distinguish older archives from new archives with an empty flag list.

When the same already-archived result is saved again, permit equivalence across formats if everything except optional flags matches. Return the already-saved receipt and snapshot without altering them. Different answers, results, or conflicting saved flag sets remain conflicts.

## Rollout

The updated reader accepts prior snapshots. Tabs running the earlier reader need a refresh to review newly written snapshots containing flags. Keep the tolerant reader in any rollback after new flagged snapshots have been saved.

## Verification

| Scenario                                         | Evidence                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| Frozen filtering and original question numbering | Browser checks with correct, incorrect, incomplete and flagged questions   |
| Old archives and empty selections                | Browser checks for no flags after capture and missing flags in legacy data |
| Immutable payload and owner-scoped retry         | Snapshot unit tests, repository emulator scenarios, and browser capture    |
| Responsive filter and keyboard access            | English and Vietnamese checks on phone and desktop in both themes          |
