# Portal CRUD Role Matrix

This matrix documents current API exposure and authorization boundaries for portal CRUD operations before parity updates.

## Authentication And Session

- `auth/login`, `auth/logout`, `auth/session`, `auth/csrf`, `auth/mobile-token`: authenticated state management shared across portals.
- Role/principal resolution source: `portal_api/utils.py` via `build_session_payload`.

## Patient Portal (`patient/*`)

- Access model: authenticated user + active `patient_link` + active patient facility context.
- No staff sub-role branching; data scope is self-patient only.
- CRUD surfaces:
  - Profile/settings: read + patch self (`me`, `settings`).
  - Appointments: list/read + patch own appointment actions.
  - Orders: list/read + reorder own orders.
  - Records: list/read own records.
  - Support tickets: list/create/read/update own tickets.
  - Notifications: list/read one/read all.

## Provider Portal (`provider/*`)

- Access model: authenticated staff membership (`ProviderMembership`) + explicit role guards.
- Authorization helper: `ensure_roles(...)` in `portal_api/provider_views.py`.
- Role-keyed CRUD highlights:
  - `facility_admin`: full provider CRUD (staff, inventory control, settings, analytics, POS accounts, billing, consultations, support moderation).
  - `doctor`: clinical CRUD (appointments/consultations/lab acknowledge), constrained ownership where implemented.
  - `billing_manager`: billing + analytics + limited inventory reads.
  - `lab_manager`: lab + inventory mutation + prescription dispatch/cancel.
  - `receptionist`: appointment scheduling/status operations + limited staff reads.
  - `pos`: POS transactions and terminal-scoped operations.

## Rider Portal (`rider/*`)

- Access model: authenticated user + active `rider_link` + active rider facility context.
- No provider sub-role matrix; rider identity boundaries enforce ownership.
- CRUD surfaces:
  - Dashboard/requests/active/trips/earnings: read own rider context.
  - Request actions/progress/complete: update only assigned rider deliveries.
  - Messages: list/create for own assigned orders.
  - Notifications/settings/status: read/update own rider resources.

## Security Notes Applied In This Pass

- Backend authorization remains server-side source of truth (frontend role gating is UX only).
- Any newly added endpoint must include principal scope checks and role checks where staff-facing.
- Unauthorized access must continue returning `403`/`404` without leaking cross-tenant data.
