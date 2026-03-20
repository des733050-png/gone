## Development Notes

This document captures practical notes about running and extending the GONEP Patient Portal.

---

### Current usage

- The app is **currently used as a web app** via Expo (`npm run web` / `expo start --web`).  
- Native builds (Android/iOS) are wired in `package.json` but require the respective SDKs:
  - Android: Android Studio + SDK + emulator or device.
  - iOS: macOS + Xcode + simulator or device.

You can comfortably develop all UI and flows on the web and later verify/adjust them on mobile once SDKs are installed.

---

### Scripts (from `package.json`)

- **`npm start`** → `expo start` (opens Expo dev tools).  
- **`npm run web`** → `expo start --web` (web target, primary workflow at the moment).  
- **`npm run android`** → `expo run:android` (requires Android SDK).  
- **`npm run ios`** → `expo run:ios` (requires macOS + Xcode).

---

### Environment configuration

- Edit `src/config/env.js` to adjust:
  - `APP_CONFIG.APP_NAME` – displayed app name.  
  - `API_CONFIG.BASE_URL` – backend base URL.  
  - Endpoint paths – align them with your backend routes.
- Treat anything in `env.js` as **public configuration** – do not put secrets here.

Backend requirements:

- CORS should allow the Expo dev origin (URL printed in the CLI) and any custom hostnames you deploy to.  
- Enable the HTTP methods and headers your API needs (commonly `GET, POST, PUT, DELETE, OPTIONS` and `Content-Type`, `Authorization`).

---

### Working with mocks vs real API

- During early development, it is often more productive to:
  - Use `src/mock/data.js` and `src/mock/api.js` to prototype UI flows.  
  - Keep the shape of mock responses aligned with backend contracts.
- When the backend is ready:
  - Point `API_CONFIG.BASE_URL` to the backend.  
  - Update the domain hooks (`useAppointments`, etc.) to call the real `src/api` functions instead of mocks.

---

### Adding new features

When you add a new feature, follow the existing conventions:

1. **Create a screen folder** under `src/screens/YourFeature`.  
2. **Implement** `YourFeatureScreen.js` and an `index.js` that re-exports it.  
3. **Add navigation wiring** in `MainShell` (and `Sidebar`/`TopBar` if needed).  
4. **Create hooks** in `src/hooks` to fetch/process data.  
5. **Reuse atoms and organisms** so the design stays consistent.

This keeps the codebase predictable and makes it easier for others to contribute.

