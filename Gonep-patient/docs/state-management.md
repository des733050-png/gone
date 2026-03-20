## State Management – Patient Portal

How state is managed in the **GONEP Patient Portal** and how it can evolve.

---

### Local UI state

- Local UI concerns (sidebar open/closed, active page, form inputs) are handled with plain React state:
  - `useState` in `App` and `MainShell` for auth and navigation.
  - Local component state in atoms (e.g. button hover) and screens.
- This keeps simple UI logic close to the components that use it.

---

### Data‑loading hooks

- Domain‑specific hooks live under `src/hooks`:
  - Example: `useAppointments`.
- Pattern:
  - Call the relevant function in `src/api/index.js` inside a `useEffect`.
  - Track `loading` and optional `error` state.
  - Return structured data with flags such as `{ appointments, isLoading, error }`.
- Screens depend on these hooks rather than calling `fetch` or `src/api` directly.

---

### Mock vs real API

- `API_CONFIG.MODE` (from `src/config/env.js`) controls whether:
  - Calls go to the mock layer (`src/mock/api.js`), or
  - Use real HTTP endpoints composed with `buildEndpoint`.
- Screens and hooks are intentionally unaware of this detail; they import helpers from `src/api/index.js`.

---

### Future evolution

If the patient portal grows in complexity, consider:

- **React Query / SWR**
  - For caching, deduplication, and background refresh of appointments, orders, records, and notifications.
- **Zustand / Redux**
  - For cross‑screen state (e.g. cross‑cutting auth/session data, feature flags) if it becomes difficult to manage via props and simple hooks.
- **Shared data layer**
  - When patient, provider, and rider portals share more of the same API contracts, extract common fetching and normalization logic into a reusable shared module.

For now, the hook‑based approach is deliberately light‑weight and fits the current feature set.

