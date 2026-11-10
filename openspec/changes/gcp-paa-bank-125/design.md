# Design

## Context

See proposal.md for motivation. Catalogs and update metadata are bundled; question JSON is loaded through the existing BASE_URL-aware loader. Multiple-choice already supports one or more correct option keys. Main specs contain only user-profile-access, which is unchanged. The new M2 release starts from accepted develop 24bb795; the active root dev server/worktree remains untouched.

## Goals / Non-Goals

Goals: review/import all 75 items as a public Google Cloud PAA bank, preserve IDs/answer mappings, source provenance and the existing study lifecycle.

Non-goals: new question types, provider/UI redesign, new session/storage contracts, official exam logistics/endorsement, live AI/account writes, Firebase publication or automatic merge/deployment.

## Decisions

1. Use gcp-paa, code PAA, name Professional Agentic Architect (PAA), provider Google Cloud, Professional level, public/quiz/Google/GCP_PAA.json. Include GCP-PAA/GCP_PAA search aliases for the supplied filename. The official certification page/guide establish identity; beta/GA dates, prices, labs and passing claims are not encoded.
2. Keep all 75 IDs and 68 single/7 multiple-answer arrays. Review every item; scope inaccurate guarantees, unsupported APIs and incomplete security premises to supported behavior, recording every changed field/reason and primary reference. Preserve the raw intake in ignored artifacts, maintained raw/published hashes and ID/answer digest in review metadata. Compare exact/normalized duplicate stems across existing banks.
3. Reuse existing registry/validators/renderers/hooks/services. No new rendering/orchestration/IO layer is needed. Existing cancellations, account draft keys, invalid-content handling and absolute-deadline behavior apply; test their bank-specific integration rather than modifying them.
4. Add a dated update and VN summary, retaining sourceRevision internally only. Record the reviewed data commit before metadata references it; WIP commits remain on the issue branch and final integration squashes one issue commit per policy.
5. Reuse catalog actions/tokens/styles. UI search find content navigation (UX) returned Keyboard Navigation (apply), Sticky Navigation (verify existing offset), Autocomplete (not needed; existing live filter is retained). Check long stems/explanations and focused catalog actions across existing accountCases plus 360px.

## Risks / Trade-offs

- Product names and preview features change: date the review and use primary references; do not assert unsupported deployment, medical/compliance, guarantee or model limitations as capabilities.
- Schema success does not validate answer accuracy: keep a per-question review record and deliberate content corrections; never silently omit or convert items.
- Bank/context/version changes can affect saved sessions: use a new canonical bank ID and preserve source IDs. Existing bank versions/drafts/checkpoints remain untouched.
- One bank expands catalog counts: derive tests from registry where appropriate and update purposeful fixed-count baselines only after reviewing the new expected content.

## Verification matrix

CQ-PAA-01: source/hash/ID/answer/duplicate review, strict schema/catalog and bank unit tests.
CQ-PAA-02: actual single/multiple Practice, both Exam modes, correct/partial answers, submitted read-only review, included reference without AI, reload/deadline/draft and existing load/cancellation regressions.
CQ-PAA-03: catalog/provider/search and update/deep-link/guard tests; 320/360/390/412/768/1280 and landscape, VN/EN, themes, touch/keyboard/focus and existing 44px controls; inspect rendered screenshots. Use fixtures and run yarn verify plus relevant E2E, then required latest-head CI. Record actual results/limitations in #125/PR.

## Migration Plan

One data PR into work/release-m2-20261110, followed only by requested checked release/develop/production promotion. Keep #125 open until publication/public smoke. Rollback removes the new bank/catalog/update entry without rewriting other question IDs or deleting account data. No private-data migration is introduced.

## Local acceptance results

- CQ-PAA-01: three bank-specific unit tests and catalog/format/provenance checks pass. Catalog contains 22 unique banks; physical JSON count is 23 because the unchanged legacy ACE alias file is retained.
- CQ-PAA-02/03: all 60 relevant desktop/phone E2E cases pass across gcpPaaBank (16), quizNotifications (18), accountWorkspace (18) and gh600Bank (8). Six app smoke cases also pass, including the updated 22-bank expectation and unchanged Google ACE alias.
- yarn verify passes all 260 Node tests, lint/format, pinned UI skill check, strict SDD/catalog validation, production build and fixture isolation.
- Geometry/keyboard/long-reference checks cover 320/360/390/412/768/1280 and 844x390, all VN/EN and theme combinations, reduced/default motion. Inspected rendered 320px VN/dark and 1280px EN/light long-reference screenshots. This is Chromium emulation, not physical Samsung verification.
- Initial harness assumptions were corrected to the existing contract: a single chosen answer is a scalar at runtime, and active exams hide option letters. A physical-file count assertion was updated from 22 to 23 after confirming the added bank. No assertion timeout/retry/coverage was relaxed. A PowerShell smoke-filter invocation was retried with literal quoting; all six intended cases then passed.

Disposable evidence stays under ignored artifacts/ (paa-regression, paa-smoke, verify-final.log). Hosted CI and delivery remain in #125/PR; no merge, production rollout, account write or live inference was performed.
