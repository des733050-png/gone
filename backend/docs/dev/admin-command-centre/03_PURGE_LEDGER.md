# Purge Ledger

- Doc Class: Dev Deletion Ledger
- Authority: Obsolete surfaces approved for removal in the admin reset
- Change Policy: Add to this list only if more obsolete admin-reset residue is confirmed
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/templates/`; `backend/core/unfold.py`; `backend/core/views.py`; `docs/`

## Approved For Removal
- `backend/templates/admin/*`
- `backend/templates/unfold/*`
- `backend/core/unfold.py`
- `backend/core/static/core/admin-brand.css`
- `backend/core/static/core/public-launcher.css`
- `backend/core/views.py`
- `backend/templates/public/index.html`
- `backend/core/templatetags/admin_ui.py`
- `docs/milestones/*`
- `docs/09_PHASE_ROADMAP.md`
- `backend/core/docs/gonep-admin-revamp-phases.md`

## Approved For Replacement
- Unfold settings and callback hooks in `backend/config/settings.py`
- Old module-launcher route in `backend/config/urls.py`
- Old role/section naming in admin-facing code and docs
- Active prompt guidance that requires roadmap/milestone loading

## Rationale
These files and settings express an earlier admin program, phase doctrine, or entry surface that no longer matches the live integrated system and should not remain as active authority.
