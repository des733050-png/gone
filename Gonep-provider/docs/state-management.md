## State Management – Provider Portal

This document describes how state is handled in the **Gonep Provider Portal** today and how it can evolve.

---

### Local UI state

- Simple UI state (selected page, open/closed menus, hover/pressed states) is managed with plain React state:
  - `useState` in `MainShell` for the active page and sidebar visibility.
  - `useState` in atoms (e.g. `Btn`) for hover/interaction.
- This keeps concerns close to where they are used and avoids over‑engineering.

---

### Data‑loading hooks

- Domain data is loaded through custom hooks under `src/hooks`:
  - Examples: `useAppointments`, `useInventory`.
- Pattern:
  - A hook calls the corresponding function in `src/api/index.js` inside a `useEffect`.
  - It tracks `loading` and optional `error` state.
  - It returns the data plus setters for local updates when necessary.
- Screens consume these hooks and focus on rendering.

---

### API mode (mock vs real)

- `API_CONFIG.MODE` (from `src/config/env.js`) controls whether hooks hit:
  - `src/mock/api.js` (mock mode), or
  - real HTTP endpoints (real mode).
- This logic lives in the API layer, not in individual screens or hooks.

---

### Future evolution

If provider workflows grow more complex, consider:

- **React Query or SWR**
  - For caching, deduplication, background refresh, and stale‑while‑revalidate patterns.
  - Centralize fetching concerns (retries, error boundaries) while keeping hooks small.
- **Zustand or Redux**
  - For cross‑screen state that is not naturally “owned” by a single view (e.g. shared filters, live session data).
- **Shared data layer across portals**
  - When the patient, provider, and rider apps share more APIs, factor out a shared data module/package to remove duplication.

For now, keeping state management simple and hook‑driven is intentional and matches the current app scale.

