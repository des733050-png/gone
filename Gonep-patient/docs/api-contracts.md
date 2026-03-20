## API Contracts – Patient Portal

This document summarizes the HTTP endpoints the **GONEP Patient Portal** expects. The real backend may evolve; keep this file in sync with both the backend and `src/config/env.js`.

> All paths are relative to:
> - `BASE_URL` from `EXPO_PUBLIC_API_BASE_URL`
> - Path fragments defined in `ENDPOINTS` in `src/config/env.js`

---

### Appointments

- **GET** `appointments (list)`
  - URL: `buildEndpoint('appointments', 'list')` → `${BASE_URL}{RESOURCE_MAP.appointments.basePath}`
  - Used by: Appointments screen and `useAppointments` hook.
- **GET** `appointments (detail)`
  - URL: `buildEndpoint('appointments', 'detail', id)` → `${BASE_URL}{basePath}/{id}`
  - Used by: Appointment details screen.
- **PATCH** `appointments (update)`
  - URL: `buildEndpoint('appointments', 'update', id)` → `${BASE_URL}{basePath}/{id}`
  - Body: partial appointment update payload.

---

### Orders

- **GET** `orders (list)`
  - URL: `buildEndpoint('orders', 'list')`.
  - Used by: Orders screen.
- **POST** `orders (custom / reorder)`
  - URL: `buildEndpoint('orders', 'custom', id)`.
  - Body: `{ orderId: id, action: 'reorder' }`.
  - Used by: reorder action from the Orders screen.

---

### Records

- **GET** `records (list)`
  - URL: `buildEndpoint('records', 'list')`.
  - Used by: Records screen.
- **GET** `records (custom / current user)`
  - URL: `buildEndpoint('records', 'custom')`.
  - Used by: `getCurrentUser` helper (placeholder until a dedicated auth/user endpoint is available).

---

### Notifications

- **GET** `notifications (list)`
  - URL: `buildEndpoint('notifications', 'list')`.
  - Used by: notifications badge and Notifications screen.

---

### Notes

- The mock layer (`src/mock/data.js` and `src/mock/api.js`) mirrors these resources for development.
- When backend contracts change:
  - Update `RESOURCE_MAP` and any action logic in `buildEndpoint`.
  - Update the API functions in `src/api/index.js`.
  - Adjust the mock implementations to keep shapes aligned.

