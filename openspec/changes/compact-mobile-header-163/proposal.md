# Proposal

## Why

Refs #163. The current mobile header wraps navigation and utilities into multiple rows, taking up to roughly 160px at 320px and obscuring study content. Users need a compact header without losing existing destinations or preferences.

## What Changes

- Use one 60–72px row through the compact breakpoint, containing only the brand and a labelled active-destination left-drawer launcher.
- Put avatar/account/sign-in/loading, quiz-update notifications, Quiz Bank, My quizzes, Donate, theme and VN/EN choices in the compact modal drawer; keep all desktop controls and alignment intact.
- Preserve guarded Exam navigation, notification refresh, account actions, header measurement and study docks. Add responsive/focus/auth-state acceptance coverage.

## Capabilities

### New Capabilities

- `compact-navigation`: Accessible responsive header navigation and utilities with bounded mobile footprint and measured sticky geometry.

### Modified Capabilities

None. Existing account/profile routes and authorization remain unchanged.

## Impact

AppHeader and its responsive CSS, a cohesive media-query hook/menu component, translations and browser fixtures/tests. No backend, data, auth policy, dependency or production rollout change. Own issue PR targets the accepted M2 release; #158 and unmerged #164 remain independent.
