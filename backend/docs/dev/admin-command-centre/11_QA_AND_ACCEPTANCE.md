# QA And Acceptance

- Doc Class: Dev QA Checklist
- Authority: Acceptance checklist for the new command centre
- Change Policy: Update only if acceptance criteria expand
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: approved admin reset plan; `backend/config/settings.py`; `backend/core/admin.py`

## Runtime Checks
- `python manage.py check`
- `python manage.py test`
- `/admin/login/` loads
- `/admin/` loads after authentication
- `/` redirects to `/admin/`

## Admin Coverage Checks
- Users and groups reachable as intended
- Live operational models reachable
- Missing coverage gap closed for integrated provider/rider/patient support models
- Changelists render
- Change forms render
- Create and edit forms load without template errors

## Access Checks
- `superuser` sees the full command centre
- `admin_user` can access broad operational surfaces
- domain groups see their intended sections
- ownership-scoped admin querysets behave predictably

## Cleanup Checks
- No `unfold` dependency remains in requirements or settings
- No old admin helper templates remain
- No public launcher remains
- Root docs no longer tell contributors to load roadmap and milestone docs first

## Acceptance Standard
The reset is done when the repo has one working Jazmin-backed command centre, one internal entry point, working CRUD coverage across the live system, and a current-state documentation layer that no longer treats completed phase tracking as the active operating model.
