# Spec Delta

## Purpose

Provide a compact, accessible responsive application header while preserving routes, preferences, account actions and reliable sticky study geometry.

## ADDED Requirements

### Requirement: HEADER-01 Compact bounded navigation

The system SHALL show a single compact header row no taller than 72 CSS pixels at compact widths, with brand, visible active-page context, notifications and account state. Desktop alignment SHALL remain brand/navigation left and utilities right.

#### Scenario: Narrow viewport

- **WHEN** the app renders at 320, 360, 390 or 412 CSS pixels in either language/theme
- **THEN** the header has no accidental extra row or horizontal overflow and core controls remain visible

### Requirement: HEADER-02 Equivalent navigation and preferences

The system SHALL keep Quiz Bank, My quizzes, Donate, theme and VN/EN reachable through a labelled compact menu while preserving bank/provider navigation and all existing account/update actions.

#### Scenario: Compact preferences

- **WHEN** a user opens the compact menu and changes language or theme
- **THEN** the selected preference is exposed accessibly and all destinations remain reachable without hover

### Requirement: HEADER-03 Keyboard and popup lifecycle

The system SHALL provide labelled native controls with visible focus and 44px touch targets, viewport-bounded scrollable popups, Escape/outside dismissal and predictable focus return, including breakpoint changes.

#### Scenario: Escape and resize

- **WHEN** a focused compact panel is dismissed with Escape or the viewport changes to desktop
- **THEN** it closes and focus returns to an available header control without leaving an orphan popup

### Requirement: HEADER-04 Account and study compatibility

The system SHALL preserve guest/loading/account states, active-Exam navigation confirmation, measured sticky height and study timer/navigation/explanation access without changing drafts, checkpoints or rollout controls.

#### Scenario: Guarded navigation

- **WHEN** a running Exam user selects a destination through the compact menu and cancels the leave dialog
- **THEN** the active Exam, answers and absolute deadline are unchanged and focus remains usable
