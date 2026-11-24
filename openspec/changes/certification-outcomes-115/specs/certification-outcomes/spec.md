## ADDED Requirements

### Requirement: Record private real certification outcomes

The app SHALL keep owner-only certification results with bank, date, result, optional private preparation notes and score scale, and an optional explicit roadmap link.

#### Scenario: Safely save or edit an outcome

- **WHEN** a learner saves valid input
- **THEN** only the matching owner and record version change
- **AND** existing study plans, drafts and mock results remain unchanged

#### Scenario: Recover from a write failure

- **WHEN** a write fails or its response is lost
- **THEN** the learner can retry without losing entered fields or duplicating a record

### Requirement: Publish a moderated public projection

The app SHALL only expose approved, explicitly previewed fields to public readers and label the result as self-reported.

#### Scenario: Send, review and withdraw

- **WHEN** a learner confirms preview and a different authorized moderator approves
- **THEN** the public projection becomes readable without private fields
- **AND** owner withdrawal or moderator removal makes it unavailable atomically

#### Scenario: Omit private content

- **WHEN** a moderator or public reader accesses the feature
- **THEN** private notes, score, profile identity and plan details remain outside that audience's documents
