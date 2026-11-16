## 1. Exam eligibility

- [x] 1.1 Filter retired questions from new exam selection while preserving draft compatibility.
- [x] 1.2 Show eligible counts and handle zero eligible questions in setup and direct navigation.
- [x] 1.3 Verify mixed, zero, unmarked and saved-draft scenarios with unit and browser tests.
- [x] 1.4 Run required local verification and record results.

After integration with M2, 333 unit tests, build, OpenSpec validation, formatting, and four focused browser regressions passed. Emulated 320/390/412/768/1280 layouts were checked across both languages and themes. Local `yarn verify` stops at six lint errors in the pre-existing ignored `worker/artifacts` bundle; lint passes when that bundle is excluded. Latest-head CI remains a separate merge gate.
