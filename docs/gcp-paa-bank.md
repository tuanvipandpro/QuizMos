# Google Cloud Professional Agentic Architect bank

Tracking: [#125](https://github.com/tuanvipandpro/QuizMos/issues/125). Type: data; medium risk. Reviewed on 10 November 2026.

## Identity and source

The [official certification page](https://cloud.google.com/learn/certification/agentic-architect) and [exam guide](https://services.google.com/fh/files/misc/professional_agentic_architect_exam_guide_english.pdf) identify Professional Agentic Architect and its low-code, coding-agent, custom-agent, evaluation/deployment and security scope. PAA is the app's short label; GCP-PAA/GCP_PAA are search aliases for the supplied filename, not a claim about a separate official exam code. Do not hardcode beta/GA logistics or imply that practice questions complete the hands-on certification component.

Owner-supplied GCP_PAA.json: 144,819 bytes, SHA-256 5d141af6f36ac5fdc1e2fc549f68c1aa5f18942e39a5da759c6afe618234bc9f. The ignored intake remains unchanged. All 75 source IDs and answer arrays are retained: 68 single-answer, seven multiple-answer multiple_choice items. All contain included explanations. No image exhibits or new formats are required. This is supplied practice material, not an official or guaranteed-correct answer key.

Published LF-normalized SHA-256: 705fccb1eade2cc297b130f2a0f92754d5abeedc98f547245eeee486348cfd37. [Review metadata](gcp-paa-review.json) retains the ID/answer digest, option digest, all 75 review entries and primary references. Normalized duplicate-stem comparison found no exact/normalized-stem duplicate within the bank or existing catalog; this is not a proof that no questions discuss overlapping concepts.

## Review method and limits

Read every stem, option set, marked answer and explanation. Check product-specific decisions against primary Google/ADK/Antigravity/Claude documentation, using current API/source definitions for exact names. The supplied explanations already contain useful caveats; where they contradict a stem or selected option, fix the question rather than publish an unqualified guarantee followed by a footnote. Preserve every answer-key selection and document changes to its supporting wording. Remove tracking-only URL query parameters while preserving functional parameters.

Source topics are retained for provenance, not used as official domain weights or readiness claims. This review creates no quick-summary reviewed fingerprint. Future capability changes need another substantive review; passing schema/hash checks alone establishes neither exam alignment nor semantic correctness.

## Substantive corrections

36 questions receive scoped content corrections. Other explanation changes only canonicalize tracking URLs. No question or answer choice key is omitted.

| Question | Changed fields                 | Reason                                                                                                                                                       |
| -------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| q-2      | question, explanation, options | Make source ACL metadata/identity prerequisites explicit; Cloud Storage IAM is not automatically synchronized.                                               |
| q-4      | question, explanation, options | Ask for improved grounding/format adherence rather than a guarantee; demonstrate concise reasoning rather than require hidden reasoning disclosure.          |
| q-6      | question, explanation          | XML can improve instruction adherence, not enforce authorization or deterministic sequencing.                                                                |
| q-10     | explanation, options           | Disambiguate Antigravity CLI skill discovery from the separate Agents CLI; fix spacing.                                                                      |
| q-14     | explanation, options           | Do not claim standalone skill publication to Agent Registry; use supported extension distribution and agent evaluation.                                      |
| q-15     | options                        | Make the user-scoped Claude configuration location explicit.                                                                                                 |
| q-16     | question, explanation          | Scope CodeMender preview to evaluation of a test copy, not production/commercial deployment.                                                                 |
| q-20     | question, explanation, options | Replace unsupported medical-image diagnosis with non-medical multimodal document analysis; remove full-resolution preservation guarantee.                    |
| q-22     | explanation, options           | Identify semantic tool retrieval as a custom component, not an assumed built-in ADK class.                                                                   |
| q-24     | question, explanation          | Cloud Storage references avoid inline body inflation, not model file/context/duration limits.                                                                |
| q-25     | question, explanation          | Separate model-facing schema clarity from runtime validation of currency values.                                                                             |
| q-30     | explanation, options           | Correct the managed topic enum USER_PREFERENCES; remove the now-obsolete typo note.                                                                          |
| q-36     | question, explanation          | Batch inference trades response latency for throughput; give an explicit asynchronous daily deadline.                                                        |
| q-37     | question, explanation          | Do not promise strict grounding from XML prompts or claim zero conversational latency.                                                                       |
| q-38     | explanation, options           | Groundedness is not retrieval precision/recall; explicitly assess both retrieved evidence and tool trajectories.                                             |
| q-39     | question, explanation, options | Measure answer faithfulness as well as retrieval; do not imply native named retrieval metrics in every ADK/CLI version.                                      |
| q-44     | question, explanation          | Clarify the approved cloud boundary and permitted selective managed API use; private GKE is not automatically an on-premises bank network.                   |
| q-45     | explanation, options           | Make region/data-flow controls explicit rather than equating a private VPC with residency.                                                                   |
| q-52     | question, explanation          | Reranking improves relevance, not guaranteed first position; treat latency as measured headroom.                                                             |
| q-53     | question, explanation          | Rubric judges support semantic criteria but cannot guarantee perfect verdicts.                                                                               |
| q-54     | question, explanation, options | Reference evidence and retrieved traces are required for RAG relevance/grounding judgments.                                                                  |
| q-55     | question, explanation, options | Replace invented SecureRunner and unsupported VertexAiSessionService confirmation with the documented TypeScript policy pattern in a live evaluation runner. |
| q-56     | question, explanation          | Separate the OAuth header/IAM question from credential refresh already provided by the managed integration.                                                  |
| q-57     | explanation, options           | Describe enforceable egress allowlisting rather than an unsupported explicit NetworkPolicy deny rule.                                                        |
| q-58     | question, explanation          | Scope inspection to supported extracted-text payloads and risk reduction, not guaranteed prevention or raw-file gateway screening.                           |
| q-60     | question, explanation, options | PII screening is not an infallible guarantee; specify supported gateway enforcement rather than a vague agent-policy attachment.                             |
| q-61     | explanation, options           | Default gateway telemetry does not log full payloads; add explicit supported payload capture to satisfy the stated auditing requirement.                     |
| q-63     | explanation, options           | Sandboxing requires explicit network/credential policy; defaults may permit internet egress.                                                                 |
| q-64     | explanation, options           | Secret Accessor must be scoped to the Secret Manager secret, not the database resource.                                                                      |
| q-65     | explanation, options           | Separate IAM authorization from complementary Model Armor content screening.                                                                                 |
| q-66     | question, explanation, options | Remove air-gap/CMEK/compliance guarantees; require supported private connectivity, encryption and location controls explicitly.                              |
| q-68     | explanation, options           | Do not invent Secret Manager URI support in the auth provider schema; use the documented managed credential vault.                                           |
| q-70     | question, explanation, options | Do not claim managed Agent Runtime session persistence for unsupported ADK tool confirmation; scope a supported live-runner prototype.                       |
| q-71     | explanation, options           | Replace fictional Inspect/Decide/Transform hook types with the documented command PreToolUse decision/overwrite contract.                                    |
| q-72     | question, explanation, options | PAB eligibility uses Resource Manager scopes, not a direct per-bucket allow grant; retain bucket IAM as a separate control.                                  |
| q-73     | question, explanation, options | Use actual gateway logging and Model Armor integration; do not claim direct SDP route filters or automatic per-agent token exporters.                        |

Particular implementation limits: ADK confirmation support differs by language/session backend; the corrected live-runner prototypes do not promise restart durability. Principal access boundaries limit supported Resource Manager eligibility and do not grant bucket permissions. Schema hints, XML formatting, safety detectors and LLM judges improve specific properties without proving deterministic security or flawless decisions. Private networking/PSC alone does not establish a legal compliance claim or an air gap. Per-question primary sources and qualifications are in the review metadata and published explanations.

## Integration and verification

Register gcp-paa under existing Google Cloud navigation with 75 questions and reuse existing loader, scoring, sessions, included-reference rendering and update UI. No dependency, backend, Firebase Rules, History flag, model or quota change. Preserve featured AIP-C01/CCAR-P and all existing aliases/drafts.

Bank tests verify exact IDs, original ID/answer digest, reviewed options/content hashes, single/multiple-answer distribution and regression-sensitive corrected premises. Browser acceptance covers catalog/search/provider, both modes, partial/correct multi-answer selection, reload/deadline, submitted read-only review, included reference without AI, update links/exam guards and the existing responsive/locale/theme matrix. Actual local/CI evidence is recorded in #125/its PR and the OpenSpec matrix.

UI/UX search find content navigation (UX): Keyboard Navigation applies to existing controls; retain sticky header spacing. Autocomplete is not added because the existing live catalog filter serves this scope. No new layout/style system. Disposable screenshots/logs/intake remain ignored.

Delivery is one issue PR into the M2 release, followed by separately requested release/develop/production promotion and public-bank smoke. Keep #125 open through acceptance. Rollback removes only this new bank/catalog/update addition, preserving unrelated banks and stored owner data.
