# Design

## Context

See proposal.md for motivation and the owner's certification-specific direction. At release baseline `079c644`, `QuizMode.jsx` owns generic selectors; App repeats count/time whitelists. `studySession.js` shuffles a whole source, stores selected Exam questions/options and a source signature, and restores v2 drafts through `useStudySession`. Practice uses the full source and an owner/source key. History v1 accepts at most 100 questions from one bank/custom source and freezes the raw grading version and `passed` benchmark. Its Rules enforce that benchmark above 80%; it is not an official certificate result.

PR #162 (`ad99106`) supplies a reference-set Practice boundary but is not merged into this release. It maps original questions to source quizzes, including duplicate question IDs across banks, and isolates notebook drafts. It must be integrated through the accepted release before #82 changes that boundary; do not copy #81 into this PR.

## Goals / Non-Goals

**Goals:** implement CQ-SESSION-01–09 with a small registry, shared settings/pool utilities and compatible local session orchestration. Treat certification format as sourced metadata, not a claim that an unreviewed bank reproduces a real exam.

**Non-Goals:** mixed-cert Exam/History schema, official psychometric scoring, invented point/domain weights, hidden unscored-item assignments, certification booking/labs/proctoring, content/answer corrections, automatic syllabus migration, new cloud policy or AI calls. Existing full-bank Practice remains independent. Custom training limits are app limits rather than exam facts.

## Decisions

### 1. Curated profiles with field-level evidence

Use a shared data module keyed by canonical quiz ID. Each profile records its exam code/version/phase, reviewed date, sources, exact/range/unknown count with evidence quality, answering minutes, published response types, scoring basis and known effective/sunset dates. A profile revision is separate from question content identity. Do not fetch certification websites during setup or build; review metadata explicitly when refreshing it.

Prefer the standard initial exam and GA information applicable on the review date. Renewal/beta data, administrative seat time and approved extra time are separate fields/variants, never silently combined. VN UI does not establish exam language or accommodation eligibility. Unknown fields remain null; do not inherit a family-wide number as if it were exam-specific.

Observed source comparison, reviewed **14 November 2026**, follows. Values below are facts/reference limitations for the future registry, not implemented defaults. A raw practice percentage cannot establish vendor pass/fail from these thresholds.

