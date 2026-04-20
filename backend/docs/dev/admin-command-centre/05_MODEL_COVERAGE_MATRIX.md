# Model Coverage Matrix

- Doc Class: Dev Coverage Matrix
- Authority: Required admin coverage for the command centre
- Change Policy: Update if live operational models are added or retired
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`; `backend/core/admin.py`

## Access & Identity
- `User`
- `Group`
- `Facility`
- `PatientUserLink`
- `ProviderMembership`
- `RiderUserLink`

## Patients
- `PatientProfile`
- `PatientPreference`
- `PatientBooking`
- `PatientConsultation`
- `PatientPrescription`
- `PatientDiagnosticOrder`
- `PatientMedicationOrder`
- `PatientMedicationOrderItem`
- `PatientRecordEvent`
- `PatientPortalNotification`
- `PatientSupportTicket`

## Providers
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

## Riders & Deliveries
- `RiderProfile`
- `RiderJob`
- `RiderRequestDecision`
- `RiderPortalNotification`
- `RiderChatMessage`
- `RiderPreference`
- `RiderHistoryEntry`
- `RiderEarningsSnapshot`

## Audit, Finance, Support, And System
- `AuditEvent`
- `TimelineEvent`
- `Attachment`
- `Tag`
- `Note`
- `ActionQueueItem`
- `CommandProvider`
- `CommandRider`
- `CommandBooking`
- `CommandIncident`
- `PerformanceFlag`
- `ComplianceAudit`
- `Complaint`
- `RiskFlag`
- `Supplier`
- `StockItem`
- `InventoryBatch`
- `SaleRecord`
- `RevenueEntry`
- `PayoutRequest`
- `Invoice`
- `TransactionLog`
- `ExecutiveKPI`

## Coverage Standard
Every model listed above must be reachable through the new admin, with enough CRUD quality to support inspection, creation, updates, and operational troubleshooting.
