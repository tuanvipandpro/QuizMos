# M1 delivery coordination

Tracking: [#87](https://github.com/tuanvipandpro/QuizMos/issues/87), [Milestone 1](https://github.com/tuanvipandpro/QuizMos/milestone/1). Git process: [#97](https://github.com/tuanvipandpro/QuizMos/issues/97). Handoff reconciled 2026-11-10 (Asia/Saigon).

M1 contains nine delivery issues plus coordination #87. Each issue keeps its own MR into `work/release-m1-20261106`; coordination MR #88 owns only this document. GH-600 intake #100 and its native-format dependency #103 extend the original seven-issue scope. No product feature has been merged by the governance work.

## Confirmed product scope

- Profile: read-only Google information and QuizMos language/theme settings. Identity/avatar editing is outside this MVP.
- History: Exam first, with 50 retained private attempts, paginated metadata, immutable scored snapshots and minimal disclosed anti-replay receipts. Practice retains its current drafts/checkpoints. The History client defaults off pending compatible policy/index release and designated-account acceptance.
- GH-600: retain all 98 supplied IDs/answers, including 19 native `drag_drop` questions. Native support is a distinct implementation; the owner rejected converting it to dropdown. Bank publication remains a separate content/data issue.
- App AI activation already shipped; wider v6 quality remains in M1. The CPU-boundary benchmark is owner-deferred, not passed or reinstated as a gate.
- Storage migration #52 and Practice event/revision queues remain outside M1.

## Branch and governance status

| Branch / MR                                                                     | Recorded state                                                        | Implication                                                          |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `master` at `648d9e1`                                                           | Protected production; accepts PRs only from same-repository `develop` | Current M1 issue MRs remain unmerged                                 |
| `develop` at `4578b5b`                                                          | Governance #99 merged; post-merge CI passed                           | Protected integration baseline                                       |
| `work/release-m1-20261106` at `4bac829`                                         | Explicitly approved baseline sync #102 merged; post-merge CI passed   | Native, History and coordination work can use actual release CI      |
| [#101](https://github.com/tuanvipandpro/QuizMos/pull/101), `develop` → `master` | Open; recorded required checks passed                                 | Production governance promotion still requires owner-requested merge |
| [#102](https://github.com/tuanvipandpro/QuizMos/pull/102), `develop` → release  | Merged with explicit approval                                         | Its permission did not include #101 or feature MRs                   |

Issue branches integrate into their dated milestone release, then accepted releases promote by PR release → `develop` → production. Use merge commits for shared-branch promotions. `master` and `develop` reject direct pushes, force pushes, deletion and bypass, including administrators; the single-maintainer policy retains PR/CI gates with zero independent required approvals. Production additionally requires `pr-source-policy`. The trusted protected-base routing guard becomes active in production when #101 is promoted.

Only default production pushes can deploy, after the existing component/artifact/migration gates. Release/develop CI does not deploy. See [Git process](git-process.md). Old repository URLs redirect to the canonical `tuanvipandpro/QuizMos`; the workspace folder remains `quiz-app`.

## Delivery issues and separate MRs

| Issue                                                       | MR                                                              | Implemented / prepared                                                                                                                                                    | Remaining acceptance                                                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [#74](https://github.com/tuanvipandpro/QuizMos/issues/74)   | [#89](https://github.com/tuanvipandpro/QuizMos/pull/89)         | Dock observer lifecycle corrected; local and prior-base checks passed                                                                                                     | Current release CI, requested merge/promotion and public dock smoke                                                             |
| [#77](https://github.com/tuanvipandpro/QuizMos/issues/77)   | [#90](https://github.com/tuanvipandpro/QuizMos/pull/90)         | Included references open without credential/quota/inference IO; AI generation remains explicit                                                                            | Integrate after #89, current CI, requested merge/promotion and reference-only smoke                                             |
| [#75](https://github.com/tuanvipandpro/QuizMos/issues/75)   | [#91](https://github.com/tuanvipandpro/QuizMos/pull/91)         | Profile, Manage quizzes, reviewed Quiz updates and native-hash Cancel fix                                                                                                 | Integrate after #90, current CI and account/public smoke                                                                        |
| [#80](https://github.com/tuanvipandpro/QuizMos/issues/80)   | [#92](https://github.com/tuanvipandpro/QuizMos/pull/92), draft  | Private archive/dashboard/review/delete and atomic policy; native slot projection and registry regressions added; issue verify 237, joint Rules 27 / History UI 32 passed | #89/#103 release integration, latest-head CI, complete policy/index publication and designated-account smoke; client stays off  |
| [#78](https://github.com/tuanvipandpro/QuizMos/issues/78)   | [#93](https://github.com/tuanvipandpro/QuizMos/pull/93)         | Four guides reviewed, all 554 current IDs mapped; bank answers unchanged                                                                                                  | Current release CI, requested merge/promotion and published guide/link smoke; #96 remains separate content follow-up            |
| [#79](https://github.com/tuanvipandpro/QuizMos/issues/79)   | [#94](https://github.com/tuanvipandpro/QuizMos/pull/94)         | Published parent-profile-only policy/index provenance reconciled; complete custom-quizzes candidate and SDK tests prepared                                                | Fresh drift check, explicit publication authorization and designated-account custom-quiz smoke                                  |
| [#53](https://github.com/tuanvipandpro/QuizMos/issues/53)   | [#95](https://github.com/tuanvipandpro/QuizMos/pull/95), draft  | One retained v6 output reviewed; eight missing-case samples/protocol prepared                                                                                             | Current CI, current account/eight-attempt staging authorization and actual quality findings; CPU remains deferred               |
| [#103](https://github.com/tuanvipandpro/QuizMos/issues/103) | [#104](https://github.com/tuanvipandpro/QuizMos/pull/104), open | Native rows/inline choice bank, mouse/touch/keyboard/tap, mapping grading, lifecycle cleanup, examples, Worker/custom envelope support                                    | Current-head CI, requested issue integration/promotion and public native smoke; local integration and final Astra review passed |
| [#100](https://github.com/tuanvipandpro/QuizMos/issues/100) | Not created                                                     | Identical ignored GH-600 intake retained; all 98 questions validate on native branch with unchanged SHA-256                                                               | Accept #103; review content/provenance/answer key, catalog/provider integration, own data MR and public-bank smoke              |

## Current continuation work

Native #103 is implemented in MR #104, ready for review. Local `yarn verify` passes 216 Node tests; Worker/D1 17, bundle dry-run, demo Rules 17 and final native E2E 26/26 pass. Astra found two issues (slot-boundary drops and transient selection across read-only changes); both were fixed with regressions and final review at 33413c1 has no remaining actionable findings. The broad earlier app run recorded 206 passes, four load/reload timeouts and two intentional phone skips; all four failures passed focused reruns without weakening assertions/timeouts. That earlier run is not claimed as clean.

Separate #80 projection changes in MR #92 pass issue-only verify with 237 tests. Local integration 34cc868 combines dock f3cf769, History projection df5c768 and the reviewed native changes: build/fixture isolation, 27 real demo Rules cases, 32 History E2E cases and 32 focused archive/domain/build tests pass. All seven formats archive/replay in both modes on desktop and phone. Native OpenSpec is 8/9; History remains 8/11. Latest hosted checks are visible on each MR; source integration and production gates remain separate.

GH-600 source is 211827 bytes, 98 unique IDs and SHA-256 `66e8286a485b1b37f4dc80d3666edd9e4956bac1ea45da47160d8be9e1cb03cf`: 61 multiple choice, 10 yes/no, eight dropdown and 19 native drag/drop. Literal `${{ github.ref }}` / `${{ needs.plan.outputs.risk }}` expressions remain source text. q-51 appears to repeat a YAML job/key/executor block; review it in #100 without silently changing supplied answers. No bank file/catalog registration has been published.

History's earlier verified integration was `599a5ec` with dock foundation `f3cf769`: 220 Node, 27 real SDK/Rules and 32 History UI passes. The earlier full app run had 200 passes, 24 loading timeouts and two intentional skips; all 24 failed cases passed a focused unchanged serial rerun. Keep this historical evidence separate from new-head/native integration and hosted CI. #92's issue-only diff does not duplicate #74 or #103.

## Dependency and acceptance order

Governance #99/#102 is complete at the integration layer; #101 remains separate. Within M1, land #89 before #90 → #91 and before enabled History acceptance. Native #104 is independently reviewable; integrate it before #92's final native archive acceptance and before GH-600 #100. #93/#94 can progress independently; reconcile #75 navigation and the complete custom/history Rules candidates in their own issues. #95 requires real quality acceptance.

Pending policy/designated-account and at-most-eight staging AI requests remain pending. Do not publish Firebase policies, enable History or run live inference from routine local tests. The #79 custom-only candidate and History's extra policy/indexes have different rollout scopes. Preserve account isolation, IDs/aliases, per-instance versions, draft deadlines and private anti-replay receipts.

An issue MR merged into the release is integration. Keep issues open until the accepted scope, owner-requested protected promotions, post-merge CI/deploy and applicable public/designated-account smoke pass. Local fixtures/emulators do not replace production persistence or model-quality evidence. #87 owns coordination and does not close the nine delivery issues.

## Coordination verification

This MR changes only this maintained document. Verify formatting, local links, issue/MR mapping and current branch facts, scan outgoing commits and wait for latest-head release CI. UI evidence remains in the per-issue ignored/CI artifacts; emulation is not physical-device evidence.
