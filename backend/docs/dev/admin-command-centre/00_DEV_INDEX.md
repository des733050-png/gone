# GONEP Admin Command Centre Reset

- Doc Class: Dev Workstream Index
- Authority: Temporary implementation authority for the admin reset
- Change Policy: Update during the admin reset until the new command centre is accepted
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/config/settings.py`; `backend/config/urls.py`; `backend/core/admin.py`; `backend/core/admin_mixins.py`; `backend/core/models.py`; `README.md`

## Purpose
This folder is the working memory for the Django admin reset. It exists to replace the old Unfold-based admin with a Jazmin-based `GONEP Command Centre` and to reset the repo docs out of active phase-mode.

## Loading Order
1. [01_RESET_BRIEF.md](01_RESET_BRIEF.md)
2. [02_CURRENT_STATE_ADMIN_INVENTORY.md](02_CURRENT_STATE_ADMIN_INVENTORY.md)
3. [03_PURGE_LEDGER.md](03_PURGE_LEDGER.md)
4. [04_TARGET_COMMAND_CENTRE_ARCHITECTURE.md](04_TARGET_COMMAND_CENTRE_ARCHITECTURE.md)
5. [05_MODEL_COVERAGE_MATRIX.md](05_MODEL_COVERAGE_MATRIX.md)
6. [06_ACCESS_AND_PERMISSION_RULES.md](06_ACCESS_AND_PERMISSION_RULES.md)
7. [07_JAZMIN_BASELINE_SPEC.md](07_JAZMIN_BASELINE_SPEC.md)
8. [08_ROUTE_AND_ENTRYPOINT_DECISIONS.md](08_ROUTE_AND_ENTRYPOINT_DECISIONS.md)
9. [09_DOCS_RESET_SPEC.md](09_DOCS_RESET_SPEC.md)
10. [10_IMPLEMENTATION_SEQUENCE.md](10_IMPLEMENTATION_SEQUENCE.md)
11. [11_QA_AND_ACCEPTANCE.md](11_QA_AND_ACCEPTANCE.md)

## Current State Summary
- The old admin stack is Unfold-based and includes custom templates, helper overrides, a custom dashboard/navigation callback layer, and a public launcher at `/`.
- The live backend and browser portals are already integrated; the admin reset is an internal platform cleanup and command-centre rebuild, not a portal contract change.
- Several live models introduced during portal integration are not registered in admin.
- Root docs still describe the project as phase-driven even though the integrated baseline is already established.

## Implementation Boundaries
- Keep `/api/v1/*` stable.
- Use minimal Jazmin customization.
- Remove Unfold completely rather than preserving a compatibility layer.
- Treat the old phase/milestone operating model as retired; preserve useful history only where it helps current-state understanding.