| Stable quiz ID / current code     | Published questions                               | Answering minutes | Scoring reference and qualification                                                                                                                  | Primary source                                                    |
| --------------------------------- | ------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| anthropic-cca-f / CCAR-F          | 60                                                | 120               | 720 scaled on 100–1,000; 135-minute seat time is not answering time                                                                                  | [Academy CCAR-F][ccarf], [FAQ][anthropic-faq]                     |
| anthropic-ccar-p / CCAR-P         | Not verified in accessible primary count metadata | 120               | FAQ confirms timing/720 scaled for all four; do not infer 60 or 63 from other sites                                                                  | [Program][anthropic-program], [FAQ][anthropic-faq]                |
| anthropic-ccao-f / CCAO-F         | 60                                                | 120               | 720 scaled, separate Associate credential                                                                                                            | [Academy CCAO-F][ccaof]                                           |
| anthropic-ccdv-f / CCDV-F         | Not verified in accessible primary count metadata | 120               | Same FAQ timing/scale, distinct credential                                                                                                           | [Program][anthropic-program], [FAQ][anthropic-faq]                |
| gcp-ace / ACE                     | 50–60                                             | 120               | Numeric score/threshold not supplied for reconstruction; renewal is a different exam                                                                 | [ACE][ace], [score FAQ][gcp-score]                                |
| gcp-paa / PAA                     | 50–60                                             | 120               | This is Part 1; separate hands-on labs remain required for certification                                                                             | [PAA][paa]                                                        |
| gcp-pca / PCA                     | 50–60                                             | 120               | Includes case-study structure; not reproduced by untagged random selection                                                                           | [PCA][pca]                                                        |
| gcp-pcd / PCD                     | 50–60                                             | 120               | Standard exam; do not use renewal information                                                                                                        | [PCD][pcd]                                                        |
| gcp-pcde / PDE                    | 40–50                                             | 120               | Preserve existing PDE/PCDE aliases                                                                                                                   | [PDE][pde]                                                        |
| gcp-gal / GAL                     | 50–60                                             | 90                | Bank has 56 rows: 50 can fit the range, 60 cannot currently be drawn without repeats                                                                 | [GAL][gal]                                                        |
| az-900 / AZ-900                   | Not fixed on exam page                            | 45                | Microsoft general guidance says most exams have 40–60, not an AZ-900 fixed count; 700 is scaled                                                      | [AZ-900][az900], [general format][ms-format], [scoring][ms-score] |
| gh-300 / GH-300                   | Not verified as a fixed exam-specific count       | 100               | Study guide says 700; do not convert it to 70% raw                                                                                                   | [GH-300][gh300], [guide][gh300-guide]                             |
| gh-600 / GH-600                   | Not verified as a fixed exam-specific count       | 120               | GitHub-maintained credential; 700 reference, interactive components possible                                                                         | [GH-600][gh600], [guide][gh600-guide]                             |
| ab-100 / AB-100                   | Not verified                                      | Not verified      | Official pages identify the exam but observed content does not substantiate a per-exam duration; family 100/120-minute guidance is not a replacement | [AB-100][ab100], [general format][ms-format]                      |
| ai-103 / AI-103                   | Not verified as a fixed exam-specific count       | 120               | May contain interactive components; Microsoft scaled score is not raw accuracy                                                                       | [AI-103][ai103], [scoring][ms-score]                              |
| aws-saa / SAA-C03                 | 65 (50 scored + 15 unscored)                      | 130               | 720 scaled on 100–1,000; unscored identities are not published                                                                                       | [overview][saa], [guide][saa-guide]                               |
| aws-dva / DVA-C02                 | 65 (50 + 15)                                      | 130               | 720 scaled; DVA-C02 delivery ends 30 November 2026, C03 starts 1 December; do not relabel this bank                                                  | [C02 guide][dva2], [transition][dva-transition]                   |
| aws-dea / DEA-C01                 | 65 (50 + 15)                                      | 130               | 720 scaled                                                                                                                                           | [overview][dea], [guide][dea-guide]                               |
| aws-aip-c01 / AIP-C01             | 75 (65 + 10)                                      | 180               | 750 scaled; beta/other-exam 85-question references are not this GA format                                                                            | [overview][aip], [guide][aip-guide]                               |
| istqb-ctfl-v4-0 / CTFL v4.0       | 40                                                | 60                | 26/40 points; optional +25% follows provider eligibility, not UI locale                                                                              | [CTFL][ctfl], [current tables][istqb-tables]                      |
| istqb-ct-ai / CT-AI               | 40, version not confirmed for this bank           | 60                | v1: 31/47 points; v2: 29/44. Both versions exist on review date; bank has no version/point fields                                                    | [v1][ctai1], [v2][ctai2], [tables][istqb-tables]                  |
| istqb-ctal-ta-v4-0 / CTAL-TA v4.0 | 45                                                | 120               | 51/78 weighted points; bank has only 42 rows and no point fields                                                                                     | [CTAL-TA][ctal], [tables][istqb-tables]                           |

Anthropic's Academy text was available through indexed official results; direct access was restricted by robots. Pearson confirms the four credential identities. Third-party counts were deliberately not promoted to verified facts. ISTQB's currently linked table is v1.21 dated 9 November 2026; the earlier v1.17 table was cross-checked rather than treated as current.

Implementation can fill missing facts only after checking an appropriate primary source and version. Partial profiles can offer explicitly labelled training with verified timing information; they cannot claim a fully verified fixed official paper. No registration, personal account or paid source access is needed for the proposed runtime.

### 2. Honest modes, validation and selection

Use three concepts in shared configuration: full/quick Practice, certification-format Exam, and custom timed training. Preserve existing Standard/Learning feedback IDs. A certification-format session defaults to Standard; Learning uses the same chosen timing/count only with a training label. Overriding a format switches its label to custom training instead of presenting altered settings as official.

For verified exact counts, require that count and answering duration. For a verified range, propose the lower published bound as the app-selected default and show both the published range and the actual selection. This is a proposed app choice, not a newly discovered fixed official count. A partial/unknown profile has no fabricated official default; training is still available. Known version/sunset status stays visible; after an announced exam version ceases delivery, keep its bank for legacy training without automatically switching its content/version.

Proposed custom limits are finite integers: count 1 through min(100, available eligible questions), time 1–180 minutes. Keep existing 50/60/70/80 and 60/120 training choices; add practical 10/20 counts and short time choices. These configurable app limits are separate from trusted profile facts, so a later verified exam duration must not be silently clamped to a custom-training maximum.

Use the shared validator/question-type helpers to enumerate an eligible scored pool without changing source content. For certification format, additionally respect substantiated response types. The read-only inventory found: PCA 277/279 strictly gradable, PCD 357/359, AZ-900 209/472, SAA 528/529 and DVA 549/557. The CCAR-P bank has 116 MC items plus five yes/no and five dropdown questions although the official FAQ describes MC/multiple-response; those ten are not evidence of that official response format. Other catalog banks passed per-question strict validation. This is schema/format eligibility only, not a factual/domain review. Preserve legacy questions in full-bank Practice and report exclusions for new scored subsets.

