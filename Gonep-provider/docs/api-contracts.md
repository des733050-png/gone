## API Contracts – Provider Portal

This document summarizes the main HTTP endpoints the **Gonep Provider Portal** expects. Exact schemas should be aligned with the backend team, but the shapes below match how the frontend is written today.

> All paths are relative to:
> - `BASE_URL` from `EXPO_PUBLIC_API_BASE_URL`
> - `PROVIDER_BASE_PATH` from `EXPO_PUBLIC_PROVIDER_BASE_PATH` (default: `/api/v1/provider`)

---

### Dashboard

- **GET** `${PROVIDER_BASE_PATH}/dashboard/`
  - **Used by**: provider dashboard screen.
  - **Returns** summary metrics for the logged‑in provider (appointments today, pending prescriptions, lab flags, etc.).

---

### Appointments

- **GET** `${PROVIDER_BASE_PATH}/appointments/`
  - **Used by**: Appointments screen and `useAppointments` hook.
  - **Returns** a list of appointment objects, including:
    - `id`, `patient`, `start_time`, `end_time`, `status`, and any clinic‑specific metadata.

---

### Prescriptions & Pharmacy

- **GET** `${PROVIDER_BASE_PATH}/prescriptions/`
  - **Used by**: Pharmacy screen.
  - **Returns** active prescriptions and their dispatch status.

- **POST** `${PROVIDER_BASE_PATH}/prescriptions/{id}/dispatch/`
  - **Used by**: action to mark a prescription as dispatched.
  - **Body**: empty (or minimal `{ note?: string }` if needed).
  - **Returns** the updated prescription.

---

### EMR (Patients)

- **GET** `${PROVIDER_BASE_PATH}/emr/`
  - **Used by**: EMR listing screen.
  - **Returns** a list of patient summaries (id, name, identifier, age, flags).

- **GET** `${PROVIDER_BASE_PATH}/emr/{id}/`
  - **Used by**: patient detail view.
  - **Returns** detailed clinical data for the selected patient.

---

### Lab

- **GET** `${PROVIDER_BASE_PATH}/lab/`
  - **Used by**: Lab screen.
  - **Returns** lab test results, including status and critical‑flag metadata.

---

### Inventory

- **GET** `${PROVIDER_BASE_PATH}/inventory/`
  - **Used by**: Inventory screen and `useInventory` hook.
  - **Returns** item records (drug name, SKU, quantity, thresholds, etc.).

---

### Billing

- **GET** `${PROVIDER_BASE_PATH}/billing/`
  - **Used by**: Billing screen.
  - **Returns** billing items and invoices for the facility or provider.

---

### Notifications

- **GET** `${PROVIDER_BASE_PATH}/notifications/`
  - **Used by**: notifications badge and notifications screen.
  - **Returns** a list of notifications (id, message, type, `read` flag, timestamps).

---

### Notes

- The frontend uses a **mock layer** with equivalent shapes under `src/mock`. When backend contracts change, update both:
  - `ENDPOINTS` and API calls.
  - Mock data/functions, so the development experience stays consistent without the backend.

