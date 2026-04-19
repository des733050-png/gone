# Role and Membership Model

- Doc Class: Dev Access Spec
- Authority: Facility-staff role model for the reset
- Change Policy: Update only if staff roles or assignment rules change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`; `backend/portal_api/provider_views.py`; `backend/core/management/commands/bootstrap_control_groups.py`

## Canonical Staff Roles
- `facility_admin`
- `doctor`
- `billing_manager`
- `lab_manager`
- `receptionist`
- `pos`

## Membership Rules
- Every non-superuser staff account must have exactly one active facility membership.
- `superuser` remains the only platform-wide override.
- Flat business-role Django groups are no longer the active authorization source.
- Staff provisioning is superuser-only.
- Facility admins manage operations inside their facility, not platform-wide staff provisioning.

## Membership Model Direction
Use a facility staff membership bridge with these fields:
- `user`
- `facility`
- `role`
- optional linked `ProviderProfile`
- `is_active`

## Transition
- Replace `ProviderMembership` with `FacilityStaffMembership` as the general staff membership concept.
- `hospital_admin` is retired; `facility_admin` becomes the canonical facility leadership role.

## Patient and Rider Access
- Keep `PatientUserLink` and `RiderUserLink` as actor/account links.
- Add facility access models:
  - `PatientFacilityAccess`
  - `RiderFacilityAccess`
- Those access models determine which facility contexts the principal may enter.
