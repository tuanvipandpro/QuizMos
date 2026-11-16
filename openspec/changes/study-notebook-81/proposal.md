# Proposal

## Why

Practice feedback and submitted-exam filters currently disappear outside their tab/session. Learners need an account-synchronized notebook of mistakes, bookmarks and notes. [#81](https://github.com/tuanvipandpro/QuizMos/issues/81) is the first M2 foundation for later revision sessions in #82.

## What Changes

- Add a private Firebase notebook keyed by stable question/version references, using the existing Google sign-in and Firebase UID. The owner confirmed cloud synchronization and retention of mistakes after successful review.
- Capture complete wrong Practice answers and final submitted/expired Exam outcomes. Partial answers never become final mistakes; later correct review marks an existing mistake reviewed without deleting it, its bookmark or its note.
- Add independent bookmark/note editing, bank/state/review filters and a selected-question study entry point compatible with later #82 presets.
- Add explicit descendant Rules, bounded transactional storage, query indexes, retry/conflict feedback and a default-disabled rollout switch. Keep notes private and outside AI prompts/logs.
- Preserve quiz IDs/aliases, existing checkpoints/drafts, immutable archives and Exam visibility/deadline behavior. A deleted/replaced source retains its notebook note with a truthful unavailable-source state.

The existing M1 history/identity infrastructure is accepted. Notebook code, Rules, UI, deployment and real acceptance are not implemented by these planning artifacts. Docker #117, reporting #83, editor #84, PDF #158 and M5 membership/AI are separate issue PRs. No old archives/drafts are bulk imported, no guest notebook is silently uploaded, and no new provider or paid service is selected.

## Capabilities

### New Capabilities

- `study-notebook`: Private, version-aware question mistakes, reviewed state, bookmarks, notes, synchronization and revision selection.

### Modified Capabilities

None. Existing `user-profile-access` ownership and explicit-descendant authorization remain intact; the new capability supplies its own child policy.

## Impact

Extend Practice/Exam orchestration through focused capture hooks, add domain/reference utilities and injected repository/store services, and add notebook/question-tool UI using existing Ant Design/translations/tokens. Reuse `isAnswerComplete`/`isAnswerCorrect`, canonical quiz aliases, secure IDs and hashing utilities; do not change scorer or archive payloads.

New Firestore collections and complete index reconciliation require emulator verification and separately authorized publication before client enablement. Proposed bounded defaults and concurrency behavior are specified in design; this proposal performs no production operation or AI call.
