## API Contracts – Patient Portal

This document summarizes the HTTP endpoints the **GONEP Patient Portal** expects. The real backend may evolve; keep this file in sync with both the backend and `src/config/env.js`.

> All paths are relative to:
> - `BASE_URL` from `EXPO_PUBLIC_API_BASE_URL`
> - Path fragments defined in `ENDPOINTS` in `src/config/env.js`

## How frontend functions map to endpoints

The UI does not call `fetch` directly. It calls functions from `src/api/index.js`, for example:

- `getAppointments()` -> `ENDPOINTS.appointments`
- `getOrderById(id)` -> `ENDPOINTS.orderDetail(id)`
- `reorderOrder(id)` -> `ENDPOINTS.orderReorder(id)`
- `markNotificationRead(id)` -> `${ENDPOINTS.notifications}${id}/read/`

Why this design:

- one stable API surface for hooks/screens,
- easy environment swapping (`mock`, `development`, `staging`, `production`),
- endpoint changes are localized to config/api layers.

---

### Appointments

- **GET** `appointments (list)`
  - URL: `ENDPOINTS.appointments`
  - Used by: Appointments screen and `useAppointments` hook.
- **GET** `appointments (detail)`
  - URL: `ENDPOINTS.appointmentDetail(id)`
  - Used by: Appointment details screen.
- **PATCH** `appointments (update)`
  - URL: `ENDPOINTS.appointmentUpdate(id)`
  - Body: partial appointment update payload.

---

### Auth & Current User

- **POST** `auth login`
  - Used by: `loginPatient()`
- **POST** `auth register`
  - Used by: `registerPatient()`
- **GET** `current user`
  - URL: `ENDPOINTS.currentUser`
  - Used by: `getCurrentUser()`

> Note: auth endpoint paths are implemented inside `src/api/httpLayer.js`, while resource endpoints come from `ENDPOINTS` in `src/config/env.js`.

---

### Orders

- **GET** `orders (list)`
  - URL: `ENDPOINTS.orders`
  - Used by: Orders screen.
- **GET** `orders (detail)`
  - URL: `ENDPOINTS.orderDetail(id)`
  - Used by: order detail views (when added).
- **POST** `orders (custom / reorder)`
  - URL: `ENDPOINTS.orderReorder(id)`
  - Body: backend-defined (current UI calls POST with no required body in the frontend).
  - Used by: reorder action from the Orders screen.

---

### Records

- **GET** `records (list)`
  - URL: `ENDPOINTS.records`
  - Used by: Records screen.

---

### Vitals

- **GET** `vitals (list)`
  - URL: `ENDPOINTS.vitals`
  - Used by: Vitals screen.

---

### Chat

- **GET** `chat thread`
  - URL: `ENDPOINTS.chatThread`
  - Used by: Chat screen.

---

### Notifications

- **GET** `notifications (list)`
  - URL: `ENDPOINTS.notifications`
  - Used by: notifications badge and Notifications screen.
- **PATCH** `notifications (mark read)`
  - URL: `${ENDPOINTS.notifications}${id}/read/`
  - Used by: mark-as-read actions (when added).

---

### Notes

- The mock dataset (`src/mock/data.js`) mirrors these resources for development and is consumed via `src/api/mock/index.js`.
- When backend contracts change:
  - Update `ENDPOINTS` in `src/config/env.js`.
  - Update the API layer functions (`src/api/dev`, `src/api/prod`) and mock layer (`src/api/mock`) to keep shapes aligned.

