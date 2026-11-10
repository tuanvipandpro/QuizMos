# Proposal

## Why

Tracking: #110. Quiz updates are currently a standalone library button/page displaying implementation commit hashes. Users need a reachable header notification surface and a genuine way to obtain the current public quiz list without losing study state.

## What Changes

- Replace the library Quiz updates button with a click/keyboard header bell/dropdown, public content dates and device-local read badges.
- Retain #/updates and footer discovery, but remove public commit hashes/links; reviewed provenance stays in data/docs.
- Add a public Quiz Bank refresh action: verify a fresh app document first, then reload the current same-origin app while preserving filter, tab drafts, checkpoints and absolute deadlines. Failure leaves the current view intact; stale/aborted refresh cannot interrupt another route/account.

## Capabilities

### New Capabilities

- public-quiz-notifications: header discovery/read state and safe explicit refresh of bundled public quiz data.

### Modified Capabilities

None in main specs. The earlier in-flight account-and-quiz-updates-75 artifacts describe the previous source-hash presentation; this user request supersedes that visible presentation while retaining its internal provenance contract.

## Impact

AppHeader/QuizLibrary/QuizUpdatesPage, public update preference service and refresh hook/service, translations/shared responsive header styles, targeted unit/browser tests. No auth provider, bank content, backend API, Firebase Rules or AI call changes. GitHub login is backlog #111/M2 only.
