## 1. Implementation and verification

- [x] 1.1 Add the Mock Exam action to Continue learning using existing navigation and responsive controls.
- [x] 1.2 Verify the entry point, existing exam settings, retired question handling and compatible draft recovery with local regression and browser checks.

## Local verification

| Scenario                                            | Evidence                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open setup from Continue learning                   | `continueLearningMockExam.spec.js` checks keyboard access, target bank, AIP-C01 preset and no new draft at setup entry. Chrome covers 320, 390, 412, 768 and 1280 px plus landscape across VN/EN and both themes. |
| Keep a compatible saved exam or confirm replacement | `bankDraftMigration.spec.js` verifies cancel, resume with the original question, answers, flag and deadline, and confirmed replacement without changing the Practice draft on desktop and phone.                  |
| Apply current settings and question eligibility     | `studySettings.spec.js` and `retiredExam.spec.js` verify certification/custom settings, retired-question exclusion for new exams, all-retired recovery and compatible draft resume.                               |
