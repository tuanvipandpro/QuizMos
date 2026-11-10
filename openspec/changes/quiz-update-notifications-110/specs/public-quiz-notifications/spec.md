# Spec Delta

## Purpose

Expose reviewed public quiz changes from a safe, accessible header notification surface and refresh bundled public lists without resetting study state.

## ADDED Requirements

### Requirement: CQ-NOTIFY-01 Header discovery and public read state

The system SHALL expose a click/keyboard notification control for guests, auth loading and signed-in users, independent of profile/key/AI IO. It SHALL show validated bank/date/summary entries and bounded device-local new/read state, preserving functionality when storage is unavailable.

#### Scenario: Open and close

- **WHEN** a user activates the bell and closes via Escape or Close
- **THEN** focus enters the notification surface, visible entries become seen, and focus returns to the trigger

#### Scenario: Navigate during an exam

- **WHEN** a notification opens a bank while an exam is active
- **THEN** existing Leave/Cancel guards and draft/deadline semantics apply

### Requirement: CQ-NOTIFY-02 Presentation and provenance

The system SHALL retain public history deep links and internal reviewed source provenance but SHALL NOT display commit hashes or commit links in notifications/history.

#### Scenario: Render reviewed entries

- **WHEN** notification or full update history is rendered
- **THEN** bank/content date/summary/actions are readable with no implementation hash fields

### Requirement: CQ-NOTIFY-03 Genuine safe public refresh

The system SHALL allow explicit refresh of the public Quiz Bank through a verified fresh same-origin document, with busy/error/retry states. It SHALL preserve filter, account-scoped tab drafts/checkpoints/absolute deadlines and SHALL reject stale continuation after route/owner/unmount changes.

#### Scenario: Probe fails

- **WHEN** refresh encounters HTTP/network/invalid-document failure
- **THEN** current list/filter and study storage remain intact with a retry action

#### Scenario: Refresh succeeds or becomes stale

- **WHEN** a current refresh succeeds or an old response returns after navigation/account change
- **THEN** only the current request may reload the same-origin app; stale requests cannot navigate or change study state

### Requirement: CQ-NOTIFY-04 Responsive equivalent access

The system SHALL keep trigger/actions at least44px with visible focus and reachable viewport-bounded content at320/390/412/768/1280 and landscape, in VN/EN, both themes and reduced motion.

#### Scenario: Narrow and landscape

- **WHEN** long notification content appears at a narrow/landscape viewport
- **THEN** content scrolls within the viewport, controls remain reachable and the page has no horizontal overflow
