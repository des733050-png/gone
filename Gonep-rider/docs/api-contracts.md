## API Contracts – Rider Portal

This document summarizes the HTTP endpoints the **GONEP Rider Portal** expects. Exact payloads should be aligned with the backend team, but the shapes below match how the frontend is wired today.

> All paths are relative to:
> - `BASE_URL` from `EXPO_PUBLIC_API_BASE_URL`
> - `RIDER_BASE_PATH` from `EXPO_PUBLIC_RIDER_BASE_PATH` (default: `/api/v1/rider`)

---

### Dashboard

- **GET** `${RIDER_BASE_PATH}/dashboard/`
  - **Used by**: rider dashboard screen.
  - **Returns** rider profile and high‑level stats (trips, earnings, current status).

---

### Requests

- **GET** `${RIDER_BASE_PATH}/requests/`
  - **Used by**: Requests screen and `useRequests` hook.
  - **Returns** a list of pending delivery requests with identifiers, pickup/drop‑off info, and status.

- **POST** `${RIDER_BASE_PATH}/requests/{id}/action/`
  - **Used by**: accept/decline actions.
  - **Body**: `{ "action": "accept" | "decline" }`.
  - **Returns** the updated request state.

---

### Active delivery

- **GET** `${RIDER_BASE_PATH}/active/`
  - **Used by**: Active Delivery screen.
  - **Returns** the current active delivery details, if any.

- **POST** `${RIDER_BASE_PATH}/deliveries/{id}/complete/`
  - **Used by**: completing the current delivery.
  - **Returns** the updated delivery record.

---

### Earnings

- **GET** `${RIDER_BASE_PATH}/earnings/`
  - **Used by**: Earnings screen and `useEarnings` hook.
  - **Returns** payout summary, breakdown by period, and pending payouts if applicable.

---

### Trip history

- **GET** `${RIDER_BASE_PATH}/trips/`
  - **Used by**: Trip History screen.
  - **Returns** a list of completed deliveries with timestamps and basic stats.

---

### Notifications

- **GET** `${RIDER_BASE_PATH}/notifications/`
  - **Used by**: notifications badge and notifications screen.
  - **Returns** a list of notifications (id, message, type, `read`, timestamps).

---

### Chat / Messages

- **GET** `${RIDER_BASE_PATH}/messages/{orderId}/`
  - **Used by**: Chat screen.
  - **Returns** the messages thread for the given order.

---

### Rider status

- **POST** `${RIDER_BASE_PATH}/status/`
  - **Used by**: toggling rider availability.
  - **Body**: `{ "status": "<string>" }` (e.g. `"online"`, `"offline"`, `"busy"`).
  - **Returns** the updated status.

---

### Notes

- The mock layer under `src/mock` mirrors these endpoints for local development.
- When backend endpoints change, update:
  - `ENDPOINTS` in `src/config/env.js`.
  - API calls in `src/api/index.js`.
  - Mock implementations in `src/mock/api.js` and `src/mock/data.js`.

