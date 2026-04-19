# Implementation Sequence

- Doc Class: Dev Execution Sequence
- Authority: Ordered execution plan for the reset
- Change Policy: Update only if execution ordering changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: This workstream

## Ordered Steps
1. Create the dev workstream docs and freeze the current-state inventory.
2. Refactor `core.models`:
   - add UUID primary keys through `BaseTrackedModel`
   - introduce facility staff membership and facility access models
   - add facility scope to relevant models
   - retire `portal_uid`
3. Refactor backend utility helpers and auth/session payload builders.
4. Refactor patient, provider, and rider API permission gates to use facility context instead of flat groups.
5. Refactor admin filtering and provisioning rules to use facility tenancy.
6. Replace seed/bootstrap logic with facility-first demo data.
7. Reset `core` migrations and local demo database state.
8. Run migrate, seed, checks, tests, and admin smoke verification.
9. Update root docs so facility-first tenancy is the current baseline.

## Execution Result
- All ordered steps were completed on 2026-04-04.
- The schema was regenerated from a clean `core.0001_initial` baseline.
- Verification completed with `manage.py check`, `manage.py migrate`, `manage.py seed_demo_data`, `manage.py test`, and Expo web exports for patient, provider, and rider.
