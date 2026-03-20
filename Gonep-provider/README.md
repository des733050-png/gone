## Gonep Provider Portal – Expo React Native

This is the **Gonep Provider Portal** built with **React Native + Expo**. It gives clinicians and facility staff a web‑first interface for day‑to‑day workflows: dashboard, appointments, EMR, lab, pharmacy, billing, inventory, notifications, and settings.

The architecture intentionally mirrors the GONEP Patient Portal so that frontend developers can move between the apps with minimal context switching.

---

### High‑level architecture

- **Expo + React Native + React Native Web**: Single codebase targeting web today, with Android/iOS ready once the native SDKs are available.
- **Auth → MainShell pattern**: A lightweight auth screen hands off to a persistent shell (`MainShell`) with sidebar + topbar navigation.
- **Design system**: Shared theme context (`src/theme`) and atomic components (`src/atoms`, `src/organisms`) to keep the UI consistent.
- **API layer**: `src/config/env.js` defines `API_CONFIG` and `ENDPOINTS`; `src/api/index.js` uses those to call either mock data or the real backend.

For a deeper breakdown of the architecture and modules, see the `docs/` folder in this project.

---

### Folder structure (frontend)

- `index.js` – Expo entry that registers the root app component.
- `src/`
  - `App.js` (if present) – composition root for theme, SEO, and navigation.
  - `screens/` – feature screens (Dashboard, Appointments, EMR, Lab, Billing, Inventory, Notifications, Profile, Settings) plus the `MainShell`.
  - `atoms/` – small reusable UI building blocks (`Btn`, `Input`, `Card`, `Badge`, `Avatar`, `Icon`).
  - `organisms/` – layout primitives (`Sidebar`, `TopBar`, `ScreenContainer`).
  - `theme/` – design tokens and theme context.
  - `config/env.js` – app and API configuration (see below).
  - `api/` – HTTP client functions calling provider APIs.
  - `mock/` – in‑memory mock data and API functions for local development.
  - `seo/` – simple SEO helpers for the web build.

---

### Environment configuration

Configuration is intentionally split between **public env vars** and **checked‑in config**:

- `.env` (not committed) supplies:
  - `EXPO_PUBLIC_API_MODE` – `'mock'` or `'real'`.
  - `EXPO_PUBLIC_API_BASE_URL` – backend base URL, e.g. `http://localhost:8001`.
  - `EXPO_PUBLIC_PROVIDER_BASE_PATH` – base path for all provider APIs, e.g. `/api/v1/provider`.
  - `EXPO_PUBLIC_DEMO_EMAIL`, `EXPO_PUBLIC_DEMO_PASSWORD` – demo login for test environments only.
- `src/config/env.js` supplies:
  - `API_CONFIG` – `{ BASE_URL, TIMEOUT_MS, MODE }`.
  - `APP_CONFIG` – app name and non‑sensitive app‑level constants.
  - `ENDPOINTS` – per‑feature paths (dashboard, appointments, EMR, billing, inventory, notifications, etc.).

To configure the app for your environment:

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL.
3. Optionally adjust `EXPO_PUBLIC_PROVIDER_BASE_PATH` (e.g. `/api/provider` or `/v2/provider`).
4. Keep any real credentials or secrets **out of git** – only `.env.example` is committed.

---

### Docs for frontend developers

The `docs/` folder (to be kept in this project) explains the frontend in more depth:

- `docs/architecture.md` – high‑level architecture and data flow for the provider portal.
- `docs/frontend-modules.md` – per‑module explanations (screens, atoms, organisms, hooks, theme, config, API).
- `docs/development-notes.md` – how to run, environment setup, and common gotchas.
- `docs/api-contracts.md` – overview of the provider‑facing REST endpoints used by the frontend.
- `docs/state-management.md` – how local state and data‑loading hooks are structured today, and options for scaling (e.g. React Query, Zustand) later.

These documents are written so that a new frontend developer can understand the portal without needing to reverse‑engineer the code.

---

### Install & run

From the `Gonep-provider` folder:

```bash
npm install

# Web (primary target during early development)
npm run web

# Native (requires Android/iOS SDKs)
npm run android
npm run ios
```

