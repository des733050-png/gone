## State Management – Rider Portal

How state is handled in the **GONEP Rider Portal** today and how it can evolve.

---

### Local UI state

- Uses React hooks (`useState`, `useEffect`) directly in components:
  - `MainShell` tracks which page is active, sidebar state, user menu state, and unread notifications count.
  - Atoms like `Btn` manage hover/pressed states for interaction feedback.
- This keeps state close to where it is used and avoids a heavy global store.

---

### Data‑loading hooks

- Domain‑specific hooks live under `src/hooks`:
  - `useRequests` – loads delivery requests.
  - `useEarnings` – loads earnings data.
- Pattern:
  - Each hook calls the corresponding function from `src/api/index.js` inside a `useEffect`.
  - Tracks `loading` and `error` state.
  - Returns `{ data, loading, error, ... }`‑style objects to screens.

---

### API mode (mock vs real)

- `API_CONFIG.MODE` (from `src/config/env.js`) decides:
  - Whether `src/api/index.js` calls real HTTP endpoints composed from `ENDPOINTS`.
  - Or delegates to the mock API in `src/mock/api.js`.
- Screens and hooks do not know about mock vs real; they just call the API functions.

---

### Future evolution

As rider workflows grow, you can:

- Adopt **React Query** or **SWR**:
  - For caching, background refresh, and request deduplication.
  - Wrap existing API functions and gradually migrate hooks.
- Introduce a light global store (e.g. **Zustand**) if:
  - Multiple screens need shared state (e.g. rider status, active delivery context).
  - You want cross‑page synchronization without prop‑drilling.

For now, the simple hook‑based approach keeps the mental model small and fits the current app size.

