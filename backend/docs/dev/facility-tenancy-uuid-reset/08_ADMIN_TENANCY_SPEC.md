# Admin Tenancy Spec

- Doc Class: Dev Admin Spec
- Authority: Facility filtering and command-centre behavior for the reset
- Change Policy: Update as admin filtering and field restrictions are implemented
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/admin.py`; `backend/core/admin_mixins.py`; `backend/config/settings.py`

## Command Centre Rules
- Superuser sees all facilities and all records.
- Non-superuser staff sees only the single facility they belong to.
- Admin querysets for facility-owned models must be facility-filtered by default.
- Related-field choices for facility-owned forms must be restricted to the user’s facility.
- Facility-owned records should auto-lock or default their facility for non-superuser staff.
- Only superuser provisions staff and assigns facility roles.

## Command Centre Structure
- Access & Identity
- Facilities
- Patients
- Providers
- Riders & Deliveries
- Orders & Fulfillment
- Inventory & Pharmacy
- Billing & Finance
- Support & Communication
- Audit & Activity
- Legacy Internal
- System Configuration

## Legacy Model Handling
- `Command*` and similar older control-plane models remain available only to superuser until separately retired or remapped.
