# Spec Delta

## Purpose

Provide a private, account-synchronized collection of question mistakes, review progress, bookmarks and notes without changing exam results or existing study state.

## ADDED Requirements

### Requirement: CQ-NOTEBOOK-01 Account ownership

The system SHALL synchronize notebook data under the signed-in non-anonymous Firebase UID, using the existing Google sign-in. Guests SHALL receive a sign-in explanation. Account changes SHALL discard stale responses without exposing another owner's content.

#### Scenario: Two clients and another account

- **WHEN** Alice saves a note and opens her notebook on another signed-in client
- **THEN** the note is available after server confirmation, while Bob and guests cannot read or mutate it

#### Scenario: Account changes during a request

- **WHEN** an Alice read/save completes after switching to Bob
- **THEN** it cannot populate Bob's UI or report an Alice mutation as Bob's successful save

### Requirement: CQ-NOTEBOOK-02 Stable content references

The system SHALL identify entries by canonical quiz/question identity and rendering/scoring version. Private references SHALL include instance and content version rather than only a reusable slot. Changed or unavailable sources SHALL retain notes and offer truthful study availability.

#### Scenario: Alias and reordered maps

- **WHEN** an unchanged question is opened through an alias or map properties arrive in a different order
- **THEN** the same entry is used without changing quiz IDs, notes or stored study state

#### Scenario: Replaced source

- **WHEN** a question changes or a private slot is deleted/reused
- **THEN** the old note remains associated with its original version and cannot open the replacement as if it were the old question

### Requirement: CQ-NOTEBOOK-03 Mistakes and successful review

The system SHALL capture complete wrong Practice answers and final Exam outcomes across all seven supported surfaces. Later complete correct review SHALL mark an existing mistake reviewed while retaining the entry, bookmark and note. A subsequent accepted wrong answer SHALL reopen its review state.

#### Scenario: Incomplete and corrected answers

- **WHEN** a user partially answers a structured/multiple-choice question, then completes it incorrectly and later correctly
- **THEN** the partial answer creates no mistake, the complete wrong answer creates one, and correct review retains it with reviewed status

#### Scenario: Exam visibility and old sessions

- **WHEN** an Exam is running, or an old completed draft/archive is reopened after notebook enablement
- **THEN** no new notebook grading status is exposed or backfilled; only eligible future terminal Exam outcomes are captured

### Requirement: CQ-NOTEBOOK-04 Independent edits

The system SHALL allow explicit bookmark and note edits independently of checkpoints, Exam flags and mistake status. Removing a bookmark SHALL preserve a mistake/note. Conflicting or failed saves SHALL retain editable input and SHALL NOT claim synchronization.

#### Scenario: Notes survive review and failure

- **WHEN** a bookmarked mistake is reviewed correctly or its note save fails
- **THEN** the bookmark/note is retained and the UI distinguishes reviewed state from pending/failed synchronization

#### Scenario: Concurrent note edits

- **WHEN** two clients edit the same entry revision
- **THEN** a stale edit cannot silently overwrite the newer entry, and its input remains available for explicit resolution

### Requirement: CQ-NOTEBOOK-05 Retry and deletion safety

The system SHALL prevent response-loss retries and stale mutations from duplicating entries, consuming capacity twice or restoring intentionally deleted content. A fresh user action after deletion can recreate a reference; stale commands SHALL require refresh before reapplication.

#### Scenario: Lost response and delete race

- **WHEN** a committed save is retried, or an older queued edit arrives after deletion
- **THEN** it does not duplicate the save or recreate deleted content, and the UI reports current state or a recoverable conflict

### Requirement: CQ-NOTEBOOK-06 Filtering and selected revision

The system SHALL provide bank, mistake/bookmark and review-state filters with paginated results. Selected current authorized questions SHALL open a revision flow with original identities. Missing, changed or inaccessible sources SHALL be labelled and excluded from executable selection without discarding notes.

#### Scenario: Mixed selection

- **WHEN** a selection contains current, replaced and unavailable questions
- **THEN** the user sees which questions can be studied; no unrelated bank/source is substituted and zero valid matches has an explicit empty state

#### Scenario: Existing sessions

- **WHEN** a selected revision session is opened or resumed
- **THEN** full-bank drafts/checkpoints remain distinct and existing Exam mode, shuffle and absolute deadlines remain intact

### Requirement: CQ-NOTEBOOK-07 Enforced bounded storage

The system SHALL enforce explicit owner-scoped child authorization, allowlisted envelopes, note byte bounds and atomic capacity accounting. Client validation SHALL preserve supported content semantics; Rules SHALL NOT be represented as grading questions or certifying study outcomes.

#### Scenario: Capacity and forged operations

- **WHEN** concurrent creates contend for the last slot or a client forges an uncoupled counter/write
- **THEN** capacity is not exceeded and invalid writes are denied without silently evicting another entry

#### Scenario: Oversized or unavailable storage

- **WHEN** a note exceeds limits or storage is offline/denied
- **THEN** the UI retains input, explains the failure and preserves ongoing answers/navigation

### Requirement: CQ-NOTEBOOK-08 Accessible gated delivery

The system SHALL keep notebook capture/navigation disabled until compatible policy/index publication and client activation are verified. Enabled controls SHALL support VN/EN, both themes, keyboard and 320px layouts while preserving active-session guards and private data on rollback.

#### Scenario: Feature disabled or active Exam

- **WHEN** notebook configuration is disabled or navigation is attempted during an active Exam
- **THEN** no notebook capture occurs while disabled, and the existing leave/continue guard preserves the running Exam when enabled

#### Scenario: Rollback and privacy

- **WHEN** client enablement is rolled back
- **THEN** private entries are retained behind compatible Rules, and notes are not added to AI prompts, public exports or logs
