# Reset Brief

- Doc Class: Dev Workstream Brief
- Authority: Purpose and scope definition for the admin reset
- Change Policy: Update only if the admin reset direction changes materially
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: user direction on 2026-04-04; `docs/00_MASTER_CHARTER.md`; `backend/config/settings.py`

## Intent
Replace the old Unfold admin with a new Jazmin-based `GONEP Command Centre` that acts as the single internal operating surface for the live integrated system.

## Core Principles
- The old admin presentation layer is disposable.
- The new admin should feel operational, minimal, and current-state accurate.
- The admin is the command centre, not a side utility.
- The portals remain the user-facing experience; admin remains the internal control surface.
- Avoid custom templates unless Jazmin defaults cannot express a required function.

## In Scope
- Remove Unfold and related template/helper/dashboard code.
- Install and configure Jazmin.
- Rebuild admin registrations and navigation around live operational domains.
- Register missing integrated models.
- Simplify permission logic and remove legacy alias-thinking from active admin behavior.
- Remove the public launcher pattern and redirect `/` to `/admin/`.
- Reset root docs out of active phase-mode.

## Out Of Scope
- Portal API contract changes.
- Live relational data deletion.
- Large schema redesigns unrelated to admin access or CRUD.
- New frontend feature work.

## Naming
- Canonical admin name: `GONEP Command Centre`
- Canonical entry point: `/admin/`

## Non-Goals
- Preserve old Unfold visuals.
- Preserve old command/control section names just because they already exist.
- Keep milestone/phase governance as the active operating model in the main docs.
