# Tasks

## 1. Domain contract and durable identity

- [x] 1.1 Add the focused history model/limits and immutable snapshot validation using the shared scorer; verify CQ-HISTORY-01 and CQ-HISTORY-04 with all formats, source eligibility, unknown legacy duration and archived grade/version cases, and document the schema/retention defaults.
- [x] 1.2 Add stable attempt/start/grading metadata to new sessions and additive active-draft restoration; unify every terminal path and verify CQ-HISTORY-02 with manual submit, expiry, late answers, refresh and StrictMode duplication while preserving old drafts/deadlines.

## 2. Repository and enforced policy

- [x] 2.1 Implement injected summary/snapshot/quota/receipt transactions and deletion; verify CQ-HISTORY-02 and CQ-HISTORY-03 through real demo-emulator SDK tests for idempotency, conflicting payload, lost response, Save/Delete/stale retry, owner/Bob/guest, forged pair/quota/receipt/reset writes and the fiftieth-slot race.
- [x] 2.2 Add explicit descendant Rules and complete-index reconciliation notes, with no profile-access regression; run baseline plus candidate Rules tests and verify snapshot payload rejection/index assumptions against the declared service contract.
- [x] 2.3 Add the account-scoped store/capture hook with disabled-by-default rollout setting; verify CQ-HISTORY-01 and CQ-HISTORY-05 source gating, zero Practice/guest/unsaved-upload writes, same-ID retry and discarded stale account responses in fixtures.

## 3. History and dashboard UI

- [x] 3.1 Build paginated summaries and per-bank retained-history statistics; verify CQ-HISTORY-06 stable order, full retained totals, aliases/instance grouping, empty/error/full states and source-status copy.
- [x] 3.2 Build read-only archived review and confirmed deletion, including the saved-quiz archive-retention disclosure; verify CQ-HISTORY-04 and CQ-HISTORY-06 changed/deleted source, missing images, slot reuse, cancel, failure and complete snapshot removal.
- [x] 3.3 Wire guarded History routes/account entry and result save/retry states; verify CQ-HISTORY-05 and CQ-HISTORY-06 with offline/permission/size/quota failures, active-exam navigation, account switches and the full UI matrix; document user-visible retention/local-only behavior and update the design matrix.

## 4. Integrate and release safely

- [x] 4.1 After accepted governance baseline #102, dock #89 and native format #103 are integrated on the release, update #92 against the current milestone release; run yarn verify, test:rules and E2E, inspect the disabled-client build for fixture leakage, review/secret-scan the #80 feature PR and wait for latest-head required CI, recording actual acceptance evidence.
- [x] 4.2 Use #79's reconciled baseline plus the new history policy/index contract; publish/verify compatible policy through the authorized release procedure before enabling history, and record source revisions/rollback rather than deploying a fragment.
- [x] 4.3 After owner-requested milestone promotion/enablement and production CI/deploy, perform bounded designated-account save/reload/read/delete smoke, confirm unrelated bank/custom progress remains compatible and close #80 only after actual rollout acceptance.

## Workflow follow-up

- Production acceptance on 12 November: #154 published `2fedfa0`; master CI 43066160064 and Pages 43067355218 passed and Chrome matched the verified artifact. The initial #150 map-order reset was corrected with constrained legacy migration; actual resume/reload retained the original clock, six answers and question position. Exactly one approved seven-question quiz and one 5/7 archive passed reload/deduplication, all seven frozen outcomes, source-deletion independence and scoped cleanup back to 0/3 quizzes and 0/50 archives. The non-content receipt remains by design; no earlier overwritten answers were claimed recovered. #80/#141/#150 were accepted only after these checks. AI quality remains separate. This completes 4.3; #155 reconciles this non-runtime status record.

- Earlier integration evidence: #92 entered the accepted M1 implementation; production source `dfc758b` passed master CI [42929142335](https://github.com/tuanvipandpro/QuizMos/actions/runs/42929142335). Local verification also passed 261 Node tests/build/isolation, 29 demo Rules/SDK cases and 32 History browser cases. #130/#132 supplied the reviewed exact-true build wiring. These results support 4.1; the subsequent policy recheck below supports 4.2. Activation/smoke under [#141](https://github.com/tuanvipandpro/QuizMos/issues/141) subsequently completed as recorded above.

- Policy recheck: on 11 November, authenticated Chrome Console showed the published starred revision `Yesterday • 10:42 PM`. The copied 11,193-character transcript SHA-256 is `f8e21f695c185439a9f6f69148fc5a164c5972eea6316b4151359e63de4a046c`, token-equivalent to current combined Rules; no raw management export/ruleset ID is claimed. Manual indexes remained empty; `customQuizzes.questions` and `examAttemptSnapshots.payload` had Collection Ascending/Descending/Arrays disabled and unchanged disabled Collection group defaults. This verified 4.2 before the subsequently completed activation. No policy mutation was performed.

- Sync/archive after feature acceptance. Practice history and M2 revision queues are separate changes using this stable result contract.
