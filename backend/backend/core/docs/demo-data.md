# Demo Data Guide

Last updated: 2026-03-06

## Purpose
- Seed realistic demo records for all implemented modules (Control Admin, Patient, Provider, Rider).
- Create demo users mapped to role groups so role-based access can be tested quickly.
- Keep seeding idempotent so reruns do not create duplicate unique references.

## Command
```bash
python manage.py seed_demo_data
```

Optional custom password:
```bash
python manage.py seed_demo_data --password "YourStrongDemoPassword123!"
```

## What Gets Created
- Role groups via `bootstrap_control_groups`.
- Demo users:
  - `demo_superadmin`
  - `demo_admin_user`
  - `demo_patient_user`
  - `demo_provider_user`
  - `demo_rider_user`
- Cross-cutting records:
  - `Tag`, `AuditEvent`, `TimelineEvent`, `Attachment`, `Note`, `ActionQueueItem`
- Control Admin records:
  - Ops: `CommandProvider`, `CommandRider`, `CommandBooking`, `CommandIncident`, `PerformanceFlag`
  - Compliance: `ComplianceAudit`, `Complaint`, `RiskFlag`
  - Commerce: `Supplier`, `StockItem`, `InventoryBatch`, `SaleRecord`
  - Finance: `RevenueEntry`, `PayoutRequest`, `Invoice`, `TransactionLog`, `ExecutiveKPI`
- Patient records:
  - `PatientProfile`, `PatientBooking`, `PatientConsultation`, `PatientPrescription`, `PatientDiagnosticOrder`, `PatientRecordEvent`, `PatientSupportTicket`
- Provider records:
  - `ProviderProfile`, `ProviderAppointment`, `ProviderConsultation`, `ProviderPrescriptionTask`, `ProviderEarningsSnapshot`, `ProviderProtocol`
- Rider records:
  - `RiderProfile`, `RiderJob`, `RiderHistoryEntry`, `RiderEarningsSnapshot`

## Default Credentials
- Username: `demo_superadmin`
- Password: `Demo@12345`

Use `--password` to change this during seed execution.
For full seeded user list, see `core/docs/demo-user-passwords.md`.

## Notes
- The command updates existing demo records to expected defaults when re-run.
- It is intended for local/dev/UAT demo environments, not production data seeding.
