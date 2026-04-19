# 09 Current Workstreams

- Doc Class: Living Doc
- Authority: Active workstream and next-steps reference
- Change Policy: Update as current priorities change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `docs/11_RISKS_AND_DECISIONS.md`; `docs/dev/facility-tenancy-uuid-reset/00_DEV_INDEX.md`; `README.md`

## Active Workstreams

### Facility-Tenancy + UUID Baseline
- keep facility-first tenancy stable across admin, seed, and portal APIs
- keep UUID-backed domain identity consistent in payloads and CRUD flows
- maintain single-facility staff access and active-facility patient/rider session context

### Operational QA And CRUD Confidence
- keep backend checks green
- verify portal API behavior after tenancy and identity changes
- continue improving CRUD coverage and admin usability where gaps appear

### Optional Cleanup
- review duplicate provider screen trees
- review stale backend-local reference docs
- review whether `core.models` should be split later for maintainability
- review whether provider onboarding copy should be renamed fully from hospital-oriented wording to facility-oriented wording

## Next Decision Surfaces
- whether any remaining backend-local docs should be archived or refreshed
- whether patient/rider facility switching should get an explicit frontend selector in the public UX
- whether to modularize the `core` app after the facility-tenancy reset stabilizes
