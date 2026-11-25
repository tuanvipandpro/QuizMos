## Purpose

Give learners control over public links to their external certificates and badges while protecting the private exam journal.

## ADDED Requirements

### Requirement: CQ-257-1 Publish a credential link

A signed-in learner SHALL be able to paste an HTTPS certificate or badge URL and explicitly publish it for guests to see. Public entries SHALL contain only the URL and a publication timestamp.

#### Scenario: Publish and view

- **WHEN** an owner publishes a valid URL
- **THEN** guests can open the link from the community page immediately
- **AND** private results, notes, study targets and account identity remain private

#### Scenario: Invalid URL

- **WHEN** a learner enters a malformed URL, a non-HTTPS URL or one containing embedded credentials
- **THEN** the form retains its contents and explains what to correct
- **AND** Firestore rejects invalid direct writes

### Requirement: CQ-257-2 Manage published links

Only the owner SHALL be able to change or remove a published link. Edits and removals SHALL update the guest feed atomically. An interrupted save SHALL be retryable and a stale write SHALL preserve newer data.

#### Scenario: Edit or remove

- **WHEN** the owner saves an edit or confirms removal
- **THEN** a subsequent guest read shows the new link or omits the removed entry

#### Scenario: Concurrent or unauthorized changes

- **WHEN** a stale editor, another account or a guest tries to change a link
- **THEN** the current link remains available until its owner successfully changes it

#### Scenario: A publish retry arrives after removal

- **WHEN** an owner removes a link after a lost publish response and the original publish is retried
- **THEN** the old link stays removed

### Requirement: CQ-257-3 Preserve the private certification journal

Existing owner-only journal entries and their optional study-target links SHALL continue to work. The community UI SHALL serve credential links when sharing is enabled.

#### Scenario: Open the journal after rollout

- **WHEN** an owner opens the journal after the public sharing change
- **THEN** the owner can read, add, edit and delete private results independently of public links
- **AND** legacy shared outcome text stays outside the new public feed
