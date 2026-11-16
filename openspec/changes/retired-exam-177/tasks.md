## 1. Exam eligibility

- [x] 1.1 Filter retired questions from new exam selection while preserving draft compatibility.
- [x] 1.2 Show eligible counts and handle zero eligible questions in setup and direct navigation.
- [x] 1.3 Verify mixed, zero, unmarked and saved-draft scenarios with unit and browser tests.
- [ ] 1.4 Run required verification and record results.

Unit tests and desktop/phone browser regressions passed. Local `yarn verify` stops at six lint errors in the pre-existing ignored `worker/artifacts` bundle; lint passes when that bundle is excluded. CI remains pending.
