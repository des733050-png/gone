# 10 Changelog Ledger

- Doc Class: Living Doc
- Authority: Chronological record of major repo changes
- Change Policy: Append or refresh entries as major work lands
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: git worktree; `README.md`; `docs/`

## 2026-04-04 — Facility-Tenancy + UUID Reset
- Created the `docs/dev/facility-tenancy-uuid-reset/` workstream doc set.
- Rebuilt `core` domain models around UUID primary keys through `BaseTrackedModel`.
- Removed active `portal_uid` and flat business-group assumptions from the live backend flow.
- Normalized provider staff access around single-facility `ProviderMembership` records with facility roles such as `facility_admin`, `doctor`, `billing_manager`, `lab_manager`, `receptionist`, and `pos`.
- Added explicit patient and rider facility-access models and active-facility session switching support.
- Regenerated the `core` migration history from a clean baseline and rebuilt local demo data under the new tenancy model.
- Rewrote the backend regression suite around facility isolation, UUID identities, session context, and admin tenancy behavior.
- Updated the active provider frontend path to use `facility_admin` wording and facility-context fields instead of the older hospital-admin assumptions.

## 2026-04-04 — Command Centre Reset
- Created the `docs/dev/admin-command-centre/` workstream doc set.
- Replaced the old Unfold admin stack with a Jazmin-based `GONEP Command Centre` baseline.
- Removed old admin template overrides, helper overrides, launcher view/template, Unfold hooks, and obsolete admin CSS.
- Reset `/` to redirect to `/admin/`.
- Rebuilt admin registrations around the live operational model set, including previously missing patient, provider, and rider entities.
- Reset the root docs away from roadmap/milestone-first loading and into current-state/workstream-driven documentation.
- Replaced the leftover `Northstar Operations Admin` logo treatment with the neutral GONEP icon and expanded the Jazzmin sidebar icon map so admin surfaces use explicit icons instead of sparse fallbacks.
- Converted provider support-ticket finite fields and provider activity roles to model-backed choice selectors so the admin now renders dropdowns aligned to the active frontend option set instead of free-text inputs.

## Integrated Baseline Buildout
- Shared Django session auth with CSRF was implemented for patient, provider, and rider portals.
- Patient, provider, and rider active shells were integrated with backend-backed business data.
- CRUD and runtime hardening work landed across the active portal surfaces.
- Root documentation, local run guidance, and regression tests were established and expanded during the integration program.
