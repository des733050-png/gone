## GONEP Rider Portal – Architecture

This document explains **why** the rider portal is structured the way it is and **how** the main pieces fit together.

---

### 1. High‑level goals

- **Role‑specific UX** for riders handling deliveries (not for patients or providers).
- **Single codebase** for web and (future) mobile via Expo + React Native.
- **Consistent design system** shared with the other GONEP frontends.
- **Clear separation** between layout, UI components, and data‑loading code.

---

### 2. Platform & runtime

**Choice**: Expo + React Native + React Native Web

- **Why**
  - Aligns with the patient and provider portals.
  - Expo simplifies builds, OTA updates, and dev tooling.
  - React Native Web lets us reuse components for the web without rewriting everything.
- **How**
  - `expo` runs a Metro dev server.
  - On web, React Native primitives render to DOM.
  - On Android/iOS, the same JSX renders to native views once SDKs are available.

---

### 3. Shell and navigation

**Choice**: Auth screen + `MainShell` layout.

- **Why**
  - Riders need a persistent frame that surfaces their current workload, status, and navigation.
  - Separating auth from the shell keeps login logic focused and testable.
- **How**
  - After authentication, the app renders `src/screens/MainShell.js`.
  - `MainShell` composes:
    - `Sidebar` – navigation between Dashboard, Requests, Active Delivery, Earnings, Trips, Chat, Notifications, Profile, Settings.
    - `TopBar` – page title, rider status, notifications, user menu, theme toggle.
    - `ScreenContainer` – wrapper for the current feature screen.

---

### 4. Design system & theming

**Choice**: Shared theme in `src/theme`.

- **Why**
  - Maintains visual consistency across patient, provider, and rider portals.
  - Centralizes brand colors, spacing, and typography.
- **How**
  - `src/theme/colors.js` defines light/dark palettes by semantic names.
  - `src/theme/ThemeContext.js` exposes `ThemeProvider` and `useTheme()`.
  - Atoms and organisms pull colors and styles from `useTheme()` instead of hard‑coding values.

---

### 5. UI layering (atoms, organisms, screens)

**Choice**: `atoms` → `organisms` → `screens`.

- **Atoms (`src/atoms`)**
  - Buttons, inputs, cards, badges, avatar, icon.
  - Small, theme‑aware primitives reused across the app.
- **Organisms (`src/organisms`)**
  - `Sidebar`, `TopBar`, `ScreenContainer`.
  - Layout‑level components that define the rider shell.
- **Screens (`src/screens`)**
  - Rider‑specific feature screens including:
    - `Dashboard`
    - `Requests`
    - `ActiveDelivery`
    - `Earnings`
    - `TripHistory`
    - `Chat`
    - `Notifications`
    - `Profile`
    - `Settings`

---

### 6. API, config, and mocks

**Choice**: Config‑driven endpoints + mock layer.

- **Config (`src/config/env.js`)**
  - Reads:
    - `EXPO_PUBLIC_API_MODE`
    - `EXPO_PUBLIC_API_BASE_URL`
    - `EXPO_PUBLIC_RIDER_BASE_PATH`
  - Exports:
    - `API_CONFIG` – base URL, timeout, mode.
    - `APP_CONFIG` – rider portal name and demo login (non‑secret).
    - `ENDPOINTS` – rider‑specific endpoint paths (dashboard, requests, active delivery, earnings, trips, notifications, messages, rider status).
- **API (`src/api/index.js`)**
  - Uses `API_CONFIG` and `ENDPOINTS` to build full URLs.
  - Switches between mock functions and real HTTP based on `API_CONFIG.MODE`.
- **Mocks (`src/mock`)**
  - `data.js` contains in‑memory riders, requests, deliveries, earnings, trips, notifications, messages.
  - `api.js` simulates network calls with delays and returns that data.

---

### 7. Future directions

- Add richer state management (React Query, Zustand) if data flows grow.
- Introduce push or real‑time updates for requests/active deliveries.
- Factor out truly shared components into a shared UI/data package used by all portals.

