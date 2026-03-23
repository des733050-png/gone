# GONEP Provider — API Contracts

All endpoints are prefixed with `EXPO_PUBLIC_PROVIDER_BASE_PATH` (default `/api/v1/provider`).

## Auth
`POST /auth/login/`  → `{ access_token, user }`

## Appointments
`GET  /appointments/`             → `Appointment[]`

## Prescriptions
`GET  /prescriptions/`            → `Prescription[]`
`POST /prescriptions/{id}/dispatch/` → `Prescription`
`POST /prescriptions/{id}/cancel/`   → `Prescription`

## Patients / EMR
`GET  /emr/`                → `Patient[]`
`GET  /emr/{id}/`           → `Patient`

## Consultations
`GET  /consultations/`                  → `Consultation[]`
`GET  /consultations/?patient_id={id}`  → `Consultation[]` (filtered)
`POST /consultations/`                  → `Consultation`
`PATCH /consultations/{id}/`            → `Consultation`
Edit window enforced server-side using `created_at` + `edit_window_hours` from clinical settings.

## Lab
`GET  /lab/`                → `LabResult[]`

## Inventory
`GET  /inventory/`                            → `InventoryItem[]`
`POST /inventory/{id}/add-stock/`             → `InventoryItem`
`POST /inventory/{id}/reduce-stock/`          → `InventoryItem`
`PATCH /inventory/{id}/`                      → `InventoryItem`
`POST /inventory/`                            → `InventoryItem` (new item)
`POST /inventory/{id}/deactivate/`            → 204
`POST /inventory/{id}/toggle-ecommerce/`      → `InventoryItem`

## Billing
`GET  /billing/`              → `BillingRecord[]`
`POST /billing/{id}/pay/`     → `BillingRecord`

## Notifications
`GET  /notifications/`           → `Notification[]`
`PATCH /notifications/{id}/read/`→ 204
`POST /notifications/read-all/`  → 204

## Availability
`GET  /availability/`          → `{ [doctor_id]: DoctorSchedule }`
`POST /availability/`          → add slot `{ doctorId, slot }`
`PATCH /availability/`         → toggle block day `{ doctorId, day }`
`DELETE /availability/`        → remove slot `{ doctorId, slotId }`

## Staff
`GET  /staff/`                         → `StaffMember[]`
`POST /staff/`                         → `StaffMember`
`PATCH /staff/{id}/`                   → `StaffMember`
`POST /staff/{id}/suspend/`            → `StaffMember`
`POST /staff/{id}/reactivate/`         → `StaffMember`

## Activity Logs
`GET  /activity-logs/`         → `ActivityLog[]`

## Analytics
`GET  /analytics/`             → `AnalyticsPayload` (see MOCK_ANALYTICS shape)

## Support Tickets
`GET  /support-tickets/`           → `SupportTicket[]`
`POST /support-tickets/`           → `SupportTicket`
`PATCH /support-tickets/{id}/`     → `SupportTicket`

## Clinical Settings
`GET  /clinical-settings/`     → `{ edit_window_hours, allowed_values }`
`PATCH /clinical-settings/`    → `{ edit_window_hours }`

## POS Accounts
`GET  /pos-accounts/`                  → `PosAccount[]`
`POST /pos-accounts/`                  → `PosAccount`
`POST /pos-accounts/{id}/reset-password/` → 204

## POS Transactions
`GET  /pos-transactions/?pos_id={id}` → `PosTransaction[]`
`POST /pos-transactions/`             → `PosTransaction` (also triggers stock deduction)
