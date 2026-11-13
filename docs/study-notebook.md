# Study notebook contract

Tracking: [#81](https://github.com/tuanvipandpro/QuizMos/issues/81), change `study-notebook-81`.

## Current implementation boundary

The domain, transactional repository/Rules, paginated query/index and account-store/hook layers are implemented. Capture, UI integration and rollout remain tracked tasks. The app does not yet mount the notebook hook; the configuration is disabled, and no production access is enabled by these modules.

## References and limits

`createNotebookReference` accepts an authenticated owner plus a current validated bank or owner-private quiz. References contain exactly `kind`, `quizId`, `slotId`, `instanceId`, `contentVersion`, `questionId` and `fingerprint`. They contain neither question text/answers nor generated/included explanations or arbitrary source metadata. Unsaved uploads are not durable sources. Canonical aliases include `aws-ace` → `gcp-ace`.

The SHA-256 key includes reference schema version1. Its rendering/scoring fingerprint reuses the archive allowlist, canonical map ordering, normalized question type/ID/optional text and MC correct-key sets; statement/slot order remains meaningful. MC instructions are included. Guide/archive fingerprints and the v2 local draft format are not changed. Private instance/version identity prevents slot reuse from owning old notes. Changing content produces a different reference; source resolution is a later layer.

Named limits are 500 entries/account, 20 entries/page, 2,000 Unicode code points and 8,000 UTF-8 bytes/note, 1,024 UTF-8 bytes/question ID, and 12 KiB per normalized entry envelope. Notes retain whitespace/plain text exactly; malformed surrogate strings are rejected. Rules bound reference fields and note bytes/code points; the client additionally validates the normalized envelope. These numbers do not establish free-tier cost or current deployment.

## Normalized entry fields

An entry contains `schemaVersion`, `entryKey`, `ref`, indexed `sourceGroup`, the state fields below, `revision`, `lastOperationId`, `lastOperationFingerprint`, `createdAt` and `updatedAt`. Keys/fingerprints are64-character lowercase hashes. Revision is positive; operation IDs use the shared UUID syntax. Domain timestamps are integer milliseconds; the IO layer must normalize server timestamps and stamp persisted times authoritatively. Unknown fields, incoherent keys/groups, impossible state and oversized envelopes are rejected by the client boundary. Rules cannot be assumed to recompute keys or grade source questions.

State fields: `bookmarked`, `note`, `mistake`, `reviewed`, `lastWrongAt`, `lastReviewedAt`. A complete wrong answer sets mistake/unreviewed; correct review retains the mistake and note/bookmark. A later wrong answer reopens review and retains the previous successful-review timestamp. Correct-only answers create no row. Partial or ungradable legacy input supplies no final outcome. Explicit removal returns no state; clearing one field preserves other content. No timestamp controls concurrency ordering; that belongs to expected revisions/generations in the repository.

## Transaction and retry protocol

`createNotebookCommand` binds owner, complete versioned reference/key, secure operation UUID, expected row revision, expected account generation and the exact change into a SHA-256 fingerprint. Prepare once and retain unchanged across retry. The injected repository never silently rebases stale commands. Every actual row mutation atomically changes the quota's count/revision, last-entry/operation markers and authoritative server timestamp. Deletes also increment account generation, including deletion caused by clearing the last saved field. The quota is not deletable. There is no receipt collection that grows with past operations.

A matching current operation marker/fingerprint resolves a lost response without another mutation; a different body or intervening edit produces conflict. Deletion invalidates older commands for every row, even if a deleted row is later recreated at revision1. Only an explicit fresh action based on a new read may recreate it. Correct-only missing rows and removing already-absent state produce no write. SDK retries retain the same expectations; a concurrent quota winner can be retried only after a server-confirmed revision change, without weakening permission denial.

Persisted timestamps use server transforms; unchanged timestamps retain their exact original Firestore precision. DTOs use floored milliseconds for rendering/validation, never for concurrency. A save reports committed rather than inventing a server-confirmed timestamp; the account layer must reload before claiming synchronized UI state.

Private-source creation and outcome capture recheck the current owner slot's instance/version and question fingerprint in the transaction. Existing notes/bookmarks remain editable and deletable after source loss; neither deletion nor a note-only edit requires resurrecting its source. Rules enforce private instance/version for new rows and learning-state changes. Source resolution before study is still required. Historical references to a removed bank remain valid references; creating a new reference requires a known current bank. Rules cannot recompute SHA-256, fetch public banks or certify grades; these are client/domain checks, not server guarantees.

Local SDK tests exercise owner/other-account/guest/anonymous denial, direct forged and uncoupled writes, Unicode and field bounds, concurrent duplicates, lost responses, stale edits, deletion/recreation, private source replacement/removal and last-slot contention. No real project or production Rules are touched.

## Queries, indexes and cost

Filters are additive: optional exact `sourceGroup`, mistakes-only, bookmarks-only and review status. A review status requires mistakes-only. There are16 legal predicate combinations: each row below with either no source filter or one source filter.

| Mistakes | Bookmarks | Review status |
| -------- | --------- | ------------- |
| No       | No        | All           |
| No       | Yes       | All           |
| Yes      | No        | All           |
| Yes      | No        | Pending       |
| Yes      | No        | Reviewed      |
| Yes      | Yes       | All           |
| Yes      | Yes       | Pending       |
| Yes      | Yes       | Reviewed      |

`listPage` uses server equality predicates, `updatedAt DESC`, document ID DESC and limit20. Cursors preserve the server timestamp's seconds/nanoseconds and ID; flooring timestamps for display must not collapse distinct cursor positions. No-predicate queries use the automatic descending single-field index; the other shapes require11 unique composite indexes because pending/reviewed use the same index fields. Unit tests enumerate coverage; real SDK tests check all16 predicate combinations and pages containing equal timestamps and distinct microsecond timestamps within one millisecond. The emulator does not enforce production composite-index readiness.

`firebase/firestore.notebook.indexes.json` is the complete **tracked-policy candidate**, preserving both the original custom-quiz question exemption and M1 history payload exemption, plus the new note-text exemption. It is not a live-policy export or publication instruction. Before publication, reconcile current production indexes/exemptions with this candidate and verify all required indexes are ready; preserve unrelated live configuration. Do not publish a fragment or enable the client based on emulator index results alone.

A page reads at most20 entry documents (including their notes); loading another page is explicit. A coherent editor read uses two documents: entry and quota. A mutation transaction reads those two plus one current private-source document when creating/capturing a private outcome, then writes at most entry+quota. A correct-only missing outcome has no writes. Confirmation reloads the editor context; transaction retries and list refreshes add reads. All writes serialize through the account quota and sustained multi-device capture may contend. No whole-account scan runs on question rendering. There is no free-tier cost guarantee.

The account store checks quota revision before/after each page. Appending requires the same original page revision, not just the latest editor quota; a changed collection requires explicit list refresh. A page costs up to20 entry reads plus two quota reads. The store does not drain the whole collection. Another account or a newer list/editor request invalidates late responses. Mutation completion cannot report success for the new account.

## Pending edits and account changes

`useStudyNotebook` owns one store for App and shares it through props. Activation performs no cloud read by itself. Editors read on demand, and a save reloads the coherent context before claiming synchronization. An intervening operation produces conflict instead of a false Saved status. Typing during a save retains the newer text as unsaved after the original command finishes.

Pending text/commands use the tab's optional `sessionStorage`, under a separate UID key. Recovery preserves original expected revision/generation and operation UUID/fingerprint; opening or switching accounts never auto-submits or silently rebinds them. A pending recovered command is treated as having an unknown response and can be retried unchanged. Explicit editor refresh clears that old command, reads current server state and preserves typed text for review and a separate Save action. Conflict cannot use automatic retry. Network/permission retry reuses exactly the original command, even if the user has since typed a different note; that new text remains unsaved for a later action.

Draft recovery accepts at most500 pending rows and12 KiB of editable text per row, allowing over-limit note input to survive validation failure. Inputs beyond that local recovery bound remain in memory and report storage unavailable; there is no silent truncation. Storage denial/quota errors do not block answering/navigation or pretend that tab recovery succeeded. One corrupt local row does not discard other valid pending input. Notes/commands never leave the account's notebook mutation path or appear in logs, AI prompts or public exports.
