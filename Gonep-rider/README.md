## GONEP Rider Portal – Expo React Native

This is the **GONEP Rider Portal** built with **React Native + Expo**. It gives delivery riders a focused interface for handling requests, active deliveries, earnings, trip history, chat, notifications, and account settings.

The architecture mirrors the patient and provider portals so that frontend developers can share patterns and components across all three apps.

---

### High‑level architecture

- **Expo + React Native + React Native Web**: Single codebase that targets web first, with native builds available once Android/iOS SDKs are configured.
- **Auth → MainShell pattern**: After login, riders land in `MainShell`, which provides a persistent sidebar + topbar shell around feature screens.
- **Design system**: Shared theme context (`src/theme`) and atomic components (`src/atoms`, `src/organisms`) for consistent look and feel.
- **API layer**: `src/config/env.js` defines `API_CONFIG` and `ENDPOINTS`; `src/api/index.js` uses these to call either mock or real rider APIs.

See the `docs/` folder in this project for deeper explanations.

---

### Folder structure (frontend)

- `index.js` – Expo entry that registers the root app component.
- `src/`
  - `App.js` (if present) – root composition for theme, SEO, and navigation.
  - `screens/` – feature screens: Dashboard, Requests, Active Delivery, Earnings, Trip History, Chat, Notifications, Profile, Settings, plus `MainShell`.
  - `atoms/` – small reusable UI elements (`Btn`, `Input`, `Card`, `Badge`, `Avatar`, `Icon`).
  - `organisms/` – shared layout components (`Sidebar`, `TopBar`, `ScreenContainer`).
  - `theme/` – design tokens and theme context.
  - `config/env.js` – app and API configuration (see below).
  - `api/` – HTTP client functions for rider APIs.
  - `mock/` – in‑memory data and API functions for local development.
  - `seo/` – SEO helpers for the web build.

---

### Environment configuration

Public configuration lives partly in `.env` and partly in `src/config/env.js`:

- `.env` (not committed) supplies:
  - `EXPO_PUBLIC_API_MODE` – `'mock'` or `'real'`.
  - `EXPO_PUBLIC_API_BASE_URL` – backend base URL, e.g. `http://localhost:8001`.
  - `EXPO_PUBLIC_RIDER_BASE_PATH` – base path for all rider APIs, e.g. `/api/v1/rider`.
  - `EXPO_PUBLIC_DEMO_EMAIL`, `EXPO_PUBLIC_DEMO_PASSWORD` – demo login for non‑production environments.
- `src/config/env.js` supplies:
  - `API_CONFIG` – `{ BASE_URL, TIMEOUT_MS, MODE }`.
  - `APP_CONFIG` – app name and other non‑sensitive constants.
  - `ENDPOINTS` – per‑feature paths (dashboard, requests, active delivery, earnings, trips, notifications, messages, rider status).

To configure the app:

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL.
3. Optionally change `EXPO_PUBLIC_RIDER_BASE_PATH` to match your backend routing.
4. Keep real credentials and secrets **only** in `.env` – never in git.

---

### Docs for frontend developers

The `docs/` folder in this repo is the entry point for understanding the rider portal:

- `docs/architecture.md` – overall architecture and how rider flows are modeled.
- `docs/frontend-modules.md` – modules overview (screens, hooks, theme, config, API).
- `docs/development-notes.md` – how to run the app and common development notes.
- `docs/api-contracts.md` – HTTP endpoints the rider portal depends on.
- `docs/state-management.md` – current approach to local state and data loading, plus guidance for evolving it.

---

### Install & run

From the `Gonep-rider` folder:

```bash
npm install

# Web (primary during early development)
npm run web

# Native (requires Android/iOS SDKs)
npm run android
npm run ios
```

