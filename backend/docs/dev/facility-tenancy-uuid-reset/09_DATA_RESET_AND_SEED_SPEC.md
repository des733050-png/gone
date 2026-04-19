# Data Reset and Seed Spec

- Doc Class: Dev Data Reset Spec
- Authority: Reset and demo-data policy for the tenancy reset
- Change Policy: Update if reset or seed strategy changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/migrations/*`; `backend/core/management/commands/bootstrap_control_groups.py`; `backend/core/management/commands/seed_demo_data.py`

## Reset Policy
- Treat existing local/demo domain data as disposable.
- Prefer a clean `core` migration reset over fragile multi-step PK conversion migrations.
- Rebuild demo data against the new UUID + facility-tenancy schema.

## Bootstrap Replacement
- retire `bootstrap_control_groups` as the active business-role bootstrap
- seed facilities first
- seed superuser
- seed facility staff memberships
- seed patient/rider facility access
- seed facility-isolated operational data

## Demo Data Expectations
- each staff account belongs to exactly one facility
- each patient and rider account has one or more facility-access rows
- provider, patient, rider, finance, inventory, and notification data is isolated by facility
