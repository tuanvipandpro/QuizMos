Use this guide to review the decisions behind the 100 CCDV-P practice questions. The percentages reflect the official exam blueprint. Expand the related questions under any topic to test that decision in a scenario.

The official exam guide lists 70 items in 120 minutes, including 60 scored items, with a passing scaled score of 720. Use the linked guide for current exam details.

## Agent architecture and orchestration

- **17% of the blueprint.** Use production trajectories to choose the architecture. A repeated sequence with stable decisions belongs in a workflow. Reserve an agent for cases that benefit from investigation or flexible planning, with limits and escalation.
- Give workers clear scopes, isolated context, and small result schemas. Preserve evidence and provenance so a supervisor can reconcile conflicting results. Define interface validation and a policy for missing worker output.
- Treat checkpoints, memory, and external actions as separate concerns. Persist enough state to resume, validate stale facts before consequential work, and make retries safe with stable operation IDs and reconciliation.
- Keep context proportional to the current step. Retain the governing instructions and facts needed for the next decision. Compact or clear obsolete material and verify critical facts against the underlying source.

## Production integration and grounding

- **20% of the blueprint.** Classify API outcomes before recovering. Handle errors that arrive after a stream opens. Keep retries bounded and limited to transient failures when repetition is safe. Treat refusals as distinct outcomes, preserve the content needed to continue a paused turn, and trim context when the window is full.
- Use timeouts, circuit breakers, load shedding, fair scheduling, and token-aware admission to isolate bursts and dependency failures. Send suitable asynchronous workloads to bounded Message Batches and reconcile results by the custom ID supplied for each item.
- Keep remote MCP contracts versioned. Roll breaking changes out with consumer tests, overlapping versions, and a rollback path. Check the features and policy behavior of each fallback platform.
- Diagnose grounding in stages. Use hybrid retrieval when exact identifiers matter, rerank when evidence appears among candidates but misses the prompt, and validate that citations support the claims they accompany.

## Observability and monitoring

- **12% of the blueprint.** Connect model, retrieval, and tool spans with trace context. Capture duration, outcome, released model and prompt identifiers, and approved usage metadata for each operation.
- Observe availability alongside quality. Monitor outcomes such as refusals, truncation, fallback quality, and cost by meaningful dimensions. Use error-budget burn to alert according to impact and urgency.
- Use representative sampling for baselines and selectively retain abnormal traces for diagnosis. Compare failing cohorts with healthy ones. Minimize content capture and apply access and retention controls to recorded metadata.

## Debugging and incident response

- **10% of the blueprint.** Find the first divergence at a handoff. Compare inputs, outputs, and source evidence to distinguish stale data, a harness transformation, a tool failure, or a model behavior change.
- Replay intermittent failures enough times to estimate the failure rate. Change one factor at a time. Keep enough context to reproduce the conditions and record what was truncated or redacted.
- When impact is active, assign an owner, communicate the observed impact, and apply the lowest-risk mitigation available. Preserve evidence, review recovery signals, and turn the failure into a regression case and a monitoring improvement.

## Evaluation and quality

- **12% of the blueprint.** Define task success, thresholds, critical slices, and comparison conditions before a release evaluation. Keep development examples separate from the held-out decision set.
- Score outcomes and trajectories for agents. Separate retrieval relevance, groundedness, and end-to-end correctness. Refresh evaluation coverage with independently labeled hard cases from production.
- Calibrate judge models with anchored rubrics and human labels. Track disagreement, class imbalance, and model-version drift. Maintain a representative online baseline and analyze flagged cases as a separate slice.
- Treat results from an experiment with a post-hoc metric or sample size as exploratory. Choose the metric, sample, and cost and latency guardrails in advance for a fresh confirmation.

## Cost and latency

- **8% of the blueprint.** Estimate cost using measured task volume, input and output tokens, cache use, and retries. Include spend on failed attempts when calculating the cost per successful task.
- Keep the shared prompt prefix stable and put per-request values after the cache breakpoint. Check cache read and write counts when hit rates change. Measure how model-specific effort settings affect both latency and cache behavior.
- Use streaming to improve time to useful output. Parallelize independent tool calls, use smaller models for validated easy cases, and send work that can wait to batches. Measure quality and tail latency alongside savings.

## Runtime guardrails and security

- **11% of the blueprint.** Treat retrieved text, tool descriptions, and agent memory according to their trust level. Use access controls and approved egress at the execution boundary. Audit tool decisions with sensitive content minimized.
- Bind consequential action approvals to the exact parameters and expiry. Enforce approval and authorization at the executor, where the action runs.
- Use scoped runtime identities and credentials issued for each service. Validate audience and effective permissions, and handle downstream authorization separately from the client token.
- Test defensive controls with sanitized fixtures. Track both missed violations and false alarms, and define a safe outcome for blocked actions.

## Agent fleet operations

- **10% of the blueprint.** Give parallel coding agents isolated worktrees, disjoint scopes, and explicit shared-file ownership. Merge in a planned order and test at integration points.
- Use automated checks to filter routine issues, and route higher-risk decisions to humans. Evaluate any AI reviewer in shadow mode and measure its performance by defect category before using it to block merges.
- Bound unattended work by scope, turns, and budget. Persist checkpoints, send notifications, and escalate blocked or consequential steps. Use managed settings for organization policy and verify the effective configuration and telemetry on deployed clients.
