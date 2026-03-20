## Frontend Modules – Provider Portal

This document explains the main frontend modules in the **Gonep Provider Portal** and how they are meant to be used.

---

### `src/screens/MainShell.js` – Authenticated shell

- **Why it exists**
  - Provides the persistent layout (sidebar + topbar + content area) that all authenticated provider screens live inside.
  - Centralizes navigation between provider‑specific sections (Dashboard, Appointments, EMR, Lab, Pharmacy, Billing, Inventory, Notifications, Profile, Settings).
- **How it works**
  - Receives `user`, `onLogout`, and `onUpdateUser` props from the root app.
  - Uses local state (`page`) to decide which feature screen to render.
  - Renders `Sidebar`, `TopBar`, and a `ScreenContainer` around the active screen.

---

### `src/theme/ThemeContext.js` and `src/theme/colors.js`

- **Why they exist**
  - Keep the provider UI visually consistent with the patient and rider portals.
  - Centralize colors and theme decisions so brand and accessibility tweaks are easy.
- **How they work**
  - `colors.js` exports theme tokens for light/dark modes (e.g. `primary`, `bg`, `surface`, `border`, `text`, `danger`).
  - `ThemeContext.js` exposes `ThemeProvider` and `useTheme()`.
  - Atoms and organisms read from `useTheme()` instead of hard‑coding colors.

---

### `src/config/env.js`

- **Why it exists**
  - Single source of truth for provider‑side configuration and API paths.
  - Makes it possible to switch environments (local, staging, production) by editing `.env` and this file, not every screen.
- **How it works**
  - Reads `EXPO_PUBLIC_API_MODE`, `EXPO_PUBLIC_API_BASE_URL`, and `EXPO_PUBLIC_PROVIDER_BASE_PATH` from `.env`.
  - Exports:
    - `API_CONFIG` – base URL, timeout, and mock/real mode.
    - `APP_CONFIG` – provider portal name and demo login (non‑secret).
    - `ENDPOINTS` – per‑feature paths for dashboard, appointments, prescriptions, EMR, lab, inventory, billing, notifications.

---

### `src/api/index.js`

- **Why it exists**
  - Encapsulates HTTP calls away from screens and hooks.
  - Switches between mock data (`src/mock`) and real backend APIs using `API_CONFIG.MODE`.
- **How it works**
  - Imports `API_CONFIG` and `ENDPOINTS` from `src/config/env.js`.
  - Provides high‑level functions (e.g. `getAppointments`, `getPatients`, `getInventory`) that return parsed JSON.
  - Uses a small `httpJson` helper to send JSON requests and handle non‑200 responses.

---

### `src/mock/data.js` and `src/mock/api.js`

- **Why they exist**
  - Allow UX/UI work to continue before provider APIs are fully stable.
  - Provide deterministic sample data for demos and storyboarding.
- **How they work**
  - `data.js` defines in‑memory structures for provider resources (appointments, prescriptions, patients, lab results, inventory, billing, notifications).
  - `api.js` exports async functions that wrap the data with artificial latency to mimic real requests.
  - When `API_CONFIG.MODE === 'mock'`, the API layer delegates to these functions.

---

### `src/hooks/*` – Domain hooks

- **Why they exist**
  - Encapsulate provider‑specific data loading and state management.
  - Give screens a simple API like `useAppointments()` or `useInventory()` instead of duplicating fetch logic.
- **How they work**
  - Each hook calls the relevant API function inside a `useEffect`.
  - They track `loading` and optional `error` state.
  - They return shaped data plus setters for optimistic updates where needed.

---

### `src/atoms/*` – Atoms

- **Examples**: `Btn`, `Input`, `Card`, `Badge`, `Avatar`, `Icon`.
- **Why they exist**
  - Provide reusable, theme‑aware building blocks for all provider screens.
  - Ensure spacing, typography, and interaction states stay consistent.
- **How they work**
  - Wrap React Native primitives (`Pressable`, `TextInput`, `View`, etc.).
  - Read colors and sizing from `useTheme()` and shared style utilities.

---

### `src/organisms/*` – Layout primitives

- **Examples**: `Sidebar`, `TopBar`, `ScreenContainer`.
- **Why they exist**
  - Capture the common shell and layout patterns used across the portal.
  - Keep repetitive markup (padding, background, header layout) out of feature screens.
- **How they work**
  - Receive simple props (e.g. nav items, active page, user, callbacks).
  - Compose atoms into high‑level structures that `MainShell` and screens can reuse.

