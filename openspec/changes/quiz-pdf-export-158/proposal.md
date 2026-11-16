# Proposal

## Why

Refs #158. Users need an offline/printable copy of a whole quiz. On 15 November 2026 the owner confirmed whole quizzes only, containing questions and answers without explanations or a selected-question mode.

## What Changes

- Add an accessible export action to an already-loaded quiz overview, with progress, cancellation and clear failure/retry states.
- Generate a downloadable PDF entirely in the browser, preserving original order/IDs and all seven question surfaces, embedded images, Unicode, bank title, pagination and a separate answer key.
- Preserve owner/source authorization and study state; do not fetch a new quiz through an export-only access path or include private notes, AI output or explanations.

## Capabilities

### New Capabilities

- `quiz-offline-export`: Authorized whole-quiz PDF generation and download with faithful questions/answer keys and bounded local processing.

### Modified Capabilities

None. Existing loaders, account ownership, study sessions and current public-bank access stay authoritative.

## Impact

A lazy browser PDF library/font bundle, pure export projection/layout, image/download IO service, orchestration hook, overview control and localized feedback. No external conversion server, backend/Rules change, AI call or paid dependency. #163 and #164 remain separate PRs; target accepted M2 release 712f873.
