# Target Command Centre Architecture

- Doc Class: Dev Target Architecture
- Authority: Desired admin end state for the reset
- Change Policy: Update only if the command-centre structure changes materially
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: user direction on 2026-04-04; `backend/core/models.py`

## End State
- Admin framework: Jazmin
- Internal name: `GONEP Command Centre`
- Internal entry point: `/admin/`
- Root route: `/` redirects to `/admin/`
- Visual style: default Jazmin with minimal branding
- Template policy: no custom admin templates unless functionally required later

## Operating Areas
- Dashboard
- Access & Identity
- Patients
- Providers
- Riders & Deliveries
- Orders & Fulfillment
- Inventory & Pharmacy
- Billing & Finance
- Support & Communication
- Audit & Activity
- System Configuration

## Practical Navigation Model
Because the backend still uses a compact Django app layout, the first reset will use Jazmin ordering, icons, and top-menu shortcuts to group access around the operating areas above without reintroducing a heavy custom template layer.

## Command-Centre Standard
The admin must expose the live system clearly enough that internal operators can inspect and manage all meaningful domains from one place with working CRUD, search, filters, and change forms.
