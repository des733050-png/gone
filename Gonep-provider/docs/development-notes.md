## Development Notes – Provider Portal

This document covers practical notes for running and extending the **Gonep Provider Portal**.

---

### Running the app

- From the `Gonep-provider` directory:

```bash
npm install

# Web (primary during early development)
npm run web

# Native (requires SDKs)
npm run android
npm run ios
```

---

### Environment configuration

- Copy `.env.example` to `.env` and adjust values:
  - `EXPO_PUBLIC_API_MODE` – `'mock'` or `'real'`.
  - `EXPO_PUBLIC_API_BASE_URL` – backend base URL, e.g. `http://localhost:8001`.
  - `EXPO_PUBLIC_PROVIDER_BASE_PATH` – provider API base path, e.g. `/api/v1/provider`.
  - `EXPO_PUBLIC_DEMO_EMAIL` / `EXPO_PUBLIC_DEMO_PASSWORD` – demo login (non‑secret).
- All of these are **public** from the frontend’s perspective; do not put secrets in `.env` or `src/config/env.js`.

Backend expectations:

- CORS should allow the Expo dev origin and any deployment hosts.
- Typical HTTP methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- Typical headers: `Content-Type`, `Authorization` (when you add auth).

---

### Mocks vs real API

- During early phases, set `EXPO_PUBLIC_API_MODE=mock`:
  - The portal will use `src/mock/data.js` and `src/mock/api.js`.
  - This is ideal for building flows and UI without depending on backend availability.
- When backend endpoints are ready:
  - Set `EXPO_PUBLIC_API_MODE=real`.
  - Ensure `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_PROVIDER_BASE_PATH` match your backend.
  - Keep `ENDPOINTS` in `src/config/env.js` aligned with the backend routes.

---

### Adding new provider features

When you add a new module (for example, a **Referrals** screen):

1. Create a folder under `src/screens/Referrals`.
2. Implement `ReferralsScreen.js` plus an `index.js` that re‑exports it.
3. Wire the new screen into `src/screens/MainShell.js` and the `Sidebar` nav.
4. Add an API function in `src/api/index.js` and, if needed, a mock in `src/mock`.
5. Optionally create a domain hook (e.g. `useReferrals`) under `src/hooks`.

Follow the existing modules (Appointments, Inventory, etc.) as a template.

---

### Consistency with other portals

- The provider portal intentionally shares patterns with the patient and rider portals:
  - Same theme system (`src/theme`).
  - Similar shell and navigation structure.
  - Config + API layout.
- When in doubt, check the patient portal docs or code for examples and mirror them to keep the developer experience consistent.

