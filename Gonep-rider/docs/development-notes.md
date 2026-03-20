## Development Notes – Rider Portal

Practical notes for running and extending the **GONEP Rider Portal**.

---

### Running the app

From the `Gonep-rider` directory:

```bash
npm install

# Web (primary target)
npm run web

# Native (requires SDKs)
npm run android
npm run ios
```

---

### Environment configuration

- Copy `.env.example` to `.env`.
- Update:
  - `EXPO_PUBLIC_API_MODE` – `'mock'` or `'real'`.
  - `EXPO_PUBLIC_API_BASE_URL` – e.g. `http://localhost:8001`.
  - `EXPO_PUBLIC_RIDER_BASE_PATH` – e.g. `/api/v1/rider`.
  - Demo login: `EXPO_PUBLIC_DEMO_EMAIL`, `EXPO_PUBLIC_DEMO_PASSWORD`.
- Treat these as **public** config values; do not store secrets in the frontend.

Backend expectations:

- CORS must allow the Expo dev origin and deployment hosts.
- Typical methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- Typical headers: `Content-Type`, `Authorization` (when auth is added).

---

### Mock mode vs real mode

- Mock mode (`EXPO_PUBLIC_API_MODE=mock`):
  - API calls use `src/mock/api.js` and `src/mock/data.js`.
  - Ideal for UI development without backend availability.
- Real mode (`EXPO_PUBLIC_API_MODE=real`):
  - API calls use real HTTP endpoints defined in `ENDPOINTS`.
  - Keep mocks updated so the experience is consistent in both modes.

---

### Adding new rider features

When adding a new workflow (for example, a **Route Planner** screen):

1. Create `src/screens/RoutePlanner` with `RoutePlannerScreen.js` and `index.js`.
2. Wire the screen into `MainShell` and, if appropriate, the `Sidebar`.
3. Create API functions in `src/api/index.js` and mock equivalents in `src/mock`.
4. Optionally add a hook (e.g. `useRoutes`) under `src/hooks`.

Align the implementation with existing modules (Requests, Active Delivery, Earnings).

