# 11 Risks And Decisions

- Doc Class: Living Doc
- Authority: Active risk register and decision ledger
- Change Policy: Update as implementation reality changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `docs/05_INTEGRATION_STRATEGY.md`; `docs/06_AUTH_AND_SECURITY_PLAN.md`; `docs/09_CURRENT_WORKSTREAMS.md`; `docs/dev/facility-tenancy-uuid-reset/00_DEV_INDEX.md`

## Confirmed Decisions
- Browser auth remains Django session/cookie auth with CSRF enabled.
- Frontend UX remains the public contract source of truth.
- Backend remains the authority for auth, permissions, validation, persistence, and business logic.
- `/api/v1/*` remains the namespaced browser API surface.
- `/admin/` is the single internal command-centre entry point.
- The old Unfold admin and public launcher pattern are obsolete and should not return as active runtime surfaces.
- Root docs should describe current system reality and active workstreams, not completed integration phases.
- `Facility` is the primary tenancy boundary for operational access and data isolation.
- `User` remains the authenticated actor, but non-superuser staff authorization resolves through facility membership only.
- UUID is the active identity baseline for `core` domain models and public domain-resource payloads.
- Flat business-role Django groups are retired from active authorization flow.

## Active Risks

### Duplicate Provider Screen Trees
- The repo still contains duplicate provider screen files outside the active namespaced shell.
- Risk: future contributors may edit inactive files by mistake.

### Core Model Concentration
- `core.models` remains large and could become harder to maintain if model growth continues.

### Admin Coverage Quality Needs Ongoing QA
- The command-centre reset broadens admin model coverage substantially.
- Risk: some low-frequency forms, filters, or actions may still need follow-up refinement after real use.

### Backend-Local Legacy Docs
- `backend/core/docs/` still contains older role-split and demo-data notes that describe the retired flat-group model.
- Risk: contributors may read those files before the root docs and infer outdated access rules.

### Remaining Hospital-Oriented Copy
- Some provider onboarding and historical reference text still uses hospital-specific wording even though facility-tenancy is now the actual platform model.
- Risk: terminology drift may confuse future contributors or operators.

## Resolved Risks
- Runtime mock mode is no longer the active baseline for the patient, provider, or rider portals.
- Shared browser-session behavior is documented clearly in the runbook and README.
- The old phase/milestone program is no longer the active authority model for new work.
- Predictable integer IDs are no longer the active identity baseline for `core` domain records.
- Portal auth/session payloads no longer rely on flat role groups or `portal_uid`.

## Next Actions
1. Continue manual CRUD QA inside the Jazmin-backed command centre with real facility-scoped accounts.
2. Clean up or archive stale backend-local docs that still describe the retired flat-group model.
3. Tighten any remaining onboarding or provider copy that still uses hospital-oriented language where facility wording is now the true model.
