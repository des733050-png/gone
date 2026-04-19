# 02 Architecture Map

- Doc Class: Living Doc
- Authority: Current architecture and integration-boundary reference
- Change Policy: Update when routes, ownership boundaries, or system shape change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `frontend/`; `backend/config/settings.py`; `backend/config/urls.py`; `backend/core/models.py`; `backend/portal_api/`

## System Overview
GONEP consists of three browser portals backed by a single Django application.

- Patient portal at `frontend/Gonep-patient`
- Provider portal at `frontend/Gonep-provider`
- Rider portal at `frontend/Gonep-rider`
- Django backend at `backend/`
- Internal command centre at `/admin/`

## Route Boundaries
- `/admin/` — internal command centre
- `/api/v1/auth/*` — shared browser auth endpoints
- `/api/v1/patient/*` — patient-facing API family
- `/api/v1/provider/*` — provider-facing API family
- `/api/v1/rider/*` — rider-facing API family
- `/` — internal redirect to `/admin/`

## Frontend Boundaries
- The portals define user-facing UX, role semantics as expressed in screens, and navigation intent.
- Each portal uses a portal-local API/auth layer to talk to the backend.
- Shared browser auth is cookie/session-based and tied to the backend origin.

## Backend Boundaries
- `core` contains the primary domain models and admin registrations.
- `portal_api` exposes browser-facing API endpoints.
- Django auth, CSRF, permissions, and admin remain the operational security surface.

## Current Internal Architecture Direction
- Public browser experiences stay in the portals.
- Operational control and internal data stewardship stay in the Django admin.
- The current internal workstream is migrating the admin from a custom Unfold shell to a minimal Jazmin-based command centre.
