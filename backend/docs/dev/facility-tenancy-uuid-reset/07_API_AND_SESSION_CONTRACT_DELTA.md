# API and Session Contract Delta

- Doc Class: Dev Contract Delta
- Authority: Session and portal payload changes for the reset
- Change Policy: Update as implementation refines response shapes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/portal_api/views.py`; `backend/portal_api/utils.py`; `backend/portal_api/patient_views.py`; `backend/portal_api/provider_views.py`; `backend/portal_api/rider_views.py`

## Session Payload Requirements
Session payloads must shift from portal-group booleans to facility context.

Required fields:
- `principal_type`
- `active_facility_id`
- `active_facility_name`
- `accessible_facilities`
- `role` where applicable

## Provider `/me/`
- stop exposing `portal_uid`
- stop exposing `affiliated_hospitals`
- stop using `hospital_id`
- return UUID `id`
- return facility context for the single active facility
- return `role` using the new facility role vocabulary

## Patient `/me/`
- return UUID `id`
- include current facility context
- include available facility contexts
- keep person-facing profile fields the portal needs

## Rider `/me/`
- return UUID `id`
- include current facility context
- include available facility contexts
- keep rider-facing operational/profile fields the portal needs

## Switching Facility Context
- add an auth/session endpoint for changing active facility context where the principal has multiple facility-access rows
- reject access to any facility the principal is not explicitly allowed to enter
