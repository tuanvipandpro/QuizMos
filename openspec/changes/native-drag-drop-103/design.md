# Design

## Context

See [proposal](proposal.md). At intake, questionModel accepted MC, yes_no and dropdown only. StructuredQuestion owns the common card, completion and feedback; studySession owns drafts/deadlines. GH-600 has 19 mapped drag_drop items using rows/inline templates. History #80 is unmerged; its snapshot integration stays in MR #92. Governance #99 and baseline sync #102 are merged; this branch uses M1 release baseline 4bac829. Production promotion #101 remains open and is separately authorized.

## Goals / Non-Goals

**Goals:** native cross-input placement with stable mappings and shared grading, minimal dependencies and honest integration evidence.

**Non-Goals:** dropdown conversion, GH-600 publication, global prompt/model/quota changes, production Rules/data/inference, or duplicating #74/#80 into this feature diff.

## Decisions

1. Extend the distinct validated type union and existing structured helpers. Slots/answers retain mappings; layouts reuse the template/part contract. Native inline parsing excludes literal GitHub Actions `${{ expression }}` syntax while validating each real slot placeholder exactly once. Keep bank identity as original key plus text, deduplicating identical choices across slots while supporting different slot option sets. Pure assignment helpers validate compatibility, sanitize mapping state, copy reusable bank choices and move an existing placement by clearing its source/replacing its target. Invalid/cancelled operations change nothing.
2. Keep common card/grading feedback in StructuredQuestion; render a focused native answer area rather than Select controls. A hook owns Pointer Events, capture, movement threshold, hover/ghost and scroll cleanup; utilities own assignment decisions. Separate 44px handles use touch-action:none, while ordinary text/select controls retain page scrolling. Tap or keyboard selection followed by target activation is equivalent. Escape cancels; per-slot Clear/Delete removes only that mapping. Read-only banks/placements are static content.
3. Use an internal gesture descriptor, not external dataTransfer payloads. Recheck the current question/read-only state before committing. Cancel/release capture and frame work on question/owner/unmount/expiry changes. Use the existing scroll target helper for autoscroll, with a window fallback when a body target cannot scroll; keep this correction local to the gesture hook. Normal motion uses token-based state changes; pointer following remains immediate and reduced motion needs no animation.
4. Reuse the scorer: all slots complete, all mapping keys correct, one question outcome. Parent modes retain correctness gating and deadline rejection. No answer migration or identity change is needed. Existing formats/fingerprints remain unchanged. New type serialization is explicit; native-only prompt guidance leaves prior-format prompt bytes unchanged (recorded hashes) and cannot collide with previously rejected type payloads. Preserve existing input/output/quota/Free/BYOK limits and use Worker stubs.
5. Add two purposeful native example files/format-guide entries. Verify custom model and real demo Rules envelope compatibility; no production policy publication. Adapt History's existing snapshot/review path in its own #80 MR and verify a local integration without copying that feature here. No grader-policy rewrite of old archives.

## Risks / Trade-offs

- Touch dragging conflicts with scrolling → dedicated handles, threshold, scroll-safe choice bodies and tap alternative.
- Long choices move offscreen → wrapping, bounded ghost, pointer autoscroll and select/place alternative.
- Stale captures target another question → current descriptor checks and deterministic cleanup; actual adversarial E2E.
- Scope crosses shared Worker/history contracts → regression fixtures and separate #80 integration; no live inference or snapshot regrading.
- Release still lacks #74/#80 → verify those dependencies through a local shared integration, retain their separate MRs, and do not claim integration evidence as production acceptance.

## Verification matrix

| Requirement | Evidence                                                                                                                                                                                          | Status                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| CQ-DD-01    | Domain/malformed-schema tests; 98/98 unchanged GH-600 source items validate, including 19 native items; SHA-256 `66e8286a485b1b37f4dc80d3666edd9e4956bac1ea45da47160d8be9e1cb03cf`                | Local pass; no bank import                      |
| CQ-DD-02    | Pure reuse/move/replace/clear tests and actual CDP touch/mouse dragging, autoscroll, tap/keyboard, invalid drop and Escape E2E                                                                    | Local pass                                      |
| CQ-DD-03    | Actual Practice/Standard/Learning mapping restore and feedback; submitted static controls and expiry during captured drag                                                                         | Local pass including shared archive integration |
| CQ-DD-04    | Same-ID replacement, StrictMode read-only/unmount, account change during capture, preserved deadline/answers after expiry                                                                         | Local pass                                      |
| CQ-DD-05    | Custom-model/Rules envelopes; Worker/D1 input/quota stubs; five pre-change prompt hashes; literal code/copy/shuffle/fingerprint tests                                                             | Local pass including separate #80 integration   |
| CQ-DD-06    | Row/inline long-text matrix at 320/360/390/412/768/1280 and 844x390; VN/EN, light/dark, normal/reduced motion, 44px targets, contrast and keyboard focus; rendered narrow/inline images inspected | Local Chromium emulation pass                   |

The native implementation passes `yarn verify` (216 Node tests), `yarn test:worker` (17), `yarn worker:check`, demo `yarn test:rules` (17), and final native E2E (26). Both original Astra findings were fixed: the entire visible slot accepts drops, and read-only transitions discard transient selection. Final read-only review at 33413c1 found no remaining actionable findings; Astra independently ran 13 model/prompt checks. The fixture-only status locator was scoped to exclude the synthetic output, preserving expected text/timeouts.

Separate History MR #92 now preserves native slots and derives format regression cases from the registry. Its issue-only head passes `yarn verify` (237). Ignored integration 34cc868 combines dock f3cf769, History projection df5c768 and the final native changes: production build/fixture isolation, 27 demo Rules cases, 32 History E2E cases and 32 focused archive/domain/build tests pass. Both native layouts archive/replay in Standard/Learning, preserving original mappings and stored outcomes.

The broad b8246f7 browser run recorded 206 passes, four load/reload timeouts and two intentional phone-only skips. All four failures passed focused reruns: the native reload case is included in the final 26-case pass; BYOK/Standard cases passed a four-case rerun with unchanged assertions/timeouts. This is not reported as a clean full-suite pass. Rendered final narrow row/inline and read-only screenshots were inspected. Local results use Chromium emulation/fixtures/emulators; physical-device, production policy and live-inference acceptance are not claimed.

Implementation MR #104 targets the accepted M1 release. Required latest-head hosted checks and owner-requested integration/promotion plus public native smoke remain delivery gates; task 4.3 stays open.

UI skill query `dragging movements --domain ux` matched **Dragging Movements**; provide single-pointer and keyboard alternatives. React query `pointer event cleanup --stack react` matched **Clean up effects** and **Avoid unnecessary effects**; use event handlers for gestures and effects only for resource lifecycle. Native-only size units do not replace this app's 44 CSS-pixel requirement.

## Migration Plan

Land the checked native-format MR on the M1 release after governance baseline sync; coordinate #89 lifecycle and #80 snapshots before their final acceptance. The shared validator/prompt ownership causes frontend and backend CI/release selection; keep verified Worker deployment before frontend activation through the existing pipeline. Import GH-600 separately under #100 after native support is accepted. Roll back client/code coherently without rewriting stored mappings or bank IDs. Run real production smoke only after requested promotion. After implementation/tests, call the user-requested Astra reviewer and fix actionable findings before delivery.
