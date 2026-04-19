# Ownership Classification

- Doc Class: Dev Architecture Reference
- Authority: Ownership taxonomy for the tenancy reset
- Change Policy: Update only when ownership decisions change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`

## Taxonomy
- Global: platform-level records not owned by a facility
- Facility-Owned: records that must be isolated by facility
- Person-Root: person identity records that may relate to facilities, but are not owned by one facility
- Actor-Only: auth/audit actor references that should never become the tenancy root
- Legacy Internal: older control-plane objects that remain superuser-only until separately retired or remapped

## Global
- `User`
- `Group`
- `Facility`

## Person-Root
- `PatientProfile`
- `RiderProfile`
- `PatientUserLink`
- `RiderUserLink`

## Facility-Owned
- Staff membership and facility access:
  - `FacilityStaffMembership`
  - `PatientFacilityAccess`
  - `RiderFacilityAccess`
- Patient operations:
  - `PatientBooking`
  - `PatientConsultation`
  - `PatientPrescription`
  - `PatientDiagnosticOrder`
  - `PatientRecordEvent`
  - `PatientSupportTicket`
  - `PatientMedicationOrder`
  - `PatientMedicationOrderItem`
  - `PatientPortalNotification`
  - `PatientPreference`
- Provider operations:
  - `ProviderProfile`
  - `ProviderAppointment`
  - `ProviderConsultation`
  - `ProviderPrescriptionTask`
  - `ProviderLabResult`
  - `ProviderAvailability`
  - `ProviderClinicalSetting`
  - `ProviderInventoryItem`
  - `ProviderBillingRecord`
  - `ProviderPortalNotification`
  - `ProviderSupportTicket`
  - `ProviderActivityLog`
  - `ProviderPosTransaction`
  - `ProviderEarningsSnapshot`
  - `ProviderProtocol`
- Rider operations:
  - `RiderJob`
  - `RiderHistoryEntry`
  - `RiderEarningsSnapshot`
  - `RiderRequestDecision`
  - `RiderPortalNotification`
  - `RiderChatMessage`
  - `RiderPreference`
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

## Actor-Only or Cross-Cutting With Optional Facility
- `AuditEvent`
- `TimelineEvent`
- `Attachment`
- `Note`
- `ActionQueueItem`
- `Complaint`
- `ComplianceAudit`
- `RiskFlag`

## Legacy Internal
- `CommandProvider`
- `CommandRider`
- `CommandBooking`
- `CommandIncident`
- `PerformanceFlag`
