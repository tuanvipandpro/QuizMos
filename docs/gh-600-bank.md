# GH-600 bank intake and review

Tracking: [#100](https://github.com/tuanvipandpro/QuizMos/issues/100). Native dependency: #103 / MR #104. Type: data; high content/saved-identity risk.

The owner supplied GH-600_QuizMos.json (211827 bytes). The identical original remains in ignored intake storage with SHA-256 `66e8286a485b1b37f4dc80d3666edd9e4956bac1ea45da47160d8be9e1cb03cf`. Registered bank `gh-600` retains all 98 original IDs, option keys and marked-answer mappings: 61 multiple choice, 10 yes/no, eight dropdown and 19 native drag/drop. No item is converted or omitted. Reviewed option text, stems, explanations and templates change only through the correction manifest below. [Machine-readable review](gh-600-review.json) records each changed field, source/ID-answer hashes and the final LF-normalized published hash for portable Windows/Linux verification.

The [official credential page](https://learn.microsoft.com/en-us/credentials/certifications/agentic-ai-developer/) supplies the title GitHub Certified: Agentic AI Developer and Intermediate level. The [GH-600 study guide](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600) covers the six agentic SDLC domains represented in the source. Use the existing Microsoft delivery category alongside GH-300; provider assets/order and featured banks are unchanged. This is owner-provided practice material, not an official answer-key endorsement.

## Reviewed corrections

Astra read every question/choice/marked answer, all 19 native templates and all 10 distinct exhibit images (13 source URLs covering 20 questions). Source defects include nonexistent APIs, invalid workflow/hook syntax, missing approval controls and claims unsupported by logs. Fixes preserve every ID, option key and answer mapping; the 32 affected question objects are explicit below. q11's malformed command image and q58's obsolete YAML image are removed because complete corrected text supplies that content. The remaining 18 image references were visually reviewed; all 13 original URLs returned HTTP200 image/png during intake QA. External availability remains a third-party dependency.

| Question | Changed fields                                     | Reason                                                                         |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| q-1      | explanation, question, template                    | Use workflow/job permissions and explicit manual PR gate                       |
| q-11     | imageUrl, question                                 | Replace malformed command exhibit with complete inline Bash                    |
| q-13     | question                                           | Establish named MCP tool allowlist premise                                     |
| q-15     | question                                           | Label profile exhibit as proposed configuration                                |
| q-16     | explanation, template                              | Use direct MCP headers field                                                   |
| q-17     | explanation, options, question                     | Use native CLI agent selection and permission kinds                            |
| q-18     | question                                           | Label profile exhibit as proposed configuration                                |
| q-23     | question                                           | Align profile filename with marked path                                        |
| q-30     | question                                           | Label profile exhibit as proposed configuration                                |
| q-37     | explanation, statements                            | Ask only facts actually visible in model-request logs                          |
| q-42     | explanation, statements                            | Distinguish feature flag from runtime MCP server capability                    |
| q-44     | question                                           | Label profile exhibit as proposed configuration                                |
| q-46     | question                                           | Disambiguate head_ref and run_id concurrency requirement                       |
| q-48     | explanation                                        | Correct manual artifact-deletion audit-event scope                             |
| q-49     | explanation, options                               | Classify observed invocation failure without attributing misuse                |
| q-50     | question, statements                               | Fix branch identifier and user-invocable spelling                              |
| q-51     | template                                           | Remove erroneous duplicate risk reviewer job                                   |
| q-53     | explanation, options, question                     | Explicit self-review and administrator-bypass protection                       |
| q-54     | explanation, question                              | Separate workflow-token scopes from external credential boundaries             |
| q-57     | explanation, question                              | Human accountability rather than irreversible-commit claim                     |
| q-58     | explanation, imageUrl, options, question, template | Use native JSON preToolUse hook and trusted validator; remove obsolete exhibit |
| q-63     | explanation, question                              | Scope clear command to Copilot CLI                                             |
| q-73     | explanation, options, question                     | State MCP server name/toolset premise                                          |
| q-74     | question                                           | Remove escaped JSON braces                                                     |
| q-77     | explanation, options, question, template           | Use complete native SDK session/hook API with cleanup                          |
| q-79     | explanation, question, template                    | Use separate valid hook files without duplicate keys                           |
| q-85     | explanation, template                              | Include hidden session-log directory explicitly                                |
| q-87     | explanation, question, template                    | Supply protected manual job and shared plan artifact                           |
| q-90     | explanation, options                               | Remove unsupported fixed compaction percentage                                 |
| q-94     | explanation, question, template                    | Supply valid current-head human-review workflow                                |
| q-96     | explanation, options, question                     | Narrow intended Git log permission without sandbox claim                       |
| q-98     | question                                           | Scope secret mapping requirement accurately                                    |

Primary technical references: [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [environment controls](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments), [CLI commands/permissions](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference), [native hooks](https://docs.github.com/en/copilot/reference/hooks-reference), [SDK hooks](https://docs.github.com/en/copilot/how-tos/copilot-sdk/hooks/pre-tool-use), [current SDK session API](https://github.com/github/copilot-sdk/blob/main/nodejs/README.md), [VS Code MCP](https://code.visualstudio.com/docs/agents/reference/mcp-configuration), [custom-agent configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration), [audit events](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/audit-log-events-for-your-enterprise), and [hidden artifact files](https://github.com/actions/upload-artifact/blob/v4/README.md). Examples are parsed/reviewed as data; no displayed workflow, shell command, SDK call or secret reference is executed.

## Verification and delivery

Shared schema/catalog checks cover all 98 items; immutable source ID/answer and reviewed bank hashes prevent silent drift. Focused browser tests cover search/catalog, both locales/themes and the responsive matrix, all supplied format surfaces, q51 literal Actions expressions, actual native Standard/Learning, reload and locked submitted review. Fixture browser tests abort external requests; separate public HTTP/visual exhibit QA supplies image evidence.

UI skill search `find content navigation --domain ux`: Keyboard Navigation applies to existing catalog actions/targets; preserve visible focus and keyboard operation. Sticky Navigation is already covered by shared dock checks; no autocomplete redesign is needed. Reuse tokens/components and BASE_URL loading.

Record actual verify/browser/Astra results in #100 and its separate MR. Release/develop integration is not production publication; keep public-bank smoke and issue closure after the requested production promotion. No live AI or Firebase account/policy change is part of this data import.
