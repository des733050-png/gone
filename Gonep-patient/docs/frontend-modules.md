## Frontend Modules – Why & How

This document walks through the main frontend modules in the GONEP Patient Portal, explaining **why** each exists and **how** it is meant to be used.

---

### `src/App.js` – Application root

- **Why this file exists**  
  - Central place to wire together:  
    - Theme provider (`ThemeProvider`)  
    - SEO provider (`SeoProvider`)  
    - Navigation container and stack (`NavigationContainer`, `createNativeStackNavigator`)  
    - Auth vs main shell routing

- **How it works**  
  - Defines a `RootNavigator` component that:  
    - Reads `isDark` from `useTheme()` and builds a React Navigation theme (`navTheme`).  
    - Keeps a `user` state variable that controls whether the `Auth` or `Main` stack screen is active.  
  - Exposes the `App` component that wraps everything in:  
    - `SafeAreaProvider` → ensures correct safe area handling.  
    - `ThemeProvider` → exposes theme tokens to the rest of the tree.  
    - `SeoProvider` → enables per-screen SEO configuration on the web.  
    - A root `View` that hosts the `StatusBar` and `RootNavigator`.

This file is the **composition root** for the frontend.

---

### `src/screens/MainShell.js` – Authenticated shell

- **Why this file exists**  
  - Provides a persistent layout (sidebar + topbar + content area) that all authenticated screens live inside.  
  - Centralizes navigation between high-level sections like Dashboard, Appointments, Orders, etc.

- **How it works**  
  - Receives `user`, `onLogout`, and `onUpdateUser` from `App`.  
  - Renders `Sidebar` and `TopBar` organisms from `src/organisms`.  
  - Manages which feature screen is active and passes down any shell-level props.  
  - Acts as the main “frame” for logged-in users.

Screens inside the shell should be relatively “dumb” in terms of layout and focus on data and content.

---

### `src/theme/ThemeContext.js` & `src/theme/colors.js`

- **Why these files exist**  
  - Define a consistent design system for the app that can be turned into light/dark themes without touching component code.  
  - Avoid inline styling duplication and magic hex codes scattered across the codebase.

- **How they work**  
  - `colors.js` exports structured palettes (e.g. `light`, `dark`) with semantic keys such as `primary`, `background`, `surface`, `text`, `muted`, `success`, `danger`.  
  - `ThemeContext.js` creates a React context that holds:  
    - The current theme mode (light/dark).  
    - A toggle function (if implemented).  
    - The resolved color tokens for that mode.  
  - `ThemeProvider` wraps the app (in `App.js`) and `useTheme` reads from this context so any component can style itself using the shared tokens.

---

### `src/config/env.js`

- **Why this file exists**  
  - Single source of truth for app-level configuration and API settings.  
  - Allows changing environments (local, staging, production) by editing a few values instead of hunting through components.

- **How it works**  
  - Exports `APP_CONFIG` with values like `APP_NAME`.  
  - Exports `API_CONFIG` with `BASE_URL` and default headers.  
  - Exports `ENDPOINTS`/`endpoints` that define string paths for each backend resource.  
  - The rest of the app imports these constants when performing network requests or rendering app metadata.

Treat everything in `env.js` as **public**; do not put secrets here.

---

### `src/api/index.js`

- **Why this file exists**  
  - Single import point for all screens and hooks.
  - Routes to `mock` / `development` / `staging` / `production` API layers based on `EXPO_PUBLIC_API_MODE`.
  - Keeps environment routing centralized so screens never import from environment-specific API files.

- **How it works**  
  - Reads `API_CONFIG.MODE` from `src/config/env.js`.
  - Selects one layer and re-exports a consistent surface:
    - `src/api/mock/index.js` (in-memory data)
    - `src/api/dev/index.js` (real HTTP)
    - `src/api/prod/index.js` (real HTTP + stricter guards)
  - Shared network logic lives in `src/api/httpLayer.js` (timeout, error mapping, HTTPS guard for prod).

In early stages, this can be a thin wrapper; as the project grows, this is where cross-cutting concerns like logging and caching should live.

---

### `src/mock/data.js`

- **Why these files exist**  
  - Provide predictable data for UI development before a real backend is ready.  
  - Allow quick visual iteration without waiting on API contracts.

- **How they work**  
  - `data.js` defines in-memory arrays/objects that mimic backend responses (appointments, orders, vitals, notifications, etc.).  
  - Mock behavior is exposed via `src/api/mock/index.js` so screens/hooks never import mock data directly.

---

### `src/hooks/useAppointments.js` (pattern for other domain hooks)

- **Why this file exists**  
  - Encapsulates the logic for loading and shaping appointment data.  
  - Gives screens a simple interface: call `useAppointments()` and render based on returned state.

- **How it works**  
  - Uses `useEffect` to trigger a fetch from the API or mock layer.  
  - Tracks loading and error state.  
  - Returns `{ appointments, isLoading, error }` (shape may vary) to the caller.

Other domain-specific hooks (orders, vitals, notifications) should follow the same pattern for consistency.

---

### `src/organisms/Sidebar.js`, `TopBar.js`, `ScreenContainer.js`

- **Why these files exist**  
  - Define the **layout primitives** used by the main shell.  
  - Keep repetitive layout markup (padding, background colors, typography for section titles) out of individual screens.

- **How they work**  
  - `Sidebar`  
    - Renders navigation items, active state, and possibly user profile shortcuts.  
    - Calls back to the shell when a section is selected.
  - `TopBar`  
    - Hosts global actions (search, notifications, avatar, logout).  
    - Helps maintain consistent top-level spacing and brand presence.
  - `ScreenContainer`  
    - Provides a consistent padding and background for screen content, and can handle scroll vs fixed layouts.

---

### `src/screens/*` – Feature screens

- **Why these files exist**  
  - Implement the actual patient-facing features: dashboard, appointments, orders, tracking, vitals, records, notifications, profile, and settings.

- **How they work**  
  - Screens are grouped into provider-style sections:
    - `src/screens/Auth/`
    - `src/screens/clinical/`
    - `src/screens/operations/`
    - `src/screens/account/`
  - Each section folder re-exports the existing screen implementations so imports are consistent and scalable.

Screens should **avoid** hard-coded API URLs or theme values and instead rely on the shared modules described above.

---

### `src/seo/*` – SEO helpers

- **Why these files exist**  
  - Web builds benefit from proper `<title>` and basic meta tags for clarity and search.  
  - We want SEO configuration to be declarative and per-screen, not mixed into low-level components.

- **How they work**  
  - `SeoProvider` wraps the app and provides the Helmet/SEO context.  
  - `PageSeo` is a small component that a screen can render to set its title and description.  
  - `meta.js` centralizes reusable SEO defaults and shared strings.

On native builds, these components are effectively no-ops.

---

### `src/atoms/*` – Atoms

- **Why these files exist**  
  - Provide branded, reusable UI elements (buttons, inputs, cards, badges, avatar) that embody the GONEP visual language.

- **How they work**  
  - Each atom wraps a React Native primitive (`Pressable`, `TextInput`, `View`, etc.).  
  - Atoms read from `useTheme` so they stay in sync with the current theme.  
  - Screens and organisms compose atoms rather than styling primitives directly, which keeps the design consistent.

