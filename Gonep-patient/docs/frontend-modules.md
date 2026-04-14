## Frontend Modules - Patient Portal (How They Work)

This document explains each important module in terms of:

- **Responsibility** (what it owns)
- **Main functions** (what it does at runtime)
- **Why this design** (why this type/approach was chosen)

---

### `src/App.js`

**Responsibility**

- App composition root and top-level auth routing.

**Main functions**

- Creates `RootNavigator`.
- Builds navigation theme from `isDark`.
- Stores `user` and switches stack screen (`Auth` or `Main`).

**Why this design**

- Keeping auth-switch logic at the top prevents prop-drilling auth checks to every screen.
- It also makes logout behavior predictable (`setUser(null)` always returns to auth).

---

### `src/screens/MainShell.js`

**Responsibility**

- Authenticated workspace controller.

**Main functions**

- Holds shell state (`page`, `sidebarOpen`, `notificationsUnread`, `selectedAppointmentId`, `userMenuOpen`).
- `openAppointmentDetails(id)` stores ID and routes to detail view.
- `handleUserMenuSelect(key)` routes profile/settings or logs out.
- `renderPage()` maps page keys to screen components.

**Why this design**

- Central shell-level state avoids duplicate sidebars/topbars in every feature screen.
- A single `renderPage()` switch is easy to trace for new contributors.

---

### `src/screens/authentication/AuthScreen.js`

**Responsibility**

- Login and registration UX.

**Main functions**

- Collect credentials/profile data.
- Calls API auth functions.
- On success, calls `onAuth(userPayload)` from `App`.

**Why this design**

- Keeps auth UI and auth side effects together in one screen.
- Parent component controls what happens after auth (single direction of data flow).

---

### `src/config/env.js`

**Responsibility**

- Public runtime config and endpoint assembly.

**Main functions**

- Reads `EXPO_PUBLIC_*` vars.
- Exports `API_CONFIG`, `APP_CONFIG`, and `ENDPOINTS`.
- Exports mode flags (`IS_MOCK`, `IS_DEV`, `IS_STAGING`, `IS_PROD`).

**Why this design**

- Prevents hardcoded URLs in screens.
- Changing environments is safer because endpoint composition is centralized.

---

### `src/api/index.js`

**Responsibility**

- API facade for the whole app.

**Main functions**

- Chooses the mode layer once.
- Re-exports a fixed set of API functions for consumers.

**Why this design**

- Screen/hook code does not need to know if data is mock/dev/prod.
- This decouples feature implementation from deployment mode.

---

### `src/api/httpLayer.js`

**Responsibility**

- Shared network plumbing for non-mock layers.

**Main functions**

- Request execution.
- Timeout handling.
- Error normalization.
- HTTPS requirements in stricter modes.

**Why this design**

- One place to enforce transport rules gives consistent error behavior.
- Avoids repeating fetch boilerplate in every API module.

---

### `src/hooks/*` (`useAppointments`, `useRecords`, `useVitals`, `useChatThread`)

**Responsibility**

- Data loading lifecycle per domain.

**Main functions**

- Trigger fetch on mount/dependency change.
- Expose domain data + loading + error state.
- Keep transformation logic close to data source.

**Why this design**

- Screens remain presentation-focused.
- Shared logic can be reused across multiple screens without duplication.

---

### `src/organisms/*` and `src/atoms/*`

**Responsibility**

- UI reuse and consistency.

**Main functions**

- `atoms`: foundational UI controls (`Btn`, `Input`, `Card`, `Badge`, `Icon`, `Avatar`).
- `organisms`: larger layout patterns (`Sidebar`, `TopBar`, `ScreenContainer`).

**Why this design**

- Faster visual consistency across screens.
- Lower maintenance cost when style tokens/components change.

---

### `src/seo/*`

**Responsibility**

- Web metadata management.

**Main functions**

- `SeoProvider` provides head context.
- `PageSeo` maps page key -> title/meta tags.

**Why this design**

- SEO logic stays out of business components and remains easy to evolve.

