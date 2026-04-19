# 05 Integration Strategy

- Doc Class: Living Doc
- Authority: Rules for future backend/frontend work on top of the integrated baseline
- Change Policy: Update when integration rules or contract strategy changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `docs/03_FRONTEND_SOURCE_OF_TRUTH.md`; `docs/04_BACKEND_CAPABILITY_MAP.md`; `docs/06_AUTH_AND_SECURITY_PLAN.md`

## Current Strategy
The main public integration work is complete. Future work should now follow a stabilization and extension strategy rather than a migration-phase strategy.

## Rules For Future Changes
- Preserve visible portal UX unless a change is necessary for correctness or explicit user direction.
- Keep auth, permission, validation, and ownership logic in the backend.
- Use portal-local API layers as the preferred seam for contract adaptation.
- Keep `/api/v1/*` stable and versioned by namespace family rather than by ad hoc endpoint drift.
- Use the admin for internal command and control, not the portals.

## Current Focus
- internal admin reset and command-centre cleanup
- operational CRUD coverage
- runtime QA and resilience
- selective cleanup of stale duplicate files and obsolete docs

## Anti-Patterns
- reintroducing mock/real dual-mode runtime behavior
- trusting client-submitted ownership claims
- redesigning portals to compensate for backend gaps that should be solved server-side
- reviving old admin shell concepts after the command-centre reset
