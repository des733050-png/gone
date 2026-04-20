# Current-State Tenancy Inventory

- Doc Class: Dev Inventory
- Authority: Baseline inventory for the tenancy reset
- Change Policy: Update only if new current-state findings are discovered during implementation
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`; `backend/portal_api/views.py`; `backend/portal_api/patient_views.py`; `backend/portal_api/provider_views.py`; `backend/portal_api/rider_views.py`; `backend/core/management/commands/bootstrap_control_groups.py`; `backend/core/management/commands/seed_demo_data.py`

## Current Identity and Access State
- `Facility` exists as a first-class model, but it still uses `portal_uid` and an integer primary key.
- `ProviderMembership` is the current provider staff access bridge. It ties `user`, `provider`, and `facility`, and still carries `portal_uid`.
- `PatientUserLink` and `RiderUserLink` are one-to-one actor links with `portal_uid`.
- Active business authorization still uses flat Django groups:
  - `admin_user`
  - `patient_user`
  - `provider_user`
  - `rider_user`
- `bootstrap_control_groups` actively creates and permissions those groups.
- `seed_demo_data` actively seeds those groups and demo users into them.

## Current Session and Portal Drift
- `build_session_payload()` exposes `user.pk`, group names, and portal access booleans derived from groups and links.
- Patient, provider, and rider `/me/` endpoints still resolve access through group checks.
- Provider payloads still expose:
  - `membership.portal_uid`
  - `facility.portal_uid`
  - `affiliated_hospitals`
- Current provider access still assumes optional multiple active memberships.
- Current patient and rider access are person-linked, but not facility-context aware.

## Current Model Drift
- `BaseTrackedModel` currently provides timestamps only; no UUID primary key is defined there.
- Important provider workflow models already have `facility`, but several provider identity/configuration models do not.
- Patient operational models are still mostly person-linked plus free-text facility/provider labels.
- Rider operational models are still person-linked with no explicit facility.
- Finance, inventory, commerce, and cross-cutting operational logs are not consistently facility-scoped.

## Current Admin Drift
- The admin command centre is already on Jazmin, but it still uses flat group gating in `GroupScopedAdminMixin`.
- Admin registrations still declare `required_groups` based on `admin_user`, `patient_user`, `provider_user`, and `rider_user`.
- Admin queryset filtering is user/group-based, not facility-membership-based.

## Current Data Reset Reality
- Local/demo data is seeded and can be regenerated.
- Existing `core` migrations run from `0001_initial.py` through `0013_providerlabresult_acknowledged_and_more.py`.
- Because the reset changes primary-key strategy and tenancy rules broadly, a clean `core` migration reset is the preferred path.
