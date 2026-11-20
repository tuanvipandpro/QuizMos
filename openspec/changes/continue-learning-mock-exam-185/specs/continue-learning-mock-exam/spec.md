## ADDED Requirements

### Requirement: Mock Exam is reachable from Continue learning

The saved-progress card SHALL offer a Mock Exam action for the same quiz bank as Resume and SHALL open that bank's exam setup.

#### Scenario: Learner returns after finishing Practice

- **WHEN** the latest saved bank is shown in Continue learning after Practice
- **THEN** the card offers separate Resume and Mock Exam actions
- **AND** choosing Mock Exam opens setup with Mock Exam selected and preserves the saved Practice session

#### Scenario: Compatible exam draft already exists

- **WHEN** Mock Exam setup opens for a bank with a compatible active exam draft
- **THEN** the learner can resume that draft or explicitly confirm starting a new exam
- **AND** cancelling the replacement preserves the original draft

#### Scenario: Setup uses current eligibility for a new exam

- **WHEN** the learner starts a new exam from the setup
- **THEN** the existing certification and custom settings rules apply
- **AND** retired questions are excluded from the new exam
