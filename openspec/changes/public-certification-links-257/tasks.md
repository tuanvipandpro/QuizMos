## 1. Data and access

- [x] 1.1 Implement link validation, atomic projection writes, owner isolation and bounded guest listing. Verify CQ-257-1 and CQ-257-2 with Node and Firestore emulator tests.
- [x] 1.2 Retire legacy public access and retain owner journal compatibility. Verify CQ-257-3 with emulator and journal regressions.

## 2. Experience and verification

- [x] 2.1 Implement localized publish, edit, remove and guest views. Verify CQ-257-1 through CQ-257-3 on desktop and phone with fixture-based browser tests.
- [x] 2.2 Run verification and record the rollout checks that remain pending.

## Evidence

| Requirement | Verification                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| CQ-257-1    | URL model tests, Firestore projection and invalid write tests, and desktop and phone guest visibility tests       |
| CQ-257-2    | Emulator ownership and revision tests and a two-tab browser test for a publish retry after removal                |
| CQ-257-3    | Legacy Firestore withdrawal and deletion tests and browser journal CRUD, plan linking and account isolation tests |

Local verification passed with 365 Node tests, 46 Firestore emulator tests, and 10 Chromium browser tests across desktop and phone. Production Rules reconciliation and the live owner/guest smoke remain pending. The production sharing flag is off.
