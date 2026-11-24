## ADDED Requirements

### Requirement: Independent custom timed training presets

The quiz overview SHALL offer separate dropdowns with 50, 60, 70 and 80 question presets and 50, 60, 70 and 80 minute presets for Custom timed training.

#### Scenario: Choose an independent combination

- **WHEN** a learner changes the count or time for a new Custom timed training session
- **THEN** the other field keeps its value and the draft stores the selected combination

#### Scenario: A preset exceeds available questions

- **WHEN** the eligible question pool is smaller than a count option
- **THEN** the app disables that option and explains availability
- **AND** a positive pool below 50 has an explicitly labelled full-pool count
- **AND** a zero-eligible pool cannot start a new training run

#### Scenario: Return to a saved or certification-format exam

- **WHEN** a learner resumes a saved exam or selects Certification format
- **THEN** resume keeps the original settings, shuffle and deadline
- **AND** a new Certification format session uses its published constraints
