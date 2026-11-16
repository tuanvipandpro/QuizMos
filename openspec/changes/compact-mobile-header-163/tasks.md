# Tasks

## 1. Compact navigation

- [x] 1.1 Implement the responsive labelled menu and shared preference controls for HEADER-01/02 with full destination/access parity; document the boundary and browser-test narrow/desktop height, active route, language/theme and auth states.
- [x] 1.2 Implement bounded popup/focus/resize lifecycle for HEADER-03/04 and preserve existing account/notifications/Exam callbacks; browser-test Escape/outside/action/resize focus, long names/badges, guarded navigation and measured header/dock geometry.

- [x] 1.3 Replace the dropdown with the owner-requested left modal drawer; verify mask/close/Escape exits, contained Tab focus, background scroll lock/cleanup, queued guarded navigation, full viewport/locale/theme/auth matrix and rendered before/after evidence.
- [x] 1.4 Move compact account/auth controls into the drawer with shared inline ownership, keeping the notification bell directly on the header per the owner's final placement; verify account Escape/focus containment, deferred dialogs/guards, notification unread/refresh behavior and responsive/auth-state parity.

## 2. Integration and delivery

- [x] 2.1 Run the full width/locale/theme/auth matrix, relevant route/account/update/study regressions, yarn verify, root artifact checks and redacted staged/outgoing scans; pass current-head CI and prepare the separate issue PR against M2.
- [ ] 2.2 After owner-requested protected merge/promotion, verify post-merge/public responsive acceptance before closing #163.

## Workflow follow-up

- Keep one final issue squash and delayed branch cleanup per Git process; archive only after actual accepted delivery.
