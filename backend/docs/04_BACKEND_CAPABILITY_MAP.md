# 04 Backend Capability Map

- Doc Class: Living Doc
- Authority: Current Django capability and internal-platform reference
- Change Policy: Update when backend capabilities or major internal structures change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/config/settings.py`; `backend/config/urls.py`; `backend/core/models.py`; `backend/core/admin.py`; `backend/portal_api/`

## Current Stack
- Django 4.2.7
- Django REST Framework
- `django-cors-headers`
- session authentication for browser portals
- CSRF enabled
- SQLite in local development

## Current Django Apps
- `core` — main domain models, seed flow, and admin registrations
- `portal_api` — browser-facing portal APIs

## Auth And Security
- Shared session/cookie auth for patient, provider, and rider portals
- CSRF-protected write operations
- backend-enforced permissions and facility tenancy checks
- `User` is the authenticated actor only
- `Facility` is the primary operational tenancy boundary
- non-superuser staff access resolves through active `ProviderMembership` rows with facility-scoped roles
- patient and rider sessions resolve through explicit active facility context

## Identity And Ownership
- `BaseTrackedModel` now provides UUID primary keys for concrete `core` domain models
- human-readable business references remain separate from UUID identity
- `portal_uid` is retired from the active backend model and API flow
- facility-owned operational records carry explicit `facility` scope where relevant

## Admin Posture
- `/admin/` is the internal command centre
- the old Unfold shell has been retired in favor of a Jazmin-based admin reset
- the admin is facility-filtered for non-superuser staff by default
- related choices and visible querysets are constrained to the active facility where applicable
- the admin exposes live operational models across patient, provider, rider, finance, audit, and support surfaces

## Live Domain Coverage
- shared operational entities: facilities, links, memberships, attachments, notes, actions, audit events
- patient entities: profiles, facility-access rows, preferences, bookings, consultations, prescriptions, diagnostics, orders, notifications, support
- provider entities: profiles, memberships, appointments, consultations, tasks, lab, availability, clinical settings, inventory, billing, activity, POS
- rider entities: profiles, facility-access rows, jobs, decisions, notifications, chat, preferences, earnings, history

## Current Internal Workstream
The active backend baseline is now facility-first tenancy plus UUID-backed domain identity. Current work focuses on keeping that baseline stable across admin behavior, portal APIs, seed data, and operational CRUD.
