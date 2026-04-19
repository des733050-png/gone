# QA and Acceptance

- Doc Class: Dev QA Checklist
- Authority: Acceptance criteria for the reset
- Change Policy: Update as test coverage and QA scenarios are added
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: This workstream

## Required Verification
- `python manage.py check` — passed
- `python manage.py test` — passed
- fresh migrate on the reset schema — passed
- fresh seed on the reset schema — passed
- admin login and facility-filtered changelists/forms — baseline verified through command-centre permissions and queryset tests

## Model Acceptance
- every `core` domain model uses UUID PK
- facility-owned models carry facility scope
- staff membership is single-facility only

## Permission Acceptance
- superuser can access all facility records
- non-superuser staff cannot access another facility’s records
- patient/rider access is constrained to the active facility context
- flat group-based business authorization no longer grants portal access

## Payload Acceptance
- `/auth/session/` returns facility-context payloads
- patient/provider/rider `/me/` payloads return UUID ids
- human-readable refs remain separate from UUID ids

## Smoke Scenarios
- Facility A doctor cannot access Facility B appointments, billing, inventory, or support data
- Facility A facility admin cannot inspect or assign Facility B staff
- Patient with multiple facility-access rows sees only the active facility’s records
- Rider with multiple facility-access rows sees only the active facility’s jobs and notifications
