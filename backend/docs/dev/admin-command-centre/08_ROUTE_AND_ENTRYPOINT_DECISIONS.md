# Route And Entrypoint Decisions

- Doc Class: Dev Route Spec
- Authority: Internal route policy for the admin reset
- Change Policy: Update only if entry policy changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/config/urls.py`; user direction on 2026-04-04

## Decisions
- `/admin/` is the only internal command-centre entry point.
- `/` no longer serves a public module launcher.
- `/` should redirect to `/admin/`.
- `/api/v1/` remains unchanged.

## Implications
- `backend/core/views.py` no longer needs the launcher view.
- `backend/templates/public/index.html` is obsolete.
- Any docs or runbooks that still tell users to use the old launcher must be updated.
