# Spec Delta

## Purpose

Provide a compact, accessible responsive application header while preserving routes, preferences, account actions and reliable sticky study geometry.

## ADDED Requirements

### Requirement: HEADER-01 Compact bounded navigation

The system SHALL show a single compact header row no taller than 72 CSS pixels at compact widths, with brand, a labelled launcher exposing visible active-page context and a directly visible notification bell. Account state SHALL be reachable inside its drawer. Desktop alignment SHALL remain brand/navigation left and utilities right.

#### Scenario: Narrow viewport

- **WHEN** the app renders at 320, 360, 390 or 412 CSS pixels in either language/theme
- **THEN** the header has no accidental extra row or horizontal overflow and core controls remain visible

### Requirement: HEADER-02 Equivalent navigation and preferences

The system SHALL keep Quiz Bank, My quizzes, Donate, theme and VN/EN reachable through a labelled left-side modal drawer while preserving bank/provider navigation and all existing account/update actions.

#### Scenario: Compact account and notifications

- **WHEN** a user opens the drawer while signed out, loading or signed in
- **THEN** the corresponding account controls are visible inside and existing account actions expand inline, while notifications remain directly reachable on the header independently of auth loading
- **AND** opening the drawer alone does not mark updates as read; account dialogs and guarded navigation run after drawer closure with usable focus return, while notification dropdown/refresh/read-state and desktop behavior remain unchanged

#### Scenario: Compact preferences

- **WHEN** a user opens the compact menu and changes language or theme
- **THEN** the selected preference is exposed accessibly and all destinations remain reachable without hover

### Requirement: HEADER-03 Keyboard and popup lifecycle

The system SHALL provide labelled native controls with visible focus and 44px touch targets, a viewport-bounded scrollable modal drawer, contained keyboard focus, close-button/mask/Escape dismissal and predictable focus return, including breakpoint changes.

#### Scenario: Drawer containment

- **WHEN** a user opens the compact drawer and tabs through its navigation/preferences
- **THEN** focus stays within the visible drawer until it closes, background scrolling is locked, and mask/close/Escape provide an exit

#### Scenario: Escape and resize

- **WHEN** a focused compact panel is dismissed with Escape or the viewport changes to desktop
- **THEN** it closes and focus returns to an available header control without leaving an orphan popup

### Requirement: HEADER-04 Account and study compatibility

The system SHALL preserve guest/loading/account states, active-Exam navigation confirmation, measured sticky height and study timer/navigation/explanation access without changing drafts, checkpoints or rollout controls.

#### Scenario: Guarded navigation

- **WHEN** a running Exam user selects a destination through the compact menu and cancels the leave dialog
- **THEN** the active Exam, answers and absolute deadline are unchanged and focus remains usable
