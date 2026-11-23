## ADDED Requirements

### Requirement: Filter questions in saved exam review

Saved exam review SHALL provide the same question filters as immediate exam results. The picker and Previous/Next controls SHALL show matching archived questions in their original order and retain their original question numbers.

#### Scenario: Review by outcome

- **WHEN** a learner chooses Correct, Incorrect, Unanswered, or Missed questions
- **THEN** the review uses the frozen outcome and starts at the first matching question
- **AND** the recorded score and archive remain unchanged

#### Scenario: Review flagged questions

- **WHEN** a learner saves a new exam
- **THEN** the immutable snapshot contains the flags as validated question indices
- **AND** selecting Flagged later shows only those questions

#### Scenario: Review a legacy or empty result set

- **WHEN** the selected filter has no matches
- **THEN** the review shows an empty state and keeps the filters available
- **AND** a legacy snapshot without flags explains that its flag data is unavailable

#### Scenario: Retry a saved legacy attempt

- **WHEN** a retry matches an existing archive except for optional flag metadata
- **THEN** storage returns the existing archive and retains its recorded metadata
- **AND** a changed answer, outcome, or conflicting recorded flag set remains a conflict
