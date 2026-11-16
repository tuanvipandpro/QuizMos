# Design

## Context

Refs #163. AppHeader owns rendering; App.jsx observes its height with ResizeObserver. Existing 900px study/header media rules make a second navigation row, and 320px can reach about 160px. AccountMenu and QuizUpdateNotifications already own their popup state and guarded callbacks. Preserve their behavior, Notebook/History rollout flags and real-account isolation.

## Goals / Non-Goals

One bounded compact row with every destination/preference reachable, measured sticky geometry, full keyboard/touch access and unchanged desktop layout. No auth/data/backend changes, new dependency or header content hidden without an equivalent labelled control. #158 and #164 are independent.

## Decisions

Use the existing 900px compact-layout media subscription. Keep brand (44px), the labelled active-page drawer launcher (flexible) and the notification bell (44px) in one 61px row. The visible current-page label preserves navigation context; updates remain directly discoverable.

The owner subsequently selected a left-side drawer/sidebar. Use the existing Ant Design Drawer with a mask, close button, Escape handling, focus containment and scroll locking. Keep the labelled active-page launcher in the 61px row with a menu icon; desktop remains unchanged. The drawer is at most 320px wide and leaves 48px for mask access on narrow screens, with a scrollable body and 44px controls.

Reuse existing native destination/preference controls. Queue guarded navigation and account dialogs until drawer dismissal completes, so its focus restoration cannot steal focus from the subsequent dialog. Preferences close the drawer after applying; Escape/mask/close return to the persistent trigger. Resize to desktop removes the drawer and restores the brand with scroll lock cleaned up. The portalled drawer never contributes to header measurement.

The owner's final placement keeps compact account utilities inside the drawer and notifications outside. Reuse AccountMenu with inline rendering: a labelled avatar/name button expands the existing account menu in place without nested body portals. Inner Escape closes the expanded account menu first and restores its trigger; a subsequent Escape closes the drawer. Auth loading and guest sign-in also live inside. The notification bell retains its existing bounded standalone dropdown, read-state owner and Escape/focus return behavior on the header. Desktop retains its original dropdowns. No auth/notification IO or rollout policy changes.

## Risks / Trade-offs

Theme/language move one click deeper on compact viewports. Visible menu text, accessible names and preserved group/pressed state mitigate this. Browser tests must open the compact menu before preferences/navigation, while desktop tests keep direct controls. Auth and active-Exam dialogs must retain focus and cancellation semantics through resize/menu dismissal.

## Verification

Compare accepted M2 header before/after at 320/360/390/412, 768, 844 landscape and 1280; VN/EN, both themes, guest/loading/account, long names and badges. Verify height <=72px in compact mode, no overflow, menus reachable by keyboard/touch, dismissal/focus, active destination, notification refresh, guarded Exam Cancel/Leave, and timer/dock/summary regressions. Run yarn verify and relevant browser regressions, root artifact isolation, redacted scans and current-head CI. Physical Samsung testing is not claimed.

## Migration Plan

One #163 PR into work/release-m2-20261113. No production rollout until owner-requested protected promotion; retain issue branch per Git process and leave issue open until delivery acceptance. Rollback restores the previous header without touching saved study data.

## Open Questions

None for header scope. PDF choices are tracked separately in #158.
