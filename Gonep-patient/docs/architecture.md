## GONEP Patient Portal - Architecture Explained

This guide explains the codebase in plain language: what each layer does, how data flows, and why these implementation choices were made.

---

### 1) Why this stack

- **Expo + React Native + React Native Web** is used so one codebase can run on web now and mobile later.
- **Why not separate React web + native apps?** Faster delivery and less duplicated UI/business logic.
- **Trade-off:** some web-only polish can take extra work, but shared features ship much faster.

---

### 2) App entry and boot flow (`src/App.js`)

`App` wraps providers in this order:

1. `SafeAreaProvider` - device-safe paddings
2. `ThemeProvider` - global theme tokens (`useTheme`)
3. `SeoProvider` - web `<head>` metadata
4. `RootNavigator` - auth/main routing

**How `RootNavigator` works**

- Holds `user` in `useState(null)`.
- If `user` is missing: render `AuthScreen`.
- If `user` exists: render `MainShell`.
- Passes callbacks:
  - `onAuth={setUser}` to log in
  - `onLogout={() => setUser(null)}` to log out
  - `onUpdateUser={setUser}` for profile updates

**Why local state here instead of Redux/Zustand?**

- Auth routing here is simple and global.
- For the current scope, local state is easier to read and debug than introducing a full store.

---

### 3) Main shell behavior (`src/screens/MainShell.js`)

`MainShell` is the in-app controller after login.

It owns:

- `page` - active screen
- `sidebarOpen` - responsive nav behavior
- `selectedAppointmentId` - detail-page context
- `notificationsUnread` - topbar badge count
- `userMenuOpen` - profile menu visibility

**How navigation works**

- Sidebar item click sets `page`.
- `renderPage()` is a switch that returns the correct screen component.
- Appointment detail uses a dedicated page key (`appointmentDetails`) and stores the selected ID.

**Why this approach instead of nested navigators for every section?**

- Simpler mental model for this app: one authenticated shell + controlled page switching.
- Easier to inject shell-level UI (topbar, notifications badge, overlays) without complex navigator wiring.

---

### 4) API architecture (`src/config/env.js`, `src/api/index.js`, `src/api/httpLayer.js`)

**`env.js` responsibilities**

- Read public env values.
- Build endpoint constants in one place (`ENDPOINTS`).
- Export mode flags (`IS_MOCK`, `IS_DEV`, etc.).

**`api/index.js` responsibilities**

- Select implementation layer by `API_CONFIG.MODE`.
- Re-export a stable function surface (`getAppointments`, `getOrders`, etc.).

**`httpLayer.js` responsibilities**

- Shared request/timeout/error behavior for dev/prod layers.
- Keeps transport logic out of screens and hooks.

**Why a mode-based router instead of `if (isMock)` checks inside screens?**

- Screens stay clean and environment-agnostic.
- Swapping mock <-> real API becomes a config change, not a feature rewrite.

---

### 5) Function flow example (from click to API)

Example: open appointments screen.

1. User clicks `Appointments` in sidebar.
2. `MainShell` sets `page='appointments'`.
3. `renderPage()` returns `AppointmentsScreen`.
4. `AppointmentsScreen` calls `useAppointments`.
5. `useAppointments` calls `getAppointments` from `src/api`.
6. `src/api/index.js` forwards to mock/dev/prod layer.
7. Data returns -> hook updates state -> screen re-renders.

This is the core pattern used across records, vitals, chat, and notifications.

---

### 6) UI composition model

- `atoms`: tiny reusable UI blocks (`Btn`, `Input`, `Card`, ...)
- `organisms`: composed layout blocks (`Sidebar`, `TopBar`, `ScreenContainer`)
- `screens`: feature pages that combine organisms + hooks + API functions

**Why this split?**

- Keeps styling reuse high.
- Makes screen files focused on behavior, not repeated UI scaffolding.

---

### 7) Theme and SEO

- `ThemeContext` provides `isDark`, tokens (`C`), and toggle behavior.
- `App` maps theme mode to React Navigation theme to keep shell colors consistent.
- `PageSeo` is rendered by `MainShell` so each page can define title/meta for web.

---

### 8) Quick codebase mental model

- `App.js` decides **who sees what** (auth vs shell).
- `MainShell.js` decides **which page renders**.
- Hooks decide **when/how to fetch data**.
- `src/api` decides **where data comes from** (mock/dev/prod).
- Atoms/organisms decide **how UI looks consistently**.

