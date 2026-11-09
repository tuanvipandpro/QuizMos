# Native drag/drop question format

Tracking: [#103](https://github.com/tuanvipandpro/QuizMos/issues/103). GH-600 bank intake is separate in #100.

Use `type: "drag_drop"`, `slots`, one options map per slot and an answer mapping keyed by slot ID. Native row and inline examples are downloadable from the format guide. The renderer is a choice bank with drop slots; it retains the native type rather than using Select/dropdown controls.

Bank choices are copies and remain reusable. Selecting/dragging a placed answer moves it: its old slot is cleared and the target is replaced. Per-slot Clear or Delete removes only that slot. Invalid drops, Escape, pointer cancellation or interrupted navigation leave answers unchanged. Tap/click or keyboard-select a choice and activate a slot as an equivalent alternative to dragging. Dedicated handles support touch dragging while ordinary choice text leaves normal scrolling available.

Inline templates reference each `{{slotId}}` exactly once. Literal GitHub Actions `${{ expression }}` syntax remains source text, including whitespace/code; it is never executed or treated as an answer placeholder. Unknown/duplicate/missing real slot placeholders fail validation. Original keys and labels remain stable through shuffling, copying, saved drafts and scoring.

A question is complete only when every slot has a valid choice; all slots must match for the whole question to be correct. Existing Practice/Learning/Standard feedback and expiry rules apply. Read-only review shows placements without editable controls. Shared AI input includes every native slot/choice; legacy prompt hashes remain unchanged and no quota/model/output-limit change is part of this feature.

Tests use synthetic examples and local fixtures/emulators. The supplied GH-600 source is validated separately without mutation/import; its 19 native items require literal-code-aware template handling. Native #103 acceptance includes the full viewport/locale/theme/input matrix and separate #80 archive integration. Production publication and live inference remain separately authorized.
