# Tasks

## 1. Evidence and domain configuration

- [ ] 1.1 Implement the canonical certification-profile registry and validators for CQ-SESSION-01/02/06 from the dated primary-source matrix; recheck time-sensitive sources, test exact/ranged/partial/retiring profiles and keep unknown fields unverified; document provenance, format-only limits, seat-time/accommodation separation and the absence of raw-to-scaled conversion.
- [ ] 1.2 Implement shared mode/count/time parsing, strict eligible-pool checks and sampling for CQ-SESSION-02/03/04; test integer/non-finite/URL boundaries, zero/small pools, CTAL 42/45, GAL 56/60, format exclusions, no duplicates and deterministic selection across seven formats; document named custom-training limits separately from vendor facts.

## 2. Isolated drafts and timed lifecycle

- [ ] 2.1 Add versioned subset manifests and orchestration for CQ-SESSION-04/05/08; test owner/alias/private-instance/version/notebook-reference identities, stable membership/order on reload, explicit resampling, bounded preset slots, corrupt/unavailable storage and untouched full-bank drafts/checkpoints; document recovery and invalidation behavior.
- [ ] 2.2 Wire new Exam settings/profile snapshots and eligible selection against the original full-source signature for CQ-SESSION-03/05/06; test legacy direct URLs, saved-setting precedence, cancel/confirm replacement, older start links, exact shuffle/options/flags, deadline expiry and valid immutable History v1 creation; document additive v2 compatibility without changing the History wire schema.

## 3. Setup and Practice UI

- [ ] 3.1 Build source-backed cert-format versus custom-training setup for CQ-SESSION-01/02/03/08 using the UI/UX skill; browser-test published ranges/unknowns, actual selected values, insufficient/retired profiles, validation retaining input, Standard/Learning labels and keyboard focus in the required viewport/locale/theme matrix; document any local-skill fallback and checked states.
- [ ] 3.2 Add All/10/20 bank/private Practice routing and controls for CQ-SESSION-02/04/05/08; browser-test new/resume/reset/Back, small/empty pools, full-bank/guide links and checkpoint isolation, owner changes and all formats without introducing a timer to Practice; verify readable responsive states and document session-key behavior.

## 4. Score presentation and Notebook integration

- [ ] 4.1 Present raw practice accuracy and vendor criteria honestly for CQ-SESSION-06; verify scaled/undisclosed/weighted examples cannot produce an official cert pass, History v1 payload hashes/answers/grades/receipts remain unchanged and benchmark labels are localized/accessible in live and archived results; document the distinction from attempt-time certification evidence.
- [ ] 4.2 After #162 is accepted into the M2 release through the owner-requested merge flow, synchronize that accepted baseline and add short Notebook Practice for CQ-SESSION-04/07/08; verify source arrays/duplicate original IDs, changed/missing/unauthorized exclusions, zero/insufficient matches, isolated drafts, unchanged notes/capture semantics and disabled zero-IO gating; keep the task open while the dependency is absent and document the boundary without importing duplicate #81 work.

## 5. Integration and delivery

- [ ] 5.1 Update the requirement-to-test matrix and run yarn verify plus relevant settings/History/Notebook/navigation/checkpoint/seven-format browser regressions and the full UI state matrix for CQ-SESSION-01–09; inspect production artifact isolation, review final issue scope, run redacted staged/all-outgoing secret scans and pass latest-head CI before review-ready delivery; use no real-account writes or live AI inference.
- [ ] 5.2 After owner-requested protected issue/M2 promotions, verify post-merge/current production CI and a read-only public setup/resume/profile smoke for CQ-SESSION-09, recording actual enabled behavior and rollback compatibility; preserve #81's separate publication/activation gate and keep #82 open until accepted delivery evidence is complete.

## Workflow follow-up

- One #82 PR targets the M2 release and produces one final issue squash. Planning completion checks no implementation task and authorizes no merge or rollout.
- Synchronize/archive the delta only after actual acceptance; retain partial-profile evidence and immutable data/readers on rollback. Other M2 issues and #163 keep separate scopes/PRs.