Never silently truncate an exact paper, repeat a question, invent missing items or infer domain weights from unreviewed tags. CTAL-TA therefore cannot currently offer a full 45-question paper. Show why, and offer available training. GCP GAL can draw 50 unique eligible questions; selecting 60 reports the shortage. Zero eligible items cannot start a scored subset. All 22 catalog entries retain IDs, provider grouping and aliases.

### 3. Draft and pool identity

Put named presets/profile definitions in data/config; validation and sampling in pure utilities; local persistence in services; setup/pool orchestration in hooks. Keep App to routing and dependency injection. Centralize parsing so QuizMode and App do not enforce different whitelists.

Reuse the existing without-replacement selection and option-shuffle behavior, with injected randomness for deterministic tests. Resolve a subset once when starting a run and persist its ordered identities before treating it as resumable. Reload/render never resamples it. A separately confirmed new short session can replace its preset draft and draw again.

Keep the full-bank Practice key and cloud checkpoint meaning unchanged. A short-session identity includes owner, canonical bank/private instance+contentVersion or notebook reference-set identity, source fingerprint, mode/preset and the selected membership/order. Store a versioned subset manifest in a separate bounded preset slot, with a secure run identity; avoid accumulating a new storage key on every render/click. Original question IDs remain unchanged, with notebook entry/source keys disambiguating duplicate IDs. Reject stale manifests on source content/version change and explain the restart instead of mapping them to a new slot occupant. Prefer explicit generation/fresh-run identity over cross-device wall clocks; preserve the existing older-start-link protection.

For an eligible subset drawn from a bank, keep the original full-source signature/source metadata for History validation and carry the selection separately. `createHistoryAttempt` currently verifies that selected questions are authentic members of that full source; do not pass a filtered source signature and accidentally break archival. New short Practice never writes a full-bank checkpoint; hide or clearly disable that action in the short flow. Existing full-bank checkpoint/resume and guide-question links stay full-bank links.

### 4. Resume, scoring and History compatibility

A compatible running Exam resumes its stored snapshot/settings and absolute deadline, even if setup/query/profile data changed. Validate replacement settings only for a genuinely new run. Cancel replacement leaves the old run untouched; confirm starts a new identity once. New direct URLs with explicit legacy-valid count/time retain those choices as training; missing new settings use the verified profile only for a new run. Invalid settings do not silently repair a running session. Short Practice keys remain separate from the current one-Exam-per-source draft.

Freeze a small settings/profile revision snapshot in new local session metadata so result reload does not reinterpret its setup using a later registry. Do not add fields to exact History v1 envelopes or change its immutable grading version/boolean. History already retains selected questions, actual question count, timing and original grade. Its views must call that old boolean a **QuizMos study benchmark**, not an official cert result; source metadata shown later must not pretend to be attempt-time profile evidence. Existing Standard/Learning, flags, score counts, expiry locking and archive/delete receipts remain unchanged.

Show raw practice accuracy separately from published vendor criteria. Scaled AWS/Anthropic/Microsoft thresholds are not raw percentages. Google does not provide the numerical score required to reconstruct official passing. CT-AI/CTAL-TA weights are absent from current bank records, and CT-AI version is unconfirmed. Do not convert scales, manufacture weights/unscored masks or treat the existing >80% benchmark as an official outcome. Correct-answer semantics and v1 arithmetic stay intact; this proposal changes misleading presentation and setup, not past grades. A future genuine scoring model would require its own reviewed data/versioned History contract.

### 5. Notebook, UI and delivery boundary

After #162 is accepted into M2, consume its current-reference questions/source array and manifest identity. Add All/10/20 Practice choices against the executable filtered pool. Keep per-question source mapping, notebook capture eligibility/gate, source exclusions and notes; mixed-cert selections do not become a single-cert Exam/History source. Until that dependency is accepted, base-bank work can proceed but the notebook task stays open; never import #81 commits into this PR as duplicate issue work.

Reuse Ant Design/tokens/translations and the local UI skill. Use visible labelled count/time fields, accessible small non-virtualized option lists and inline retained-input errors. Show published values/ranges, actual selection, source/review status and missing-question reasons without exposing internal hashes. Keep touch targets at least 44 CSS px, keyboard dialog focus, 320/390/412/768/1280px plus landscape, both languages/themes and the primary study dock/timer. No header redesign is bundled; #163 remains separate.

## Risks / Trade-offs

