## ADDED Requirements

### Requirement: Manage a private study roadmap

The app SHALL allow a signed-in learner to manage at most three independent owner-scoped plans with public bank, target date, IANA time zone and weekly session goal.

#### Scenario: Manage plans through their lifecycle

- **WHEN** the learner creates, edits, archives, restores or deletes a plan
- **THEN** only the selected instance is affected
- **AND** stale commands and other accounts cannot change or read it

#### Scenario: Recover from a failed write

- **WHEN** a save fails or a different device edits the plan
- **THEN** the learner can retry or reload the saved data while retaining form input

### Requirement: Keep calendar tasks and actual study separate

The app SHALL generate bounded local-date weekly tasks and offer supported bank links, while preserving learner overrides.

#### Scenario: Plan the approach to an exam

- **WHEN** the learner supplies weekly availability and a valid future target
- **THEN** the schedule offers tasks before the exam date based on local calendar days
- **AND** expired, too-near, unavailable and zero-availability states are handled explicitly

#### Scenario: Edit the schedule after doing work

- **WHEN** the learner changes preferences or moves a missed task
- **THEN** explicit completion and date overrides survive recalculation
- **AND** active study drafts, attempts, timers and checkpoints are untouched

#### Scenario: Show evidence from Mock Exam

- **WHEN** a compatible retained public-bank Mock Exam result matches a scheduled week
- **THEN** the roadmap identifies the archived exam separately from manual completion
- **AND** it leaves the saved result unchanged
