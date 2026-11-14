# Proposal

## Why

QuizMos currently uses generic 50–80-question, 60/120-minute Exam choices and a shared raw-accuracy benchmark above 80%, which do not describe each certification's published format or scoring. Issue [#82](https://github.com/tuanvipandpro/QuizMos/issues/82), refined by the owner's instruction to compare Exam with the actual certification, needs source-backed exam-format presets plus clearly labelled short/custom training.

## What Changes

- Introduce a curated certification-format registry keyed by stable quiz ID, with exam version/phase, exact/ranged/unknown question counts, answering duration, question formats, scoring basis, official links and review date. Prefer standard initial exams; distinguish renewals, beta versions, seat time and accommodations.
- Default the certification-format setup to verified per-cert parameters. For example, AIP-C01 is 75 questions/180 minutes, SAA-C03 is 65/130, and CTFL v4.0 is 40/60. Show published ranges as ranges, identify an app-selected count within a range, and expose partial/unverified profiles honestly.
- Keep full-bank Practice; add isolated random 10/20-question Practice, including the selected-reference Practice boundary from #81 once its PR is accepted into the M2 release. Mixed-cert revision remains training rather than a simulated certification Exam.
- Retain custom timed training as a clearly separate choice, with proposed integer limits of 1–min(100, available questions) and 1–180 minutes. The owner's certification-specific instruction supersedes these as the default Exam settings; these are app training limits, not vendor rules.
- Use supported, strictly gradable questions for new scored subsets and explain shortages/exclusions. Never repeat questions or silently shorten a verified exact-count format to fill a paper. Preserve all source IDs and leave bank content/aliases intact.
- Distinguish practice accuracy and the legacy QuizMos benchmark from certification outcomes. Publish scaled/weighted vendor thresholds as reference information; do not invent a raw-to-scaled conversion, question weights, unscored-item identities or a claim of official readiness. Preserve immutable History v1 calculations and clarify their labels rather than rescore them.
- Preserve account/source-version isolation, full-bank checkpoints, restored subset membership/order/options, Standard/Learning visibility, flags and absolute Exam deadlines. New setup choices apply to a separately started session; replacing a running draft requires confirmation.
- Apply existing tokens, translations and accessible controls at 320px through desktop/landscape, both themes/locales, including invalid input, empty/insufficient pools, pending dependencies and storage errors.

This is a planning-only change. It supplies no runtime registry, session implementation, data correction, Rules publication or deployment. All implementation tasks remain open.

## Capabilities

### New Capabilities

- `study-session-configuration`: Source-backed certification-format settings and bounded training sessions, with stable subset identity, truthful scoring presentation and compatible session restoration.

### Modified Capabilities

None. Existing profile ownership/child authorization is unchanged. #81's unmerged notebook capability is a dependency to integrate through its published boundary, not a reason to duplicate its implementation or alter its rollout gate.

## Impact

- Observed owners: `QuizMode.jsx` setup; duplicated query whitelists and draft routing in `App.jsx`; `studySession.js`/`useStudySession.js` selection/restoration; `PracticeMode.jsx` and `ExamMode.jsx` rendering; immutable History utilities/views; shared limits, translations and study styles.
- Add named configuration/domain helpers and focused orchestration hooks instead of adding unrelated logic to App. No dependency upgrade, backend migration, new Firebase collection or new History schema is proposed.
- The official-source comparison and current bank constraints are recorded in design.md. Some profiles are partial: AB-100 timing, CCAR-P/CCDV-F counts and CT-AI bank version remain unverified; Microsoft generally publishes variable counts. Such gaps must not become invented official defaults.
- Runtime validation will require `yarn verify`, relevant History/Notebook/session/format browser regressions and the full UI matrix. Planning checks establish artifact structure only. One #82 PR targets `work/release-m2-20261113`; merge, M2 production promotion and #81 policy/client activation remain separately controlled.
