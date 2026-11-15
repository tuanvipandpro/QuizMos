# Whole-quiz PDF export

Refs #158. The owner confirmed whole quiz, questions and answers only. Export is available on the loaded overview, never the active Exam surface. No explanations, private notes, generated AI content or scores are included. Question order/IDs, choices, instructions, inline templates, part IDs and original answer keys are retained across all seven surfaces. Legacy unavailable keys are explicitly marked unavailable; questions are not dropped or repaired.

## Authorization and privacy

The control consumes the existing authorized source; it does not fetch another quiz. Public catalog banks, current-account saved quizzes and owner-scoped tab uploads use the existing loader/Rules boundary. The generator also requires explicit read/offlineExport permission and rejects unknown sources or ownership mismatch before image/library work. Membership #157 is not implemented: this is not a new membership entitlement or a replacement for server authorization. Future restricted delivery must wire the shared server-confirmed read/offline-export policy before granting that capability. Unit denial tests exercise the explicit permission gate; no production membership access is claimed.

Jobs are bound to owner/source ID, version and fingerprint. Source/account changes, modal cancellation or unmount abort image work and terminate the render worker. Only a current job can create a download. Sensitive modal content stays within the guarded source subtree and is keyed by source/owner, avoiding orphaned private portals during navigation/auth changes. No export content is stored in local/session storage or uploaded to a conversion server. Temporary image object URLs are revoked; download URLs are revoked after the browser consumes them.

## Rendering and budgets

Pinned pdfmake 0.2.23 and its bundled Roboto 3.014 VFS load only through the export worker. The document is built locally with an A4 layout, embedded Unicode fonts, sensible margins, page numbers and a separate answer key. Long paragraphs/templates remain breakable. Image aspect ratios are retained and small rasters are not upscaled. No HTML execution or remote font loading occurs.

Limits: 1,000 questions; 5 MiB projected source; 500 unique images; 2 MiB compressed per image; 40 MiB normalized PNG data; longest image edge 1,600 pixels and decoded image area <=16 million pixels. Fetches run at most three concurrently, with credentials omitted, no referrer and a 15-second request/decode timeout; layout has a two-minute worker timeout. Only same-origin HTTP/relative assets, HTTPS or image data URLs are accepted. All current catalog banks fit count/text/image-count limits (AZ-900 has 265 images); this does not establish remote CORS access or factual correctness.

Inaccessible/oversized/undecodable images fail the entire export with a bounded retryable message; they are never silently omitted and no partial PDF is downloaded. There is no external proxy fallback. Network/content problems may require fixing the source image access. Cancel remains responsive during large layouts because the worker can be terminated.

## Dependency notices

pdfmake's MIT notice and the Roboto upstream OFL-1.1 notice are published under public/licenses. Embedded font metadata identifies Roboto 3.014 (2025), Copyright 2011 The Roboto Project Authors; upstream: https://github.com/googlefonts/roboto-3-classic. Library source/API: https://github.com/bpampuch/pdfmake/tree/0.2.23 and https://pdfmake.github.io/docs/0.1/getting-started/client-side/. No paid dependency or external converter is used.

## Verification matrix

| Requirement              | Evidence                                                                                                                                                                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF-01 fidelity          | quizPdf.test.js seven-format projection/answer identity, exclusions, legacy markers; actual mixed-format download text extraction and rendered pages                                                                              |
| PDF-02 access            | unit explicit permission and wrong-owner/anonymous denials; browser own-private/cross-account and stale download checks; no export-only quiz fetch                                                                                |
| PDF-03 layout/resources  | actual Unicode/image/long-text/inline PDF download; retry/limit/worker-error browsers, local pypdf extraction and PDFium rendering; limits fail without truncation                                                                |
| PDF-04 interaction/state | 25 passing browser cases (9 project/viewport mismatches skipped), including locale/theme/width/focus/44px controls, progress, duplicate prevention, image/render cancellation, source/account guards and unchanged draft/deadline |

Local QA generated and rendered a mixed seven-format PDF, checked Vietnamese text and all original IDs in both question and answer sections, embedded images and explanation exclusion. Images/PDFs remain ignored in artifacts/pdf-qa-final; they are test evidence, not published study content. Browser coverage is local installed Chrome/phone emulation, not physical-device testing. Whole-project checks/current-head CI and protected delivery remain tracked in the change tasks. No Firebase publication, real-account write or live AI call is part of this work.

Whole-project verification passed 313 unit tests, lint/format, strict OpenSpec validation, catalog and production-root build isolation. A compiled-root smoke downloaded a seven-format PDF through the hashed local worker (33,905 bytes) with remote requests blocked. Current-head CI remains required before review readiness; delivery task 2.3 remains owner-gated.

Cold-start acceptance: CI traces exposed duplicate sibling keys and a late worker dependency re-optimization reload. The exporter now has its own prefixed React key and Vite pre-bundles its two worker dependencies at startup. Positive download tests reject duplicate-key console errors and assert zero main-frame navigation. The full 25-case suite and an explicit --force cold optimizer run (first mixed-format download plus existing-draft preservation) passed after this fix. The cancellation guard remains strict; a genuine source/account change still stops work.
