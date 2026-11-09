# Proposal

## Why

[Issue #103](https://github.com/tuanvipandpro/QuizMos/issues/103): GH-600 intake #100 contains 19 unsupported drag_drop questions. The owner requires a native format, preserving its identity rather than converting it to dropdown.

## What Changes

- Add validated native drag_drop questions with row/inline slots and mapping answers, shared completeness/correctness, stable copy/import/fingerprints and option shuffling.
- Provide real pointer dragging with separate scroll-safe handles, plus equivalent tap/keyboard selection and placement, movement, clear and cancellation.
- Preserve Practice/Learning/Standard feedback gates, read-only review, account drafts/deadlines and existing formats.
- Add native examples/guidance, typed AI/Worker serialization and fixture-based compatibility coverage. Coordinate History #80 through its own MR.

## Capabilities

### New Capabilities

- `drag-drop-questions`: native slot assignment, cross-input access, grading and lifecycle compatibility.

### Modified Capabilities

None in the current main-spec inventory. Profile/Rules authorization and infrastructure rollout remain unchanged.

## Impact

Feature, high interaction/grading risk. Affects questionModel/domain helpers, a focused pointer hook and answer component, StructuredQuestion dispatch, translations/CSS, format examples, shared prompts/Worker validation and regression tests. No new package, bank import, Firebase policy publication, real account/AI call or paid service. GH-600 #100 remains a separate data MR; #99 governance is already merged into develop and open #102 must sync the release before hosted feature CI. The owner explicitly authorized implementation and Astra review after completion.
