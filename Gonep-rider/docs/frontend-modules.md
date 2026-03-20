## Frontend Modules – Rider Portal

This document walks through the main frontend modules in the **GONEP Rider Portal**.

---

### `src/screens/MainShell.js`

- **Role**
  - Authenticated shell for riders after login.
  - Owns which page is currently active and wires in the sidebar/topbar.
- **Key responsibilities**
  - Maintain `page` state for navigation.
  - Fetch unread notifications count.
  - Pass user and callbacks into `Sidebar` and `TopBar`.
  - Render the appropriate feature screen (Dashboard, Requests, Active Delivery, Earnings, etc.).

---

### `src/theme/ThemeContext.js` & `src/theme/colors.js`

- **Role**
  - Provide a shared theme API (light/dark, tokens) consistent with other portals.
- **Details**
  - `colors.js` defines semantic colors.
  - `ThemeContext.js` exposes `ThemeProvider` and `useTheme()`.
  - Atoms and organisms rely on `useTheme()` when styling.

---

### `src/config/env.js`

- **Role**
  - Central configuration for rider‑side env and API paths.
- **What it exports**
  - `API_CONFIG` – base URL, timeout, mode (`mock` or `real`).
  - `APP_CONFIG` – rider app name and demo login (public).
  - `ENDPOINTS` – URL fragments for rider workflows (dashboard, requests, active delivery, earnings, trips, notifications, messages, rider status).

---

### `src/api/index.js`

- **Role**
  - HTTP client facade for the rider portal.
- **How it works**
  - Imports `API_CONFIG` and `ENDPOINTS`.
  - Provides functions like `getRequests`, `getActiveDelivery`, `getEarnings`, `getTrips`, `getNotifications`, `getMessages`, `updateRiderStatus`.
  - Uses a single `httpJson` helper and a `withBase` helper to compose full URLs.
  - Switches between mock data and real endpoints based on `API_CONFIG.MODE`.

---

### `src/mock/data.js` & `src/mock/api.js`

- **Role**
  - Provide deterministic sample data and fake network calls for local dev.
- **Usage**
  - When in mock mode, `src/api/index.js` delegates to `src/mock/api.js`.
  - Shapes should mirror the real backend so swapping to real APIs is smooth.

---

### `src/hooks/*` – Rider domain hooks

- **Examples**
  - `useRequests`, `useEarnings`.
- **Role**
  - Encapsulate data loading and state for a given rider domain.
- **Pattern**
  - Call the relevant API function in a `useEffect`.
  - Track `loading` and optional `error` state.
  - Return data and, optionally, setters for local updates.

---

### `src/atoms/*` and `src/organisms/*`

- **Atoms**
  - `Btn`, `Input`, `Card`, `Badge`, `Avatar`, `Icon`.
  - Provide consistent, theme‑aware building blocks for rider screens.
- **Organisms**
  - `Sidebar`, `TopBar`, `ScreenContainer`.
  - Define shell and layout patterns reused across screens.

