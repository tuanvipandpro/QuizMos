# Claude Certified Developer – Professional bank

Tracking issue [#214](https://github.com/tuanvipandpro/QuizMos/issues/214). Data change, medium risk. Reviewed on 22 November 2026.

The English `CCDV-P.json` supplied for this issue came from the [Practica practice exam](https://certprep.practica.asia/ccdv-p/exam), collected on 21 November 2026. The input SHA-256 is `10bc81d24af79ca697f496d79ca44c142646cbfdffa9d87767d091d6cba664935`.

The bank contains 100 practice questions with explanations. It preserves source IDs `1`–`100` and all answer keys, with 80 single-answer and 20 two-answer questions. The export's answer arrays agree with both the solution badges and highlighted answers in the source snapshots. For IDs `11` and `17`, both indicators confirm `A` and `E` even though the provisional raw answer field only contains `A`.

The [official CCDV-P exam guide v1.0](https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794947325/Claude_Certified_Developer-Professional_Exam_Guide.pdf), effective November 2026, specifies 70 items, 120 minutes, and a passing scaled score of 720. Practice questions and selected answers were reviewed against its eight domains. The export's domain counts from 1 through 8 are `17, 20, 12, 10, 12, 8, 11, 10`.

Three options were clarified while retaining their answer keys.

- `1` limits mid-stream retries to transient errors when the request can safely be repeated. [Claude API errors](https://platform.claude.com/docs/en/api/errors)
- `60` specifies size-limited Message Batches and distinguishes transient failures from invalid items that need correction before resubmission. [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- `82` treats the first A/B run as exploratory and calls for a fresh confirmatory test with the metric, sample size, and guardrails set in advance.

Each question preserves its per-option rationale and adds an English practice takeaway tied to the scenario. The English Quick Summary follows the eight exam domains and maps each question ID to its domain in the reviewed source export. The guide fingerprint records that reviewed bank.

QuizMos loads the bank through the Anthropic catalog, practice, and Quick Summary routes. Verify discovery, single- and multiple-answer grading, included explanations, and guide-to-practice links during rollout. Revert the bank, catalog entry, certification profile, and Quick Summary together if rollback is required.
