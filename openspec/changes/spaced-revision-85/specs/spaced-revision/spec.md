## ADDED Requirements

### Requirement: Build a private spaced review schedule

The system SHALL derive an initial schedule from current, versioned Notebook mistakes and persist adjustments through the existing owner-scoped transaction.

#### Scenario: Grade and retry a due question

- **WHEN** an eligible completed answer is saved
- **THEN** a wrong answer resets the step and a due correct answer advances it
- **AND** the same retried operation cannot repeat or extend the adjustment

#### Scenario: Manage a scheduled entry

- **WHEN** the learner resets, removes or restores an entry
- **THEN** only its schedule changes, preserving its existing learning records

### Requirement: Present the current revision workload

The system SHALL show due, overdue, next review and unavailable states, with an actionable empty state.

#### Scenario: Start review from the queue

- **WHEN** the learner starts a due review
- **THEN** only current compatible questions are included in an untimed session
- **AND** private source changes or ownership changes cannot redirect progress to another source or account

#### Scenario: View the study calendar

- **WHEN** a learner opens a public-bank study plan
- **THEN** due and overdue reviews for that bank use the plan's week and time zone
- **AND** study plan edits, practice drafts and Exam History remain independent
