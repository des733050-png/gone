## State Management - Patient Portal (Why + How)

How state moves through the app, and why the current approach was chosen.

---

### 1) Core principle: keep state close to usage

- The app uses `useState` + custom hooks instead of a global store.
- **Why:** current complexity is moderate; local state is easier to follow and debug.
- **Trade-off:** if cross-screen dependencies grow a lot, a central store may become useful later.

---

### 2) Where state lives today

**App-level state (`src/App.js`)**

- `user`: controls auth vs main shell rendering.

**Shell-level state (`src/screens/MainShell.js`)**

- Active page
- Sidebar visibility
- Notification unread count
- Appointment detail selection
- User menu visibility

**Screen-level state**

- Filter values, form fields, modal visibility, local UI interactions.

---

### 3) Hook state pattern

Hooks in `src/hooks` (for example `useAppointments`) usually follow this lifecycle:

1. Initialize `loading=true`, `error=null`, and empty data.
2. On mount/trigger, call a function from `src/api`.
3. On success, set data and `loading=false`.
4. On failure, set `error` and `loading=false`.

This keeps side effects out of visual components.

---

### 4) Why hooks instead of direct API calls in screens

- Reuse: multiple screens can share one data-loading behavior.
- Testability: hook logic can be validated independently of UI markup.
- Readability: screen files focus on rendering and interaction.

---

### 5) Mode switching (mock/dev/prod) and state impact

- `src/api/index.js` chooses the active API layer once using `API_CONFIG.MODE`.
- Hooks always call the same exported function names.
- **Why this matters:** switching data source does not require screen rewrites.

---

### 6) Example flow

When a user opens appointments:

1. `MainShell` sets page to appointments.
2. Appointments screen mounts.
3. `useAppointments` starts loading.
4. Hook calls `getAppointments()` from `src/api`.
5. API facade forwards to mock/dev/prod implementation.
6. Hook updates local state; UI re-renders.

---

### 7) When to introduce a global store

Consider React Query, Zustand, or Redux if you start seeing:

- repeated fetch/caching logic across many screens,
- difficult cross-screen synchronization,
- complex optimistic updates/rollback requirements,
- background refresh requirements across multiple domains.

