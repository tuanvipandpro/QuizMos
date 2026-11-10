# Design

## Context

The catalog/update registry is bundled with the app; re-reading the same JS array would not obtain a new deployment. App owns navigation/exam guards and account-scoped study sessions; header is a shared component. Main specs currently contain only user-profile-access, which is unaffected.

## Goals / Non-Goals

Goals: public reachable notifications, clear new/read state, no technical provenance UI, real refresh with error/stale-response safety and 320px support.

Non-goals: live catalog backend/polling, remote notification state, cloud quiz reload, source/answer/schema migrations, GitHub OAuth, automatic merges/deployment.

## Decisions

1. Use Ant Design Dropdown with a custom non-modal dialog/list, click trigger and controlled open state. Initial focus enters the close control; Escape/Close restore bell focus, outside click preserves the clicked target. Link actions use existing onNavigate/exam guards. Keep public history deep links/footer entry.
2. Read state is device-local public update IDs, versioned/bounded/validated by a service; storage failures fall back to session memory. No profile/key/quota IO. Mark only displayed validated entries when opened. A new entry ID yields a new badge on a later build.
3. Public Quiz Bank refresh is deliberately a shell reload to load the deployed catalog bundle. A no-store same-origin document probe verifies HTML before navigation; network/HTTP errors retain the current list/filter. Preserve BASE_URL/current route and put filter in the library hash, adding only a document cache-buster. No draft/checkpoint/session clearing or fresh-exam token. Refresh exists on library only, with loading/error/retry feedback. Hook epochs and AbortController cancel on route/owner/unmount, prevent duplicate requests and ignore late responses.
4. Keep provenance validation/sourceRevision internally, render date/name/summary only in popup and history. Reuse translations/tokens and shared validation; no user-facing build/hash/IO implementation fields.
5. Extend responsive header grid for the new 44px control; compact brand text where content cannot fit. Popup is bounded by viewport/header/safe area and scrolls in landscape. Keep navigation left, utilities right and source bank-first behavior.

## Risks / Trade-offs

A reload requires network; probe failure stays usable, but navigation-time network loss uses browser behavior. Existing content-version invalidation remains unchanged. The user confirmed refresh covers the public Quiz Bank and update list; saved-cloud management retains its own reload boundary. No reload is allowed to race into an active exam through stale response. Device read state is not account/cloud-synced; blocked storage keeps read state only in the mounted header.

## Verification

Unit: preference malformed/blocked storage, same-origin/base/filter URL, HTTP/network/redirect failures, abort. Browser: guest/auth-loading/account visibility, badge/read persistence, keyboard/tap/outside/Escape/focus, empty/long lists, no hash display, existing full history/CTFL/GH600 links, active-exam guard, refresh failure/retry/busy/route-owner races and persisted draft/deadline. Full responsive/locales/themes/motion/44px/contrast matrix plus rendered screenshots. Run yarn verify and relevant E2E; record real results in issue/PR, no production tests or real accounts/AI.

UI search `notification menu keyboard --domain ux` matched Keyboard Navigation (used); Skip Links retained; Mobile Keyboards is irrelevant. React search `cancel stale async requests --stack react` returned no result; retry `effect cleanup --stack react` matched Clean up effects and Specify dependencies correctly, applied through abort/context cleanup. Use pinned local references/AntD5 types, not AntD6-only API.

### Acceptance matrix

| Requirement  | Evidence                                                                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ-NOTIFY-01 | `quizNotifications.test.js` preference validation; `quizNotifications.spec.js` keyboard, read persistence, auth loading/owner/blocked-storage and empty-list cases                      |
| CQ-NOTIFY-02 | Notification/history no-hash assertions; updated `accountWorkspace.spec.js` and `gh600Bank.spec.js` retain reviewed dates, bank links and Back                                          |
| CQ-NOTIFY-03 | Unit origin/base/filter/probe/error/abort checks; browser real reload, failed refresh/retry, duplicate and late route/owner cases; persisted exam answers/questions/deadline comparison |
| CQ-NOTIFY-04 | Browser geometry, 44px targets, text contrast, focus and screenshots at 320/360/390/412/768/1280 and 844x390; VN/EN, light/dark, reduced/default motion                                 |

Local targeted regression: all 54 desktop/phone cases passed across notification, account workspace, GH-600 and study layout suites. Rendered 320px VN/dark, landscape VN/dark and 1280px EN/light long-content screenshots were inspected. This is Chromium browser emulation, not physical Samsung testing. Disposable screenshots/logs remain under ignored `artifacts/notification-ui/`. Full verification and latest-head CI are recorded in #110/its PR; delivery remains open until requested integration and public smoke.

## Rollout

Issue PR targets active M1 release; squash/cleanup follow Git process. Keep issue open through requested production delivery and applicable public smoke. Roll back UI/hook code without altering banks, owner sessions or internal update provenance; public read preference may be ignored safely.
