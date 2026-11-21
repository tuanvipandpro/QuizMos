## ADDED Requirements

### Requirement: Question illustrations open an accessible zoom preview

Question illustrations in Practice, Exam and review SHALL open a fitted preview by click, tap or keyboard. Learners SHALL be able to zoom and reach enlarged image details.

#### Scenario: Inspect a question illustration

- **WHEN** the learner activates a loaded question image
- **THEN** a named preview opens and fits the image without distorting its aspect ratio
- **AND** labelled zoom controls and native scrolling make enlarged details reachable

#### Scenario: Close a preview during a timed exam

- **WHEN** the learner opens and closes the preview with Escape or the visible close button during an active exam
- **THEN** focus returns to the image trigger
- **AND** the active question, answers, flags and absolute deadline remain intact
- **AND** the exam timer continues counting down

#### Scenario: An illustration is unavailable

- **WHEN** an illustration is missing or fails to load
- **THEN** the learner can still read and use the question
