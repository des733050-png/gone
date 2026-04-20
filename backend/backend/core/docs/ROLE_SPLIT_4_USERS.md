# ROLE SPLIT: 4 USER TYPES + SUPERUSER

Last updated: 2026-03-07

## USER TYPES
- `admin_user`: Internal platform operations and oversight.
- `patient_user`: Patient-side service flow.
- `provider_user`: Service provider/fulfillment workflow.
- `rider_user`: Delivery/logistics workflow.

## SUPERUSER
- `demo_superadmin` remains technical/global admin outside business roles.
- Full platform access for maintenance and governance.

## MODULE ACCESS MAP
- `admin_user`:
  - Ops: bookings, providers, riders, incidents, performance flags
  - Compliance: audits, complaints, risk flags, evidence
  - Commerce: stock, inventory, sales, suppliers
  - Finance: revenue, payouts, invoices, transactions, KPIs
  - Shared internals: queue, notes, timeline, audit, tags
- `patient_user`:
  - Patient profile, bookings, consultations, prescriptions, diagnostics, records, support tickets
- `provider_user`:
  - Provider profile, appointments, consultations, prescription queue, earnings, protocols
- `rider_user`:
  - Rider profile, jobs, history, earnings

## IMPLEMENTATION NOTES
- Group bootstrap now creates only:
  - `admin_user`, `patient_user`, `provider_user`, `rider_user`
- Legacy groups are removed during bootstrap command execution.
- Existing admin registrations keep working through alias mapping in permission mixins.
- Dashboard workspace shortcuts are filtered by logged-in role.
