# Implementation Sequence

- Doc Class: Dev Execution Sequence
- Authority: Ordered execution guide for the admin reset
- Change Policy: Update only if dependency order changes materially
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: approved admin reset plan; current repo inventory

## Ordered Sequence
1. Create the admin reset dev docs.
2. Replace Unfold with Jazmin in `backend/requirements.txt` and `backend/config/settings.py`.
3. Delete obsolete Unfold templates, helper overrides, CSS, launcher view/template, and helper tags.
4. Reset `/` to redirect to `/admin/`.
5. Rebuild `backend/core/admin_mixins.py` around the current role model.
6. Rebuild `backend/core/admin.py` to use standard Django admin classes and register all live operational models.
7. Reset root docs and prompt docs out of phase mode.
8. Remove milestone docs and old roadmap authority.
9. Run verification and fix fallout.

## Rollback Boundary
The natural rollback boundary is before the admin framework swap. Once Unfold is removed and Jazmin becomes the configured admin framework, the repo should be treated as committed to the new command-centre path.
