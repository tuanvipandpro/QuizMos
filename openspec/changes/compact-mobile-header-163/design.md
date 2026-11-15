# Design

## Context

Refs #163. AppHeader owns rendering; App.jsx observes its height with ResizeObserver. Existing 900px study/header media rules make a second navigation row, and 320px can reach about 160px. AccountMenu and QuizUpdateNotifications already own their popup state and guarded callbacks. Preserve their behavior, Notebook/History rollout flags and real-account isolation.

## Goals / Non-Goals

One bounded compact row with every destination/preference reachable, measured sticky geometry, full keyboard/touch access and unchanged desktop layout. No auth/data/backend changes, new dependency or header content hidden without an equivalent labelled control. #158 and #164 are independent.

## Decisions

Use the existing 900px compact-layout media subscription to avoid a competing breakpoint. Keep brand (44px), labelled active-page menu (flexible), quiz-update bell and account/sign-in/loading controls in one 61px row. A second navigation row still consumes too much vertical space; an icon-only hamburger loses useful current-page context. A labelled active-page dropdown provides both compactness and discoverability.

Render a bounded modeless navigation/preferences panel with native destination buttons (Quiz Bank, My quizzes, Donate), theme and VN/EN controls. Reuse existing Ant Design Dropdown and tokens; retain desktop navigation/utilities. Menu actions close and return focus to the persistent trigger before guarded navigation/dialogs. Escape closes with focus return; outside dismissal preserves the user's new focus. Resize unmounts the compact panel and returns focus to the persistent brand when necessary. Clean up scheduled focus/subscriptions.

Keep account and notification popups as existing owners; opening a peer dismisses the other through outside-trigger behavior. Bound all popups within the viewport, allow vertical scrolling in landscape, and retain 44px targets. Existing header measurement sees only the compact row, not the portalled panel. Scope overrides beneath the compact header class rather than changing study/nav geometry globally.

## Risks / Trade-offs

Theme/language move one click deeper on compact viewports. Visible menu text, accessible names and preserved group/pressed state mitigate this. Browser tests must open the compact menu before preferences/navigation, while desktop tests keep direct controls. Auth and active-Exam dialogs must retain focus and cancellation semantics through resize/menu dismissal.

## Verification

Compare accepted M2 header before/after at 320/360/390/412, 768, 844 landscape and 1280; VN/EN, both themes, guest/loading/account, long names and badges. Verify height <=72px in compact mode, no overflow, menus reachable by keyboard/touch, dismissal/focus, active destination, notification refresh, guarded Exam Cancel/Leave, and timer/dock/summary regressions. Run yarn verify and relevant browser regressions, root artifact isolation, redacted scans and current-head CI. Physical Samsung testing is not claimed.

## Migration Plan

One #163 PR into work/release-m2-20261113. No production rollout until owner-requested protected promotion; retain issue branch per Git process and leave issue open until delivery acceptance. Rollback restores the previous header without touching saved study data.

## Open Questions

None for header scope. PDF choices are tracked separately in #158.
