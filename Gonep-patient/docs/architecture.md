## GONEP Patient Portal – Architecture

This document explains **why** the current architecture was chosen and **how** the main pieces fit together.

---

### 1. High-level goals

- **Single codebase** for web and (future) mobile.
- **Consistent design system** via a central theme.
- **Separation of concerns** between UI, layout, and data access.
- **Easy backend swap** from mocks to a real API.

These goals drove us to pick **Expo + React Native**, with **react-navigation** for routing and a layered UI structure (`atoms → organisms → screens`).

---

### 2. Platform & runtime

**Choice**: Expo + React Native + React Native Web

- **Why this approach**  
  - Expo dramatically simplifies dev tooling (bundler, dev server, OTA updates) and gives us a path to native apps later.  
  - React Native Web lets us reuse the same components on the web without rewriting everything in plain React DOM.

- **How it works**  
  - `expo` runs a Metro dev server.  
  - For web (`npm run web` / `expo start --web`), `react-native-web` translates React Native primitives (`View`, `Text`, etc.) into DOM elements.  
  - For Android/iOS (once SDKs are available), the same JSX renders into native views.

---

### 3. App shell and navigation

**Choice**: Native stack navigator with an explicit **Auth → MainShell** split.

- **Why this approach**  
  - Many apps share the same pattern: user must authenticate, then enters a complex shell with multiple sections (dashboard, appointments, orders, etc.).  
  - A stack navigator with two main routes (`Auth`, `Main`) models this cleanly without introducing heavy global state or custom routing.

- **How it works**  
  - In `src/App.js`, `RootNavigator` holds a `user` state.  
  - When `user` is `null`, the stack shows `Auth`. When `user` is set, the stack shows `Main` (the main shell).  
  - `AuthScreen` receives an `onAuth` callback; once login succeeds, it calls `onAuth(userPayload)`, which flips `user` and causes React Navigation to switch to the `Main` route.
  - `MainShell` is responsible for lateral navigation between feature screens (Dashboard, Appointments, Orders, etc.), typically backing the sidebar and topbar.

This keeps **authentication** logic localized and makes it simple to later replace the `user` state with a more robust auth solution (tokens, refresh, secure storage).

---

### 4. Design system & theming

**Choice**: Central theme context + design tokens in `src/theme`.

- **Why this approach**  
  - Healthcare UIs require a clean, consistent look; duplicating colors and spacing inline quickly leads to drift.  
  - Supporting dark mode and future rebrands for GONEP should be a matter of updating theme tokens, not combing through every component.

- **How it works**  
  - `src/theme/colors.js` exposes semantic colors (e.g. primary, background, surface, success, error) instead of raw hex values scattered across the app.  
  - `src/theme/ThemeContext.js` provides a `ThemeProvider` and `useTheme` hook.  
  - The provider holds the current theme (light/dark) and exposes tokens to components.  
  - `src/App.js` reads `isDark` from `useTheme` and maps it into the corresponding React Navigation theme (light vs dark) so that navigation containers and headers match the rest of the UI.

This gives us a **single source of truth** for look and feel.

---

### 5. UI layering (atoms, organisms, screens)

**Choice**: Atomic-inspired layering: `atoms` → `organisms` → `screens`.

- **Why this approach**  
  - Encourages reuse and keeps screens focused on layout/data, not low-level styling.  
  - Makes it easy to change a core UI element (e.g. button style) everywhere by editing one file.

- **How it works**  
  - `src/atoms/` contains the smallest UI building blocks: buttons, inputs, cards, badges, avatar.  
  - `src/organisms/` contains composed structures such as `Sidebar`, `TopBar`, and `ScreenContainer`. These combine atoms into layout primitives.  
  - `src/screens/` uses organisms + atoms to build full pages (Dashboard, Appointments, Orders, etc.) and wire them to navigation and data.

---

### 6. API, config, and mocks

**Choice**: Central config in `src/config/env.js` plus a swappable API/mock layer.

- **Why this approach**  
  - Keeps environment-specific values (base URL, app name, feature flags) out of components.  
  - Allows local development with mock data before the backend is ready, and easy switching to real endpoints later.

- **How it works**  
  - `src/config/env.js` exposes:  
    - `APP_CONFIG` – app name and other static metadata.  
    - `API_CONFIG` – base URL and standard headers.  
    - `ENDPOINTS` – string paths for specific resources (`authLogin`, `authRegister`, `appointments`, etc.).  
  - `src/api/index.js` knows how to build full URLs and make network requests using this config.  
  - `src/mock/data.js` and `src/mock/api.js` provide fake responses that mimic the real API shape; screens can be wired to use mocks in development.

---

### 7. SEO (web-only concern)

**Choice**: Lightweight SEO integration using `react-helmet-async`.

- **Why this approach**  
  - The patient portal has a web build where setting page titles and basic meta tags improves clarity and search indexing.  
  - We want SEO concerns decoupled from individual screen implementations.

- **How it works**  
  - `SeoProvider` wraps the app and provides the Helmet context.  
  - `PageSeo` components set titles and key meta tags per screen.  
  - This logic is a no-op on native platforms, but the same code paths can remain.

---

### 8. Data & hooks

**Choice**: Simple custom hooks per domain area (e.g. `useAppointments`).

- **Why this approach**  
  - Encapsulates data fetching, transformation, and loading/error states.  
  - Avoids duplicating API calls and mapping logic across multiple screens.

- **How it works**  
  - For each domain (appointments, orders, vitals, etc.), we can create a hook in `src/hooks`.  
  - The hook uses the API or mock layer to fetch data and returns a shaped result plus state flags.  
  - Screens call the hook and focus on rendering the result.

---

### 9. Future directions

- Replace mock API usage with real HTTP calls as the backend stabilizes.  
- Introduce state management (e.g. React Query, Zustand, or Redux) if/when the data graph becomes complex.  
- Add analytics and logging hooks at the navigation level (e.g. screen view tracking).  
- Harden authentication with secure token storage and refresh flows for native builds.

This architecture is intentionally **incremental**: you can ship a solid web experience today and progressively add robustness and native platforms over time.

