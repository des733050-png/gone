## GONEP Patient Portal – Expo React Native (Web‑first)

This is the **GONEP Patient Portal** built with **React Native + Expo**, currently used primarily as a **web app** (via `expo start --web`). The codebase is structured with atomic UI components, a central theme context, and a small configuration layer for API URLs and app‑level constants.

The goal of this project is to keep the **web experience** fast and consistent while remaining **ready for Android/iOS** once the native toolchains (Android SDK, Xcode) are available.

---

### Why this architecture?

- **Expo + React Native**:  
  - **Why**: Single codebase that can target web and native (Android/iOS) with minimal changes. Good developer experience and battery of tooling from Expo.  
  - **How it works**: `expo` handles bundling, dev server, and platform targets; `react-native-web` renders React Native components into the browser DOM for web.

- **Stack navigator with auth vs main shell**:  
  - **Why**: A simple way to model “logged‑out” (auth) vs “logged‑in” (main app) without over‑engineering global state.  
  - **How it works**: In `src/App.js` a piece of local state (`user`) decides whether the stack shows the `Auth` screen or the `Main` shell.

- **Theme context (light/dark + design tokens)**:  
  - **Why**: Centralize colors/spacing and make it easy to support dark mode and future branding tweaks for GONEP.  
  - **How it works**: `ThemeProvider` from `src/theme/ThemeContext.js` exposes a `useTheme` hook. Screens and atoms consume this to style components dynamically.

- **Atomic component layers (atoms → organisms → screens)**:  
  - **Why**: Reuse consistent building blocks (buttons, inputs, cards, badges) across the portal and keep screens mostly about layout and data.  
  - **How it works**:  
    - `src/atoms/` contains small reusable components.  
    - `src/organisms/` defines layout pieces like `Sidebar`, `TopBar`, and `ScreenContainer`.  
    - `src/screens/` composes atoms + organisms into full pages.

- **Config + mock API layer**:  
  - **Why**: Keep API URLs and mock data in one place so you can easily swap from local mocks to a real backend without rewriting screens.  
  - **How it works**: `src/config/env.js` hosts `API_CONFIG` and `APP_CONFIG`. `src/api` and `src/mock` provide helpers for calling real endpoints or in‑memory mocks.

For a deeper breakdown, see `docs/architecture.md` and `docs/frontend-modules.md`.

---

### High‑level folder structure

- **`index.js`**: Expo entry that registers `src/App`.
- **`src/App.js`**: Root component – wires theme provider, SEO provider, navigation, and auth/main shell routing.
- **`src/theme/`**  
  - **`colors.js`**: Light and dark design tokens (GONEP palette).  
  - **`ThemeContext.js`**: Theme provider + `useTheme` hook (light/dark toggle and design tokens).
- **`src/config/`**  
  - **`env.js`**: Central config for `API_CONFIG`, `APP_CONFIG`, and API endpoints. Change `API_CONFIG.BASE_URL` here to point to your backend.
- **`src/atoms/`**  
  - **`Btn.js`**, **`Input.js`**, **`Card.js`**, **`Badge.js`**, **`Avatar.js`**: Reusable “atoms” used across screens.
- **`src/organisms/`**  
  - **`Sidebar.js`**, **`TopBar.js`**, **`ScreenContainer.js`**: Shell/layout components used by the main navigation shell.
- **`src/screens/`**  
  - **`Auth/`**: `AuthScreen.js` and wrapper index – login UI and authentication flow.  
  - **`MainShell.js`**: Sidebar/topbar shell and page switching after login.  
  - **Feature folders**: `Dashboard`, `Appointments`, `Orders`, `TrackOrder`, `Vitals`, `Records`, `Notifications`, `Profile`, `Settings` – each folder has an `index.js` (screen entry) and a `*Screen.js` implementation.
- **`src/seo/`**  
  - **`SeoProvider.js`**, **`PageSeo.js`**, **`meta.js`**: Simple SEO support for the web build using `react-helmet-async`.
- **`src/mock/`**  
  - **`data.js`**, **`api.js`**: Local mock data and mock API helpers for development.
- **`src/hooks/`**  
  - **`useAppointments.js`**: Example domain hook for fetching/formatting appointment data.

---

### Configuration & backend integration

- Open `src/config/env.js` and set:
  - **`API_CONFIG.BASE_URL`** to your backend URL, e.g. `'http://localhost:3000'` or `'https://api.yourdomain.com'`.
  - Adjust `endpoints` (e.g. `authLogin`, `authRegister`, `appointments`, `orders`) if your backend routes differ.
- Ensure your backend CORS settings allow:
  - The Expo dev origin (e.g. `http://localhost:8081` or the URL printed in the Expo dev tools when you run `npm run web`).  
  - Your device IP if testing on a real device over LAN.
- Do **not** put secrets (tokens, API keys) directly in this frontend; treat anything in `env.js` as public.

---

### Installation

From the `Gonep-patient` folder:

```bash
npm install
```

If you prefer Yarn:

```bash
yarn
```

---

### Running the app

**Web (current primary target)**  

```bash
npm run web
```

or:

```bash
npx expo start --web
```

This will open the Expo dev tools and a browser window for the web build.

**Android / iOS (when SDKs are available)**  

These scripts are already wired but require local platform SDKs:

```bash
npm run android   # needs Android SDK / emulator
npm run ios       # macOS + Xcode
```

Expo will guide you to open the native app via an emulator or the Expo Go app once your environment is configured.

---

### Demo login (if configured)

If demo credentials are wired into the auth screen, they will typically look like:

- **Email**: `patient@example.com`  
- **Password**: `password123`

Check `src/screens/Auth/AuthScreen.js` and `src/mock/data.js` for the exact values used in this build.

---

### Additional documentation

More detailed explanations of **why each module exists and how it works** live in the `docs/` folder:

- `docs/architecture.md` – overall app architecture and data flow.  
- `docs/frontend-modules.md` – per‑module documentation (theme, navigation, SEO, API, screens).  
- `docs/development-notes.md` – environment setup notes, known limitations, and future mobile work.


