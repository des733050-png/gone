# GONEP Provider - Architecture Explained

This document explains how the provider portal works in code, and why the architecture uses this pattern.

## 1) High-level design goals

- Keep one codebase for web/mobile.
- Support many provider roles with different access in one shell.
- Allow mock-first development without changing feature code.
- Keep shell behavior (navigation, filters, role gating) centralized.

---

## 2) App boot flow

`App.js` (repo root) is the composition entry:

1. `SafeAreaProvider`
2. `ThemeProvider`
3. `SeoProvider`
4. `RootNavigator`

`RootNavigator` controls:

- `user` authentication state
- onboarding toggle (`showOnboarding`)
- web linking configuration (`PAGE_PATHS`)

If not authenticated -> render `AuthScreen`.
If authenticated -> render `MainShell`.

**Why this type of routing?**

- Keeps auth/onboarding transitions centralized.
- Feature screens stay focused on business workflows.

---

## 3) MainShell as system controller

`src/screens/MainShell.js` is the main orchestration layer.

It owns:

- `ALL_NAV_TREE`: canonical sections/items/sub-items.
- Role filtering for each user.
- `SUB_TO_PAGE`: sub-item -> page/filter mapping.
- `renderPage()`: page key -> concrete screen component.
- shell states (sidebar open, unread notifications, active page/filter).

**Why a single nav tree object instead of scattered constants?**

- One source of truth for visibility rules and navigation structure.
- New menu items can be added without touching many files.

---

## 4) Role-based behavior

Role access is enforced in two layers:

- `config/roles.js`: allowed pages helper.
- `MainShell`: per-item/per-sub-item role filtering.

This double layer keeps both broad permissions and detailed menu behavior explicit.

---

## 5) POS branch

POS users are treated as a special workflow:

- `MainShell` checks `user.role === 'pos'`.
- For POS role, it bypasses normal provider shell and renders `POSScreen` directly.

**Why this branch exists**

- POS is a terminal workflow, not a clinical workflow.
- It needs full-screen focus and separate interaction patterns (cart, checkout, receipt, shift summary).

---

## 6) API architecture (mode-based facade)

`src/api/index.js` is the facade used by screens/hooks.

- `mock` mode -> `src/api/mock/index.js`
- `development` mode -> `src/api/dev/index.js`
- `staging/production` -> `src/api/prod/index.js`

**Why this approach instead of branching inside screens**

- Screens call stable function names and remain environment-agnostic.
- Mock/dev/prod swap is configuration-driven.

---

## 7) Mock state model

`src/mock/api.js` uses module-level mutable arrays as in-memory server state.

Why this type:

- Multiple screens (inventory, POS, billing, pharmacy) can share mutable state in one session.
- Mimics backend behavior closely enough for UI and workflow development.

Trade-off:

- State resets on refresh; persistent correctness still depends on real backend.

---

## 8) Theme persistence

`ThemeContext` persists theme per user key (`gonep_theme_{email}`):

- Web -> `localStorage`
- Native -> `AsyncStorage`

Why per-user storage:

- Shared devices can preserve preferences independently for each login identity.
