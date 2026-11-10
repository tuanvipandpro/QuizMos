# Spec Delta

## Purpose

Expose reviewed certification question banks through public catalog discovery and existing study sessions while retaining source identity and compatible saved answers.

## ADDED Requirements

### Requirement: CQ-PAA-01 Reviewed public bank identity

The system SHALL expose the 75-question Professional Agentic Architect (PAA) bank under Google Cloud with stable gcp-paa identity, reviewed content and all source question IDs retained.

#### Scenario: Discover the bank

- **WHEN** a learner searches for PAA, GCP-PAA or the certification name
- **THEN** the public bank appears with the correct provider and count, retaining existing featured banks and aliases

#### Scenario: Review source corrections

- **WHEN** a source premise or capability claim conflicts with dated primary documentation
- **THEN** the published correction has recorded reasoning/provenance and preserves stable IDs and reviewed answer mappings

### Requirement: CQ-PAA-02 Compatible study and reference access

The system SHALL run PAA single/multiple-answer questions through existing Practice, Standard/Learning Exam and submitted-review rules, preserving answers and absolute deadlines across reload.

#### Scenario: Multiple answers and reload

- **WHEN** a learner completes a multi-answer question and reloads a timed session
- **THEN** completeness/scoring and the original answer mapping/deadline remain intact, and submitted review is read-only

#### Scenario: Included reference and load failure

- **WHEN** a learner opens an included explanation or bank loading fails
- **THEN** included text is readable without AI setup, and the existing recoverable loading error preserves the current session

### Requirement: CQ-PAA-03 Reviewed update discovery and equivalent access

The system SHALL surface the reviewed bank addition in public updates without visible commit hashes and keep search, navigation and long content accessible in both languages/themes on narrow and desktop views.

#### Scenario: Update to bank navigation

- **WHEN** a learner opens the PAA update entry using touch or keyboard
- **THEN** the canonical bank opens without layout overflow or a missing accessible action, preserving exam Leave/Cancel guards

#### Scenario: Account or route changes

- **WHEN** a learner changes account or leaves while the public bank is loading
- **THEN** existing cancellation and owner-scoped draft boundaries remain effective without new cloud writes or automatic AI requests
