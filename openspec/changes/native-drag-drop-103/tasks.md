# Tasks

## 1. Domain contract

- [x] 1.1 Add distinct schema/structured grading and pure bank/assignment helpers; verify CQ-DD-01/02/03 with malformed schemas, copy/reuse/move/replace/cancel and unchanged-format fixtures, and document the mapping contract.
- [x] 1.2 Verify source intake without mutating it: all 19 native items and all 98 GH-600 questions validate, while original IDs/answer mappings/hash remain unchanged; record CQ-DD-01 evidence without importing the bank.

## 2. Native interaction

- [x] 2.1 Implement pointer capture/threshold/autoscroll and lifecycle cleanup with a focused hook; verify CQ-DD-02/04 by actual mouse/touch gestures, invalid targets, cancel, interrupted/read-only/question changes and no stale writes.
- [x] 2.2 Implement row/inline answer surfaces, keyboard/tap alternatives, clear/move, live feedback and both-theme/localized token styling; verify CQ-DD-02/03/06 with the full viewport/motion/focus/contrast matrix and inspect rendered screenshots.

## 3. Shared boundaries

- [x] 3.1 Add native examples/format guidance and copy/import/fingerprint/prompt support; verify CQ-DD-05 using pre-change prompt hashes, Worker input/quota fixtures, custom-model/Rules and draft/deadline/mode regressions without live AI or production writes.
- [x] 3.2 Coordinate the #80 snapshot/read-only native support in its own MR; verify CQ-DD-03/05 through a local shared integration and preserve archived grading/old formats without duplicating History here.

## 4. Review and delivery

- [x] 4.1 Run yarn verify and relevant E2E/Worker/Rules checks; update the requirement matrix, review the complete diff and redacted staged/all-outgoing scan, and publish one #103 native-format MR with actual results/limitations.
- [x] 4.2 After implementation/tests, request the user-named Astra independent review; resolve actionable findings and verify regressions, recording the final review outcome.
- [ ] 4.3 Integrate the accepted release baseline and dependencies, wait for required latest-head CI, and perform owner-requested merge/promotion plus applicable public native-question smoke before closing #103.

## Workflow follow-up

- Keep GH-600 bank import in #100. Sync/archive this capability only after accepted delivery; no production AI/account testing is implied by fixtures.
