# GONEP Provider — Architecture

## Overview
React Native + Expo web application. Runs on web (primary), iOS, and Android.
Single codebase, multiple deployment targets via Expo.

## Folder structure
```
src/
  api/              ← API router + 3 environment layers
    index.js        ← SINGLE import point for all screens — routes by MODE
    mock/index.js   ← delegates to src/mock/api.js, no network calls
    dev/index.js    ← real HTTP to localhost:8001
    prod/index.js   ← real HTTP + bearer token auth + error reporting

  config/
    env.js          ← API_CONFIG, ENDPOINTS, IS_MOCK, IS_DEV, IS_STAGING, IS_PROD
    roles.js        ← ROLES enum, ROLE_NAV (per-role page access), helpers

  mock/
    data.js         ← All mock data constants + MOCK_DELAY_MS dev config
    api.js          ← In-memory mutable state + all mock mutations

  screens/
    MainShell.js    ← Auth shell: nav tree, page routing, sidebar, topbar
    clinical/       ← Dashboard, Appointments, Availability, EMR, Lab, Pharmacy
    operations/     ← Billing, Inventory, Staff, Logs, Analytics, SupportTickets
    account/        ← Notifications, Profile, Settings
    auth/           ← Auth (login), Onboarding (hospital registration)
    pos/            ← POSScreen (full-screen POS terminal, bypasses MainShell)

  organisms/
    Sidebar.js      ← Sectioned sidebar with collapsible nav groups + sub-items
    TopBar.js       ← Header: title, notifications badge, user menu (Sign Out)
    ScreenContainer.js ← Scroll/padding wrapper used by all content screens

  atoms/            ← Btn, Card, Badge, Icon, Avatar, Input
  theme/            ← ThemeContext (persistent by email), colors (light/dark)
  hooks/            ← useInventory, useAppointments (data + reload + error)
  seo/              ← PageSeo, SeoProvider, meta (web <head> management)
```

## Environment switching
Set `EXPO_PUBLIC_API_MODE` in the appropriate .env file:
- `mock`        → all data from src/mock, zero network (default, for all UI dev)
- `development` → real HTTP to `EXPO_PUBLIC_API_BASE_URL` (local backend)
- `staging`     → real HTTP to staging server
- `production`  → real HTTP + bearer token + error monitoring hooks

All screens import exclusively from `src/api` — never from `src/api/mock` directly.
This ensures the environment layer swap requires exactly one config change.

## Nav tree and role gating
`MainShell.js` owns `ALL_NAV_TREE` — the canonical definition of all sections,
nav items, sub-items, and which roles can see each. `Sidebar.js` receives the
filtered `navTree` (already role-filtered in `MainShell`) and renders sections
with collapsible groups.

Sub-items map to page + filter combos via `SUB_TO_PAGE` in `MainShell.js`.
Tapping "Unassigned" in the Appointments sub-menu navigates to the appointments
page with `filter='unassigned'` passed as a prop — the screen applies it.

## POS role
The `pos` role bypasses `MainShell` entirely. `App.js` detects `user.role === 'pos'`
and renders `POSScreen` directly with no sidebar. POS accounts are created by
hospital_admin in the Staff screen.

## Theme persistence
`ThemeContext` stores dark/light preference in localStorage (web) or AsyncStorage
(native), keyed by `gonep_theme_{user.email}`. Called via `setUserKey(user.email)`
immediately after successful login in `App.js`. Pre-login falls back to the
device default (light). This means two different users on the same device keep
independent theme preferences.
