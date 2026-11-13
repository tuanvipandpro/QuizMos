# Design

## Context

See proposal.md for motivation. M1 already supplies owner-scoped repositories/stores, secure Exam IDs, canonical aliases and a v2 draft reader. `PracticeMode` currently updates local answers only; `ExamMode` finalizes through `finishExam` and `useExamArchive`. Existing profile ownership does not authorize new child collections. No notebook implementation exists.

## Goals / Non-Goals

**Goals:** implement CQ-NOTEBOOK-01–08 with the owner's confirmed Firebase synchronization and retained-reviewed mistake policy. Provide a stable selected-question boundary for #82.

**Non-Goals:** bulk history import, guest notebook migration, spaced scheduling (#85), authoring/reporting/PDF/membership, model calls or backend migration (#52). These artifacts implement no source or production policy.

## Decisions

### References and content

Use a SHA-256 entry key over schema version, canonical bank ID/question ID and a single-question rendering/scoring fingerprint. Private references instead include slot, immutable instance UUID and contentVersion. Normalize numeric IDs to strings, map order and multi-choice correct-key sets; retain statement/slot/template order. Compose existing `archivedQuestion`, `orderObjectKeys`, `contentHash` and `questionType` into a notebook-specific fingerprint without altering archive/guide hashes. Include MC instructions, which the current guide fingerprint does not include. Exclude explanations, arbitrary metadata and credentials. Persist reference metadata and user notes, not copied questions, selected answers or AI output.

Content changes produce a separate version entry. Old notes remain with changed/missing/replaced labels; never migrate them to a new slot occupant automatically. Resolve current questions through existing bank/custom source services and validators before study. Unsaved uploads lack a durable source: explain that the quiz must first be explicitly saved; do not force a cloud save or consume another slot. A provider-neutral Firebase UID preserves later safe account linking in #111.

### Storage and mutation protocol

Use `users/{uid}/notebookEntries/{entryKey}` plus `notebookState/quota`. Proposed named defaults for review: 500 entries/account, 2,000 Unicode code points and 8,000 UTF-8 bytes/note, query page size20. These are active storage bounds, not a claim about free-tier cost. No silent eviction. Entry fields include schema/ref, bookmark, note, mistake, reviewed, last wrong/review timestamps, revision and last operation ID/fingerprint; no guessed learning analytics.

Use online transactions and immutable commands with secure operation ID, expected entry revision and expected account generation. Create/update/delete couple to a count/revision state document. Delete physically removes the entry and increments account generation; an old command cannot recreate it even if its row revision is reused. A fresh action must read the new generation. Removing only one field preserves other data; removing the last empty state can delete its row atomically.

Matching current last-operation ID/fingerprint resolves a lost response without another write/count increment. If another operation has since advanced state, return conflict rather than claiming the old value is current or silently rebasing it. This avoids an unbounded receipt collection. The trade-off is that deletion invalidates pending commands for other rows too; preserve input and offer explicit refresh/retry. Mutation callbacks remain pure across SDK retries. Distinct concurrent edits serialize through expected revisions, not untrusted cross-device wall clocks.

### Capture and account orchestration

Pure utilities own reference validation and transitions; an injected repository owns SDK IO; an external store and hooks own requests/account epochs. Components render existing Ant Design controls/translations. Reuse `isAnswerComplete` and `isAnswerCorrect` for every format.

Practice capture occurs on new answer edits, with an additive session ID/answer revision and stable retry command; not on rendering, revisiting or restoring an old answer. An incorrect complete result sets mistake=true/reviewed=false. A later complete correct result updates an existing mistake to reviewed=true, preserving bookmark/note; correct-only answers create no row. Exam capture uses final eligible outcomes after submit/expiry under its stable attempt ID. New sessions started while enabled are eligible; pre-enable active/completed sessions are preserved without surprise backfill. Keep immutable archives and their deletion lifecycle independent.

Pending commands/note drafts stay account-scoped in the tab, carry their original expected versions and are not automatically rebound to a new UID/generation. Offline/denied/conflict states never claim Saved. Cancel/discard stale responses and show an empty new-account state on switching. Server authorization remains authoritative even when local storage/cache is unavailable.

### Queries, policy and cost

Use server-filtered pages ordered by updatedAt and document ID descending, with explicit bank/mistake/bookmark/review combinations. The implementation must enumerate legal combinations and supply covering composite indexes; validate review predicates as mistake-only. No whole-collection scan on a study render. Keep per-question reads bounded, load notes only for their tools/notebook route, and preserve existing note text while refreshing lists.

Supply a complete reconciled index configuration, including note-text index exemption and existing questions/payload exemptions; never publish a fragment or erase unrelated indexes. Explicit child Rules enforce non-anonymous owner access, typed/allowlisted fields, note bytes and coupled count/revision/generation transitions. Client validation adds canonical identity, source compatibility, code-point limits and scoring semantics. Rules cannot prove an educational outcome or grade opaque question content. Use expected source instance/version checks for private-source mutations.

### UI and revision selection

Add an account notebook entry and independent question bookmark/note tools; distinguish them from Save position and temporary Exam Flag. Render notes as plain text, not HTML or executable instructions. Keep primary floating navigation/Explain controls, predictable note-editor focus and active-Exam leave/continue guards. Filters, empty/loading/error/full/conflict states and changed-source notices must work without hover at320px, landscape, both locales/themes. Do not display notebook-derived correctness during a running Exam.

Selected references resolve to current authorized questions with explicit exclusions/zero-match feedback. A separate reference-set identity isolates revision drafts from full-bank sessions. #81 provides the selected-question study flow; #82 adds short-session presets without requiring them for initial notebook use.

## Risks / Trade-offs

- Concurrent/delete conflicts → preserve typed notes and require explicit refresh, not last-write-wins.
- Automatic capture cost → event-driven writes, deduplication, pagination and documented read/write fanout; no free-cost guarantee.
- Stale/changed sources → versioned references, no copied answers and truthful disabled study actions.
- Multi-question Exam capture is a sequence of per-entry transactions → retain a resumable per-question completion map under the attempt/account; partial failures expose retry, never duplicate successful rows or block result/history display.

## Migration Plan

Add a default-disabled notebook configuration; existing profiles, checkpoints, v2 drafts and archives keep their schemas. Use the real demo Rules emulator and network-isolated browser fixtures for routine acceptance. Document the query/index matrix and operational limits before release. Re-read/reconcile current production Rules/indexes, obtain separate publication/activation and bounded designated-account smoke authorization, then use protected M2 issue/release/develop/master delivery. Roll back the client flag first, retaining private data, compatible Rules and the v2 reader; older enabled bundles may remain active until reload.

## Verification Map

| Contract | Evidence required                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| 01,02    | Ownership/identity domain and SDK cases; aliases, reordered maps, source edits/deletion/slot reuse, account races         |
| 03,04    | Seven-format completion/correction/Exam terminal cases; independent note/bookmark state, failures preserving input        |
| 05,07    | Real SDK transactional quota/revision/generation, response-loss replay, deletion race and last-slot contention            |
| 06,08    | Filter/cursor/index coverage, isolated selection drafts, full UI matrix/keyboard/guards, disabled flag and rollout record |
