# Tasks

## 1. Domain and identity

- [x] 1.1 Add versioned reference/fingerprint and limit validators for CQ-NOTEBOOK-02/07; verify seven formats, aliases, reordered maps, MC instructions, changed content/private slot reuse and note/envelope boundaries in unit tests; document the proposed limits and wire fields.
- [x] 1.2 Add pure mistake/review/bookmark/note transitions for CQ-NOTEBOOK-03/04; prove partial answers create no mistakes, correct review retains notes/bookmarks, later wrong answers reopen review and correct-only answers create no row.

## 2. Enforced persistence

- [x] 2.1 Implement the injected online repository and explicit child Rules for CQ-NOTEBOOK-01/05/07; verify real demo SDK ownership, anonymous/other-user denial, UTF-8/field bounds, coupled quota/revision/generation writes, last-slot races, response loss and delete/recreate/stale-command races; document conflict and retry semantics alongside the code.
- [x] 2.2 Implement paginated query/filter builders and a complete reconciled index candidate for CQ-NOTEBOOK-06/07; enumerate legal filter combinations and test index coverage, cursor ordering and query limits; document read/write fanout and preserve existing exemptions without production publication.

## 3. Account state and capture

- [x] 3.1 Add store/hooks and account-scoped pending edits for CQ-NOTEBOOK-01/04/05; verify offline/denied/conflict/response-loss feedback, preserved note input, late responses after account changes and no automatic rebinding to a new owner/generation.
- [ ] 3.2 Wire eligible future Practice edits and terminal Exam capture for CQ-NOTEBOOK-03/08 using stable session/event identities; test all formats, StrictMode/reload deduplication, no old-draft/archive backfill, partial multi-question failures, correct review and unchanged scoring/flags/mode/deadline/history behavior; document capture eligibility.

## 4. Notebook and revision UI

- [ ] 4.1 Build the guarded notebook entry and independent question bookmark/note controls for CQ-NOTEBOOK-04/08; use the UI/UX skill and verify the full 320px/landscape/desktop, VN/EN, light/dark, keyboard/focus and loading/empty/error/full/conflict matrix without exposing correctness during an active Exam.
- [ ] 4.2 Build filtering and selected-question study for CQ-NOTEBOOK-02/06; verify mixed changed/missing/unauthorized sources, zero matches, preserved notes and isolated revision/full-bank drafts; document the #82 integration boundary and test existing navigation/checkpoint/Exam guards.

## 5. Integration and rollout

- [ ] 5.1 Update the requirement-to-test matrix and run yarn verify, relevant real demo Rules/SDK and browser regressions; inspect disabled/enabled build isolation, scan/review the final issue PR and pass latest-head CI, recording actual failures/limitations rather than treating the plan as implementation.
- [ ] 5.2 After separately authorized current-policy/index reconciliation and publication, enable the client through protected M2 promotion and perform a freshly bounded designated-account sync/review/note/conflict/delete smoke; verify production CI/publication and cleanup before accepted issue closure. Record rollback retaining private entries and the v2 reader.

## Workflow follow-up

- Keep this issue's implementation in one M2 PR and one final issue squash; planning completion checks no implementation task.
- Sync/archive the specification only after actual feature acceptance. Other M2 issues and M5 deferred work retain separate PRs and gates.
