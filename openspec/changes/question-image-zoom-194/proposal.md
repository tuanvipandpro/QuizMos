# Open question images in a zoomable preview

## Why

Inline diagrams and screenshots can be too small to read on phones. Learners need to inspect them without leaving their current question. Refs #194.

## What Changes

- Make a loaded question illustration open an accessible preview with zoom controls.
- Use the same interaction in Practice, Exam and review, including archived Exam review.

## Capabilities

### New Capabilities

- `question-image-preview`: Inspect question illustrations at larger sizes while retaining the current study state.

### Modified Capabilities

None.

## Impact

Question rendering, translations and browser coverage. No changes to question data, persisted drafts or timer logic.
