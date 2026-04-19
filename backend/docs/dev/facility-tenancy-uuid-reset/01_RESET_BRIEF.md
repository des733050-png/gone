# Reset Brief

- Doc Class: Dev Workstream Brief
- Authority: Scope and decision brief for the facility-tenancy reset
- Change Policy: Update only when the reset scope or core decisions change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`; `backend/portal_api/utils.py`; `backend/portal_api/provider_views.py`

## Intent
Rebuild the backend around facility-first tenancy instead of user-first business ownership. `User` remains the authenticated actor. `Facility` becomes the primary operational boundary for relevant data access, record filtering, role assignment, and admin visibility.

## Core Decisions
- Canonical tenancy boundary: `Facility`
- Canonical platform-wide override: Django `superuser`
- Canonical staff role model: facility-assigned roles only
- Canonical staff roles:
  - `facility_admin`
  - `doctor`
  - `billing_manager`
  - `lab_manager`
  - `receptionist`
  - `pos`
- Non-superuser staff accounts must belong to exactly one facility
- Patient and rider identities can span facilities, but their portal session remains scoped to one active facility context at a time
- All `core` domain models should use UUID primary keys through the shared tracked-model base
- Human-readable refs stay separate from UUID identity

## Non-Goals
- Do not replace Django `User` as the auth identity
- Do not redesign portal UX flows
- Do not preserve flat business-role groups as an active permission layer
- Do not preserve `portal_uid` as an active identity or authorization concept

## Implementation Posture
- Prefer a coherent schema reset over fragile compatibility shims
- Treat current demo/domain data as disposable
- Keep API namespaces stable, but update payloads and permission behavior to reflect the new tenancy model
