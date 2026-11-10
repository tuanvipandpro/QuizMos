# M1 release handoff

Tracking: [#87](https://github.com/tuanvipandpro/QuizMos/issues/87), [M1](https://github.com/tuanvipandpro/QuizMos/milestone/1). Nine delivery issues plus coordination retain separate original PRs. Code integration does not close delivery issues before their production acceptance.

## History and promotion

[Merge policy #107](https://github.com/tuanvipandpro/QuizMos/pull/107), tracked by #106, defines one final issue squash commit, delayed issue-branch cleanup and one production PR per milestone. The original `work/release-m1-20261106` contains earlier merge commits and is retained as an audit source. Reconstruct a clean successor release from accepted develop with one commit per issue, including original PR/issue references. Verify the complete tree against the accepted issue results plus the governance baseline; do not rewrite the original release or protected history.

Promote the checked clean release into protected develop preserving its issue commits (GitHub merge-commit fallback); wait post-merge CI, then remove only unchanged issue branches whose recorded squash commits reached develop. Keep release/develop/master branches. Existing production PR [#101](https://github.com/tuanvipandpro/QuizMos/pull/101) is updated to the full M1 release notes after develop promotion. This work does not merge master.

## Issue/PR content

| Issue | Original PR                                               | Delivered code / content                                                                                                              |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| #74   | [#89](https://github.com/tuanvipandpro/QuizMos/pull/89)   | Study-dock observer lifecycle correction and navigation/resize/StrictMode regressions                                                 |
| #77   | [#90](https://github.com/tuanvipandpro/QuizMos/pull/90)   | Included explanations without AI/key/quota IO; generation remains explicit                                                            |
| #75   | [#91](https://github.com/tuanvipandpro/QuizMos/pull/91)   | Readonly Google Profile, device-local settings, Manage quizzes, reviewed update feed and native-hash Cancel                           |
| #78   | [#93](https://github.com/tuanvipandpro/QuizMos/pull/93)   | Four study guides reviewed against all 554 current IDs; bank answers unchanged; #96 remains separate                                  |
| #103  | [#104](https://github.com/tuanvipandpro/QuizMos/pull/104) | Distinct native drag/drop rows/inline, mouse/touch/keyboard/tap, reusable bank choices, safe lifecycle, examples and shared contracts |
| #100  | [#105](https://github.com/tuanvipandpro/QuizMos/pull/105) | Reviewed GH-600 bank: 98 questions, 19 native items, dated update entry and accessible catalog controls                               |
| #79   | [#94](https://github.com/tuanvipandpro/QuizMos/pull/94)   | Observed policy provenance, index candidate and SDK tests; no production publication                                                  |
| #80   | [#92](https://github.com/tuanvipandpro/QuizMos/pull/92)   | Private Exam archive/dashboard/review/delete, immutable native snapshots, atomic policy and indexes; client defaults off              |
| #53   | [#95](https://github.com/tuanvipandpro/QuizMos/pull/95)   | Eight-case offline v6 quality pack covering seven surfaces, Worker boundary regressions and historical rollout reconciliation         |
| #87   | [#88](https://github.com/tuanvipandpro/QuizMos/pull/88)   | This coordination handoff                                                                                                             |

The promotion PR records the exact issue/PR-to-clean-commit mapping, candidate tree comparison and latest verification. Use its live checks and linked issue evidence for current branch/rollout status rather than treating historical counts as a new-head pass.

## Verification evidence

The complete proposed integration passed 252 Node tests, 29 real demo Rules/SDK tests, 18 local Worker/D1 cases, production build/fixture isolation and Worker dry-run. Its initial full browser run had 300 passes, two intentional phone skips and two catalog-smoke failures (old count/loading); the corrected 21-bank assertion and focused reruns passed both failed cases. Final native suite: 26 passes; joint History suite: 32 passes. Current original issue PR checks passed before requested integration. Recheck the clean release and actual develop/production-PR heads before delivery; do not report the earlier full local run as clean.

User-requested Astra read the full runtime integration and found no actionable issues. Review covered routes/menu/styles, native interaction, owner isolation, drafts/deadlines, archive persistence/grading, explanation IO and deployment routing. Both history/native fixture-leak guards remain enforced.

UI checks use Chromium emulation at 320/390/412/768/1280 plus landscape, VN/EN, themes/focus/motion and 44px controls. Narrow dark/Vietnamese and desktop light/English GH-600 catalog screenshots were inspected; physical-device acceptance is not claimed.

## Bank provenance

[GH-600 review](gh-600-bank.md) and [field/hash manifest](gh-600-review.json) record all 32 corrected question objects. Every original question ID, option key and marked-answer mapping is retained. Astra read all questions/templates and ten distinct original exhibits; q11/q58 obsolete exhibits are replaced by complete text. Remaining 18 image references were reviewed; all 13 original URLs returned HTTP200 during intake QA. Future CDN availability remains external. Original intake SHA-256 is `66e8286a485b1b37f4dc80d3666edd9e4956bac1ea45da47160d8be9e1cb03cf`; published hashes are LF-normalized for Windows/Linux portability. This is not an official answer-key endorsement.

## Remaining production gates

- Keep History disabled until the compatible complete Rules/index candidate is published and designated-account save/reload/read/delete smoke is authorized and verified. Code/index candidates in Git do not establish deployed production policy.
- App AI activation already shipped historically. Real wider v6 quality task 3.3 remains open; the revised offline pack does not claim live output quality. A fresh designated account and at most eight explicitly authorized staging attempts are required. CPU-boundary work remains owner-deferred. No model/quota/paid fallback change.
- Production merge, post-merge CI/deploy and applicable public/account smoke precede issue closure. No routine test used production account data, published Firebase policy or real model inference.
- Practice keeps existing drafts/checkpoints. Storage migration #52 and Practice event/revision queues remain outside M1.
