## ADDED Requirements

### Requirement: Retired questions remain available in practice

The system SHALL retain retired questions in practice sessions.

#### Scenario: Practice with retired questions

- **WHEN** a learner starts practice on a quiz containing retired questions
- **THEN** the full quiz remains available.

### Requirement: New mock exams use eligible questions

The system SHALL exclude questions with `retired: true` from newly created mock exams.

#### Scenario: Mixed eligibility

- **WHEN** a learner starts a new mock exam
- **THEN** its questions are selected only from questions not marked retired and the available counts reflect that pool.

#### Scenario: No eligible questions

- **WHEN** all questions are retired and no resumable draft is available
- **THEN** the system prevents a new exam and provides an explanation and navigation back to practice.

#### Scenario: Existing draft

- **WHEN** a compatible in-progress exam is resumed
- **THEN** the system preserves its questions, answers, and deadline.
