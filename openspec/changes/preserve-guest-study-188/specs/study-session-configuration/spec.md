## ADDED Requirements

### Requirement: Continue active guest study after local sign-in

The system SHALL preserve the active compatible public-bank or tab-upload study draft when the learner successfully signs in from its tab. Preserve its source, subset, position, answers, flags, settings and absolute deadline.

#### Scenario: Continue an active or completed session

- **WHEN** the local sign-in succeeds and the matching account has no conflicting local draft
- **THEN** the signed-in learner continues the same session, including completed result navigation
- **AND** reloading or observing the same account again preserves the transferred draft

#### Scenario: Resolve an existing account draft

- **WHEN** the destination already has a draft for the same slot
- **THEN** the learner explicitly chooses which study draft to keep
- **AND** canceling or dismissing the choice keeps the account draft

#### Scenario: Failed or unrelated sign-in

- **WHEN** the popup fails or is canceled
- **THEN** the current guest study remains available
- **AND** cross-account transitions and stale popup results cannot transfer the draft

#### Scenario: Maintain local guest work and owner boundaries

- **WHEN** a guest study draft transfers into a signed-in session
- **THEN** prior guest work is never submitted to History, Notebook or checkpoint storage automatically
- **AND** all cloud reads and writes continue to follow the authenticated account