- Official facts change or sources are incomplete → dated/versioned field evidence, partial profiles and explicit legacy/custom labels; no runtime scraping or guesses.
- Correct count/time could be mistaken for authentic content/domain/scoring coverage → clear format-only scope and no official pass/readiness prediction.
- Filtered or mixed pools could corrupt source identity/checkpoints/archives → original source signatures, reference-aware manifests and separate Practice slots; no mixed-source Exam schema.
- New settings or profile changes could reset a timer/draft → saved-run precedence, explicit replacement confirmation and absolute-deadline regressions.
- Tab storage fails → ongoing in-memory study remains usable, recovery failure is visible and no persisted/resumable claim is made without confirmation.

## Migration Plan

Plan only now. Implement base settings/metadata in this issue branch, then integrate the accepted #81 boundary after its release merge and recheck overlap in App/Practice/Exam. Additive local metadata retains the v2 reader; no cloud migration/publication or new History schema is intended. Run domain/source-evidence and legacy-draft tests, `yarn verify`, relevant browser regressions and the complete UI matrix. Use fixtures/emulators and no live AI/account writes. If implementation proves a cloud schema change necessary, stop and revise this plan before changing policy.

Keep one #82 PR to the M2 release, one final issue squash and current-head CI. Merge only on request; production uses accepted release → develop → master and retains #81's separate activation gate. Close only after accepted scope and delivery checks. Rollback retains data/readers and can hide new setup controls while already-created runs keep their snapshots/deadlines; never rescore archives or silently reinterpret a subset as a full-bank draft.

## Verification Map

| Contract | Planned meaningful evidence                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01,02    | Registry field/source/version assertions; exact/ranged/partial/retired profiles; distinct cert/training labels and Standard/Learning                       |
| 03       | Empty/small/insufficient pools, CTAL 42/45, GAL 56/60, strict gradability/format exclusions, malformed URL/form values                                     |
| 04,05    | Seeded random selection across seven formats; alias/owner/private-slot isolation; refresh/resume/new-run/Back; flags/options and absolute deadlines        |
| 06       | Scaled/undisclosed/weighted reference display; unchanged v1 payload hashes/grades/receipts; no official pass from raw accuracy                             |
| 07       | Accepted #81 adapter, duplicate IDs across sources, changed/missing/unauthorized references, zero matches and disabled zero-IO gate                        |
| 08,09    | Full locale/theme/viewport/focus/state matrix; checkpoints/guide links and existing History/Notebook regressions; latest CI, scans and protected promotion |

[ccarf]: https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification
[ccaof]: https://anthropic-partners.skilljar.com/claude-certified-associate-foundations-certification
[anthropic-faq]: https://anthropic-partners.skilljar.com/page/faq-certifications
[anthropic-program]: https://www.pearsonvue.com/us/en/anthropic.html
[ace]: https://cloud.google.com/learn/certification/cloud-engineer
[paa]: https://cloud.google.com/learn/certification/agentic-architect
[pca]: https://cloud.google.com/learn/certification/cloud-architect
[pcd]: https://cloud.google.com/learn/certification/cloud-developer
[pde]: https://cloud.google.com/learn/certification/data-engineer
[gal]: https://cloud.google.com/learn/certification/generative-ai-leader
[gcp-score]: https://support.google.com/cloud-certification/answer/9438208?hl=en
[az900]: https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/
[gh300]: https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/
[gh300-guide]: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-300
[gh600]: https://learn.microsoft.com/en-us/credentials/certifications/agentic-ai-developer/
[gh600-guide]: https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600
[ab100]: https://learn.microsoft.com/en-us/credentials/certifications/exams/ab-100/
[ai103]: https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-apps-and-agents-developer-associate/
[ms-format]: https://learn.microsoft.com/en-us/credentials/support/exam-duration-exam-experience
[ms-score]: https://learn.microsoft.com/certifications/exam-scoring-reports
[saa]: https://aws.amazon.com/certification/certified-solutions-architect-associate/
[saa-guide]: https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html
[dva2]: https://docs.aws.amazon.com/aws-certification/latest/developer-associate-02/developer-associate-02.html
[dva-transition]: https://aws.amazon.com/blogs/training-and-certification/september-2026-new-offerings/
[dea]: https://aws.amazon.com/certification/certified-data-engineer-associate/
[dea-guide]: https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html
[aip]: https://aws.amazon.com/certification/certified-generative-ai-developer-professional/
[aip-guide]: https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01.html
[ctfl]: https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/
[ctai1]: https://istqb.org/certifications/certified-tester-ai-testing-ct-ai-retiring/
[ctai2]: https://istqb.org/certifications/certified-tester-ai-testing-ct-ai/
[ctal]: https://istqb.org/certifications/certified-tester-advanced-level-test-analyst/
[istqb-tables]: https://istqb.org/?download_id=3832&sdm_process_download=1
