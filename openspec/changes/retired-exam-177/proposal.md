# Proposal

## Why

Retired questions are useful for practice but currently enter randomized mock exams. Issue #177 introduces a separate exam-eligibility rule.

## What Changes

- Exclude questions marked `retired: true` when creating mock exams while retaining them in practice.
- Show eligible counts and handle banks with no eligible questions.
- Preserve compatible existing exam drafts and their scoring.

## Capabilities

### New Capabilities

- `exam-question-eligibility`: Eligibility and safe exam setup for retired questions.

### Modified Capabilities

None.

## Impact

Exam session creation, setup, direct navigation, translations, and tests. No data migration or removal.
