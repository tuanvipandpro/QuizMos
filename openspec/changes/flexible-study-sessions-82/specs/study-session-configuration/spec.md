# Spec Delta

## Purpose

Provide source-backed certification-format settings and bounded training sessions while preserving study identities, frozen results, personal state and truthful scoring information.

## ADDED Requirements

### Requirement: CQ-SESSION-01 Source-backed certification profiles

The system SHALL associate certification-format metadata with stable quiz identity, exam version/phase, official sources and review date. It SHALL distinguish exact, ranged and unverified values, answering time from seat time, and standard exams from renewals/beta exams. Missing or superseded facts SHALL NOT become invented official defaults.

#### Scenario: Published format differs from generic defaults

- **WHEN** a current verified profile specifies 75 questions and 180 answering minutes
- **THEN** its certification-format setup uses those values and identifies the reviewed source rather than the generic 50/60 defaults

#### Scenario: Variable count or partial evidence

- **WHEN** the provider publishes a question-count range or only a duration
- **THEN** the range/uncertainty is visible, an app-selected count is labelled as such, and unverified fields are not represented as fixed vendor rules

#### Scenario: Version transition

- **WHEN** a bank is mapped to a retiring exam version or its syllabus version is unconfirmed
- **THEN** the app retains its stable identity, explains the limitation and does not relabel its questions as the successor version automatically

### Requirement: CQ-SESSION-02 Distinct certification format and training modes

The system SHALL distinguish a verified single-cert format from short Practice and custom timed training. Existing full-bank Practice SHALL remain available. Learning feedback and overridden certification settings SHALL be labelled as training, not a faithful official examination. Mixed-cert notebook pools SHALL remain Practice.

#### Scenario: Short learning session

- **WHEN** a learner chooses a 10- or 20-question Practice session
- **THEN** it is untimed, has immediate Practice feedback and does not masquerade as an official certification examination

#### Scenario: Custom or Learning setup

- **WHEN** the learner overrides a verified format or chooses Learning feedback
- **THEN** the selected count/time remain explicit, the session is identified as training and Standard/Learning answer visibility is preserved

### Requirement: CQ-SESSION-03 Valid settings and sufficient pools

The system SHALL validate finite integer settings against mode limits and the available eligible pool. New scored subsets SHALL exclude unsupported/ungradable items with an explanation. Exact-count certification formats SHALL NOT be silently truncated, filled with duplicate questions or converted to another exam version. Empty or insufficient pools SHALL have an actionable state.

#### Scenario: Insufficient bank for a verified paper

- **WHEN** a format requires 45 questions but only 42 eligible questions exist
- **THEN** starting that exact format is disabled with the shortage explained, while clearly labelled available training remains possible

#### Scenario: Invalid custom input

- **WHEN** new-session count/time is missing, fractional, non-finite, outside its named limits or greater than available questions
- **THEN** the app retains input, identifies the affected field and prevents an invalid start without changing an existing valid draft

### Requirement: CQ-SESSION-04 Stable random subsets and personal-state isolation

The system SHALL sample short sessions without replacement and preserve their membership/order after creation. Draft identity SHALL distinguish owner, source/version, full-bank versus subset and notebook reference-set membership. Original question IDs SHALL remain intact. Short/revision sessions SHALL NOT overwrite full-bank answers or cloud checkpoints.

#### Scenario: Full-bank and quick sessions coexist

- **WHEN** a user starts 10-question Practice while a full-bank draft/checkpoint exists
- **THEN** both remain independently resumable, the checkpoint stays unchanged and refreshing the short session does not draw a different subset

#### Scenario: Aliases, private reuse and duplicate notebook IDs

- **WHEN** an alias resolves to the same bank, a private slot changes instance/version, or two notebook sources use the same original question ID
- **THEN** canonical owner/source identity is preserved, obsolete content is not substituted and distinct source references do not collapse into one question

### Requirement: CQ-SESSION-05 Frozen resume and absolute deadlines

