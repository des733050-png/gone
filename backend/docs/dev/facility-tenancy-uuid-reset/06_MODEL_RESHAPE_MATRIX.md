# Model Reshape Matrix

- Doc Class: Dev Schema Matrix
- Authority: Per-model reshape targets for the reset
- Change Policy: Update only if schema targets change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`

## Shared Base
- `BaseTrackedModel`
  - add UUID primary key

## Replace or Rename
- `ProviderMembership` -> `FacilityStaffMembership`
- add `PatientFacilityAccess`
- add `RiderFacilityAccess`

## Add Facility Scope
- Patient operations:
  - `PatientBooking`
  - `PatientConsultation`
  - `PatientPrescription`
  - `PatientDiagnosticOrder`
  - `PatientRecordEvent`
  - `PatientSupportTicket`
  - `PatientMedicationOrder`
  - `PatientPortalNotification`
- Provider operations:
  - `ProviderProfile`
  - `ProviderEarningsSnapshot`
  - `ProviderProtocol`
- Rider operations:
  - `RiderJob`
  - `RiderHistoryEntry`
  - `RiderEarningsSnapshot`
  - `RiderRequestDecision`
  - `RiderPortalNotification`
  - `RiderChatMessage`
- Finance and commerce:
  - `Supplier`
  - `StockItem`
  - `InventoryBatch`
  - `SaleRecord`
  - `RevenueEntry`
  - `PayoutRequest`
  - `Invoice`
  - `TransactionLog`
  - `ExecutiveKPI`
- Optional facility on cross-cutting ops:
  - `AuditEvent`
  - `TimelineEvent`
  - `Attachment`
  - `Note`
  - `ActionQueueItem`
  - `Complaint`
  - `ComplianceAudit`
  - `RiskFlag`

## Remove or Retire
- retire `portal_uid` from `Facility`, `PatientUserLink`, `RiderUserLink`, and `ProviderMembership` replacement
- retire free-text facility ownership on patient workflows where a real `facility` FK replaces it
- keep legacy `Command*` models superuser-only and do not let them define the tenancy model
