# Proposal

## Why

Refs #125. The supplied GCP_PAA.json contains 75 structurally valid questions for Google's Professional Agentic Architect certification but is absent from the public catalog. Learners need a reviewed, reachable bank with existing study behavior and source provenance.

## What Changes

- Review the supplied stems/options/answers/explanations against current primary sources; preserve all IDs and record substantive corrections and dated limitations.
- Add gcp-paa / PAA under Google Cloud, using the existing question loader, single/multiple-choice renderer, sessions and included explanation flow.
- Publish reviewed bank-update metadata and English/Vietnamese summary text; retain internal provenance and existing no-hash public presentation.
- Add focused provenance/catalog/session/browser regressions and maintained content review notes.

## Capabilities

### New Capabilities

- certification-quiz-catalog: reviewed certification bank discovery and existing study-mode access, scoped here to the new PAA bank.

### Modified Capabilities

None. Main specs currently contain user-profile-access only; no account behavior changes.

## Impact

New public/quiz/Google/GCP_PAA.json, catalog/update registries, translation summary, focused tests and review documentation. No new format, provider, dependency, UI redesign, Firebase policy, account write, AI invocation or production deployment. The feature PR targets the dated M2 release; merge/rollout acceptance stays separate.
