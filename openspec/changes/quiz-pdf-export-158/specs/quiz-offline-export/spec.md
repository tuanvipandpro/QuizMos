# Spec Delta

## Purpose

Let authorized learners download a complete quiz as a readable offline PDF without disclosing private source content or changing their study state.

## ADDED Requirements

### Requirement: PDF-01 Whole source fidelity

The system SHALL export the entire loaded quiz in original question order with stable IDs, text, choices, instructions, templates and supported images across all seven surfaces. It SHALL include a corresponding answer key and exclude explanations/private notes.

#### Scenario: Structured and legacy content

- **WHEN** a quiz contains inline/row mappings and legacy unavailable answers
- **THEN** the PDF preserves slot/question identities and marks unavailable keys explicitly without fabricating answers or dropping questions

### Requirement: PDF-02 Source authorization

The system SHALL require current source read/offline-export permission and private ownership before processing or downloading. It SHALL not fetch quizzes through a new access path or use an external conversion service.

#### Scenario: Denied export

- **WHEN** the account does not own the source or offline export is denied
- **THEN** no generation, image processing or download begins

### Requirement: PDF-03 Readable bounded local generation

The system SHALL produce a downloadable Unicode PDF with bank title, page numbers, sensible margins and non-clipped long content/images. Processing SHALL have explicit practical limits and report failures without silently truncating content.

#### Scenario: Image cannot be embedded

- **WHEN** an image fails access, decoding, timeout or resource limits
- **THEN** the user receives a useful bounded failure and no incomplete PDF is downloaded

### Requirement: PDF-04 Cancellation and study isolation

The system SHALL expose progress, cancellation, completion and retry states, prevent duplicate work, suppress stale downloads after source/account changes and preserve study drafts, checkpoints, deadlines and unrelated data.

#### Scenario: Owner changes during generation

- **WHEN** an export is pending and the owner/source changes or the user cancels
- **THEN** stale work cannot download or overwrite the next owner's state