The system SHALL resume compatible existing sessions with saved settings, questions/options, answers, flags, feedback mode and absolute deadline. Current setup or registry changes SHALL apply only to a separately started session. Replacing a running draft SHALL require confirmation. Older compatible drafts and submitted read-only results SHALL retain their original grading/lifecycle semantics.

#### Scenario: New settings while a timed draft exists

- **WHEN** a learner changes count/time in setup and resumes the existing Exam
- **THEN** its saved count, mode, shuffle and deadline win over setup/URL choices; confirming a new Exam is the only replacement path

#### Scenario: Expiry, refresh and older start links

- **WHEN** the browser refreshes, a late answer arrives after the deadline or an older start URL is revisited
- **THEN** the same run is restored or finalized once at its original deadline, without an extended timer or unintended replacement of a newer draft

### Requirement: CQ-SESSION-06 Honest scoring and immutable History

The system SHALL distinguish app practice accuracy/benchmarks from vendor certification results. It SHALL NOT convert raw percentages into scaled scores, infer unknown weights/unscored identities or claim official readiness. Existing History v1 payloads, grading version and benchmark calculations SHALL remain immutable and their presentation SHALL identify the app benchmark rather than official certification passing.

#### Scenario: Scaled, undisclosed or weighted vendor score

- **WHEN** a provider uses scaled scoring, withholds its numeric threshold or requires point weights absent from the bank
- **THEN** official criteria are reference information, practice accuracy remains separate and the app does not announce an official cert pass/fail from that percentage

#### Scenario: Historical result after a profile update

- **WHEN** an old archive is opened after certification metadata changes
- **THEN** its frozen answers/grade remain unchanged, the legacy result is labelled as a QuizMos benchmark and current vendor metadata is not presented as attempt-time evidence

### Requirement: CQ-SESSION-07 Notebook integration through its accepted boundary

The system SHALL add short Practice to the current authorized question/reference-set boundary from #81 after that code reaches the M2 release. It SHALL preserve source mapping and draft isolation, exclude changed/missing/unauthorized references before validating count, and respect the notebook feature/policy gate. Base-bank sessions SHALL remain independent of notebook availability.

#### Scenario: Mixed valid and unavailable notebook references

- **WHEN** only some selected notebook references remain current and authorized
- **THEN** exclusions remain visible, a 10/20 preset is valid only against the executable pool, zero matches cannot start and notes are retained

#### Scenario: Notebook disabled or dependency unavailable

- **WHEN** notebook integration has not been accepted or its client gate is disabled
- **THEN** base-bank/private-quiz setup still works, no notebook IO or implicit activation occurs and notebook integration is not falsely reported as delivered

### Requirement: CQ-SESSION-08 Accessible setup and recovery

The system SHALL expose settings, provenance, warnings and errors in VN/EN and both themes with keyboard focus and reachable controls at 320px through desktop/landscape. Loading, empty, invalid, insufficient, storage failure and pending/resume states SHALL preserve usable navigation and input. Display locale SHALL NOT imply eligibility for vendor extra-time accommodations.

#### Scenario: Phone, keyboard and invalid settings

- **WHEN** a learner edits settings on a narrow/landscape viewport, uses only the keyboard or encounters validation/storage failure
- **THEN** labels/errors stay readable and connected, focus remains usable, inputs are retained and the session cannot silently start with different values

### Requirement: CQ-SESSION-09 Compatible delivery and rollback

The system SHALL preserve existing bank/provider navigation, aliases, guest/private ownership and profile policies. It SHALL introduce no new production data-policy publication merely to offer settings. Current-head CI and protected issue/milestone promotion SHALL precede delivery claims; notebook activation SHALL retain its separate gate. Rollback SHALL retain compatible drafts, checkpoints and immutable archives.

#### Scenario: Deployment or rollback with existing data

- **WHEN** the settings feature is promoted or rolled back
- **THEN** existing account-scoped state remains compatible, no archive is rewritten and neither notebook policy activation nor an AI inference is triggered implicitly
