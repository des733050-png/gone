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
- Facilities **Nairobi General** and **Westlands Medical Centre**, each with a **VERIFIED** `ProviderVerificationSubmission` so provider APIs that enforce verification work in demo.
- Demo users (emails are the login identifiers in the portals):
  - `demo.superadmin@gonep.local` — Django superuser; **do not use** for the Provider mobile/web app (`/api/v1/provider/*` expects a staff membership).
  - `admin@nairobi-general.co.ke`, `doctor@nairobi-general.co.ke`, `billing@…`, `lab@…`, `reception@…`, `pos1@…` — Nairobi staff (use these for **Provider portal**).
  - `doctor@westlands-medical.co.ke` — doctor at Westlands (patient can book after switching facility).
  - `demo.patient@gonep.local` — **Patient portal**.
  - `demo.rider@gonep.local` — **Rider portal**.
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
  - `ProviderProfile`, `ProviderMembership`, `ProviderAvailability` (multi-day slots: In Facility, Virtual, Home Visit), `ProviderVerificationSubmission` (VERIFIED), `ProviderAppointment`, `ProviderConsultation`, `ProviderPrescriptionTask`, `ProviderEarningsSnapshot`, `ProviderProtocol`
- Rider records:
  - `RiderProfile`, `RiderJob`, `RiderHistoryEntry`, `RiderEarningsSnapshot`

## Default Credentials
- Default password for most seeded users: **`Demo@12345`** (override with `--password`).
- Superuser password defaults to **`password@123`** (`--superadmin-password`).

Use `--password` to change this during seed execution.
For a concise credential list, see `core/docs/demo-user-passwords.md`.

## Provider vs superuser
Sign in to the **Gonep Provider** app with a **staff** email (e.g. `doctor@nairobi-general.co.ke`), not the superuser. The superuser has no `ProviderMembership`, so `/api/v1/provider/me/` returns 404.

## Notes
- The command updates existing demo records to expected defaults when re-run.
- It is intended for local/dev/UAT demo environments, not production data seeding.
