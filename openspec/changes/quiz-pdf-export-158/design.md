# Design

## Context

Refs #158. The owner selected whole quizzes with questions and answers only; no explanations or selected-question mode. App.jsx resolves public, tab-upload and owned cloud quizzes before overview rendering. QuestionModel owns seven-format validation/parts/answer formatting. Current banks include up to 557 questions and AZ-900 has 265 images, so a small arbitrary image cap would exclude an existing bank.

## Goals / Non-Goals

Client-side downloadable PDF with faithful original ordering/IDs, Unicode, images and aligned answer keys. No external converter/private upload, AI call, scoring mutation, active-Exam export or new membership entitlement. Archived results and explanations are excluded.

## Decisions

Lazy-load pinned pdfmake 0.2.23 and bundled Roboto font VFS, using the official browser/download and document-definition APIs. Pure utilities project the allowed fields and build a paginated document; services own image IO/generation/download; a hook owns source/UID cancellation and UI state. A dedicated local worker builds/renders the document with bundled fonts so large layouts do not block cancellation; terminate it on cancellation, owner/source changes, completion or errors. Reuse current plain-text question/part formatters, preserving inline templates/code whitespace and treating question text as text, never HTML. Use dedicated question headers, breakable body/choice blocks and an answer-key section keyed by original IDs. Mark legacy missing/invalid answer keys unavailable rather than inventing or excluding questions.

Export only already-loaded authorized sources: current public catalog banks, current-account cloud quizzes and owner-scoped tab uploads. No export-specific quiz fetch or ownership bypass. Use an explicit offline-export permission gate; denied access must precede image/library work. Membership is not yet implemented (#157); future restricted-content delivery must supply the shared server-confirmed read/export policy before offline access is enabled. Client gating is not an authorization replacement.

Use 1,000 questions, 5 MiB of projected source text, 500 unique images, 2 MiB compressed per image and 40 MiB normalized total image budgets. The catalog inventory fits the count/text/image-count limits. Fetch at most three images concurrently with credentials omitted, bounded timeouts and cancellation; allow same-origin HTTP/relative assets or HTTPS/data image URLs, reject other protocols. Decode browser-supported images, rasterize to bounded PNG and embed locally. Fail with a bounded useful error if an image cannot be embedded; never silently drop it or download a partial file.

Snapshot only export fields and bind work to the current source ID/version/fingerprint and owner. Cancel/close/source/account changes suppress stale progress/downloads, revoke object URLs and never persist private export content. Preserve drafts, checkpoints, exam deadlines and Notebook notes; export stays on overview. Errors allow retry with retained source, and duplicate starts are blocked.

## Risks / Trade-offs

Large image banks may fail CORS or processing budgets; report this clearly rather than fetching through an external proxy. Worker termination stops layout on cancellation; an already-delivered stale result still cannot download. Roboto is embedded for EN/VN; render PDFs to verify glyphs, long text/code, images, table-like content, pagination and all seven answer mappings. Source schema validation does not establish factual answer accuracy.

## Verification

Unit-test source rights, ownership/denial, immutable projection, all seven formats/legacy answer markers, limits/filenames and layout identity. Fixture-only browser-test actual downloads, progress/cancel/errors, account/source races and session integrity; extract and render generated PDFs with bundled Python/Poppler tools and visually inspect. Run yarn verify, representative source/privacy/navigation regressions, root artifact checks, redacted scans and latest-head CI. No real-account writes or backend/Rules publication.

## Migration Plan

Own #158 PR targets accepted M2 release 712f873 and final squash/cleanup follow Git process. Existing deploy flow remains; rollback removes export controls without changing saved data. Protected delivery acceptance remains separate.

## Open Questions

None for requested scope; whole quiz, questions and answers only is confirmed. Membership entitlement policy itself remains #157 work and must not be invented here.
