## Gonep Provider Portal – Architecture

This document explains **why** the current architecture was chosen for the provider portal and **how** the main pieces fit together.

---

### 1. High‑level goals

- **Role‑specific UX** for clinicians and facility staff (not patients or riders).
- **Single codebase** for web and (future) mobile via Expo + React Native.
- **Consistent design system** shared across GONEP frontends.
- **Clear separation** between UI, layout, and data access.
- **Config‑driven APIs** so backend paths can change without screen rewrites.

---

### 2. Platform & runtime

**Choice**: Expo + React Native + React Native Web

- **Why**
  - Same technology stack as the patient and rider portals.
  - Expo simplifies bundling, dev server, and native builds.
  - React Native Web lets us reuse most components for the browser.
- **How**
  - `expo` runs a Metro dev server.
  - On web (`npm run web`), React Native primitives (`View`, `Text`, etc.) render to DOM.
  - On Android/iOS, the same JSX renders to native views once SDKs are configured.

---

### 3. App shell and navigation

**Choice**: Auth screen + `MainShell` layout.

- **Why**
  - Providers need a persistent shell with sidebar navigation and a top bar showing context (current user, notifications, actions).
  - Separating auth from the main shell keeps the login flow simple.
- **How**
  - Auth state is managed at the app/root level (see `src/screens/Auth` and the root navigation).
  - After login, the user is taken into `src/screens/MainShell.js`.
  - `MainShell` composes:
    - `Sidebar` – primary navigation between modules.
    - `TopBar` – page title, user menu, notifications, theme toggle.
    - `ScreenContainer` – wraps the active feature screen.

---

### 4. Design system & theming

**Choice**: Shared design tokens and theme context in `src/theme`.

- **Why**
  - Provider UI should stay visually aligned with the other portals.
  - Branding and color changes must be centralized, not scattered.
- **How**
  - `src/theme/colors.js` defines semantic tokens (primary, background, surface, success, danger, text, etc.).
  - `src/theme/ThemeContext.js` exposes a `ThemeProvider` and `useTheme` hook.
  - Atoms and organisms read colors from `useTheme`, so updating the theme updates the entire portal.

---

### 5. UI layering (atoms, organisms, screens)

**Choice**: `atoms` → `organisms` → `screens`.

- **Atoms (`src/atoms`)**
  - Small, reusable components: buttons, inputs, cards, badges, avatar, icon.
  - Encapsulate visual details and theme usage.
- **Organisms (`src/organisms`)**
  - Layout‑level components like `Sidebar`, `TopBar`, and `ScreenContainer`.
  - Combine atoms into reusable layout patterns.
- **Screens (`src/screens`)**
  - Feature‑level components:
    - `Dashboard`
    - `Appointments`
    - `Pharmacy`
    - `EMR`
    - `Lab`
    - `Billing`
    - `Inventory`
    - `Notifications`
    - `Profile`
    - `Settings`
  - Screens focus on data flow and composition, not low‑level styling.

---

### 6. API, config, and mocks

**Choice**: Config‑driven endpoints in `src/config/env.js` plus a thin API client and mock layer.

- **Why**
  - Providers consume many backend resources (appointments, prescriptions, EMR, lab, billing, inventory, notifications).
  - Base URLs and paths change over time; they should live in one place.
- **How**
  - `src/config/env.js` exports:
    - `API_CONFIG` – `{ BASE_URL, TIMEOUT_MS, MODE }`.
    - `APP_CONFIG` – app name and demo credentials (non‑secret).
    - `ENDPOINTS` – per‑feature paths, built from `EXPO_PUBLIC_PROVIDER_BASE_PATH`.
  - `src/api/index.js`:
    - Reads `API_CONFIG` and `ENDPOINTS`.
    - Switches between mock and real HTTP calls based on `API_CONFIG.MODE`.
    - Centralizes error handling and headers.
  - `src/mock`:
    - `data.js` holds example provider‑side data (appointments, patients, prescriptions, etc.).
    - `api.js` returns Promises that mirror real network calls.

---

### 7. Notifications and real‑time-ish flows

Currently, notifications are fetched via polling from the notifications endpoint. If you later add websockets or push notifications, the recommendation is:

- Keep connection management in a dedicated module or hook.
- Use that module to update feature‑level hooks (appointments, notifications, etc.), not individual screens.

---

### 8. Future directions

- Replace mocks with real HTTP calls for all modules once backend contracts stabilize.
- Introduce a data layer (e.g. React Query/Zustand) if the number of networked screens grows.
- Add audit logging and analytics hooks at navigation boundaries.
- Align provider, patient, and rider portals even more by extracting shared atoms/organisms into a shared package when the projects mature.

