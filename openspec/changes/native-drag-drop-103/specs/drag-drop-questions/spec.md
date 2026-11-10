# Spec Delta

## Purpose

Let learners answer native drag-and-drop questions with stable slot mappings using pointer, touch, keyboard or tap, while retaining reliable grading and saved-state behavior.

## ADDED Requirements

### Requirement: CQ-DD-01 Distinct validated format

The system SHALL retain drag_drop as a distinct question type with stable slot IDs, per-slot choice keys, row or inline layout and mapping answers. Invalid schemas SHALL be rejected without relabelling or dropping questions.

#### Scenario: Native question intake

- **WHEN** a valid drag_drop question is loaded or imported
- **THEN** its type, slot order, keys and marked mapping are preserved and a native answer surface is rendered

#### Scenario: Invalid schema

- **WHEN** parts, options, mapping keys, layout or inline placeholders are missing, duplicated or invalid
- **THEN** validation reports an error before a session starts

#### Scenario: Literal GitHub Actions expressions

- **WHEN** native inline source contains `${{ github.ref }}` or another GitHub Actions expression beside real `{{slotId}}` placeholders
- **THEN** the expression remains literal code and only declared slot placeholders become answer targets

### Requirement: CQ-DD-02 Assignments through equivalent inputs

The system SHALL support mouse/touch dragging and equivalent tap/keyboard selection and placement. Bank choices SHALL remain reusable; moving a placed choice SHALL clear its source and replace its target. Clear and cancellation SHALL preserve unrelated answers.

#### Scenario: Copy, reuse, move and replace

- **WHEN** a bank choice is placed repeatedly or a placed choice is moved to a compatible slot
- **THEN** only the intended mappings change, preserving original keys and all unrelated assignments

#### Scenario: Invalid drop or cancel

- **WHEN** a gesture is cancelled, leaves the answer surface or targets an incompatible slot
- **THEN** persisted answers remain unchanged and useful contextual feedback is available

### Requirement: CQ-DD-03 Existing grading and review gates

The system SHALL score complete drag_drop mappings as one question using every slot. Practice/Learning feedback SHALL follow existing completeness gates; active Standard exams SHALL not reveal correctness. Submitted/read-only review SHALL not edit answers.

#### Scenario: Partial and complete answers

- **WHEN** a learner fills some or all slots in Practice/Learning
- **THEN** partial mappings reveal no answer feedback and complete mappings receive the existing whole-question/per-part feedback

#### Scenario: Standard and read-only state

- **WHEN** a Standard exam is active or a completed answer is reviewed
- **THEN** active correctness stays hidden and read-only placements cannot be changed

### Requirement: CQ-DD-04 Safe interaction lifecycle

The system SHALL discard stale gestures after question, owner, mode or read-only changes. Draft restore SHALL retain mapping answers and exam deadlines. A late placement SHALL not alter a terminal or expired exam.

#### Scenario: Gesture interrupted

- **WHEN** navigation, account change, expiry or unmount occurs during a drag
- **THEN** the gesture is cancelled, resources are released and no other question/account receives its answer

#### Scenario: Refresh and deadline

- **WHEN** a draft is refreshed or input arrives after its absolute deadline
- **THEN** existing valid placements restore without resetting time and late input is rejected

### Requirement: CQ-DD-05 Shared data and explanation compatibility

The system SHALL preserve native slot/choice context in copy/import, fingerprints, saved quiz data and explanation input. Existing-format behavior/prompts SHALL remain compatible. Worker limits and explicit source/quota policy SHALL remain unchanged.

#### Scenario: Native explanation and saved data

- **WHEN** a drag_drop question is copied, saved or explicitly explained
- **THEN** every slot and original choice is represented with its mapping and native identity, without treating it as dropdown

#### Scenario: Existing formats

- **WHEN** an existing supported format is used
- **THEN** its stored IDs, answers, score, fingerprint and explanation prompt contract remain unchanged

### Requirement: CQ-DD-06 Accessible responsive interaction

The system SHALL provide labelled choices/targets, visible focus and contextual announcements with single-pointer and keyboard alternatives. Targets SHALL be reachable at 320px, in both locales/themes, without blocking normal page scroll or reduced-motion preferences.

#### Scenario: Keyboard and tap

- **WHEN** a learner selects a choice and activates a slot without dragging
- **THEN** the same assignment is made with meaningful selection/focus/status feedback and Escape cancels safely

#### Scenario: Narrow viewport and long source text

- **WHEN** native row/inline content is used on phone, landscape or desktop
- **THEN** controls remain at least 44px, text wraps, focused inputs stay reachable and read-only content remains legible
