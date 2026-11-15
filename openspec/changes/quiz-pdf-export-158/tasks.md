# Tasks

## 1. Projection and document rendering

- [x] 1.1 Implement the authorized immutable whole-quiz projection, limits, filenames and faithful seven-format answer layout for PDF-01/02/03; verify meaningful unit fixtures, Unicode/code/image layout and document current/future access boundaries.
- [x] 1.2 Implement lazy local PDF/font generation, bounded image IO and safe download for PDF-02/03; browser-test actual files, errors/budgets and cancellation, render/extract PDFs and visually verify pagination, glyphs and answer alignment; document dependency/license and image limitations.

## 2. Export interaction and acceptance

- [x] 2.1 Add accessible overview export controls and orchestration for PDF-04; browser-test progress, duplicate suppression, retry, cancel and account/source changes with unchanged study data in the responsive locale/theme matrix; document behavior.
- [x] 2.2 Run yarn verify, relevant seven-format/access/session regressions, root build isolation and redacted staged/outgoing scans; pass latest-head CI and prepare the separate #158 PR into M2.
- [ ] 2.3 After owner-requested protected promotion, verify post-merge/public export acceptance before closing #158.

## Workflow follow-up

- Preserve one final issue squash and delayed cleanup; archive only after accepted delivery.
