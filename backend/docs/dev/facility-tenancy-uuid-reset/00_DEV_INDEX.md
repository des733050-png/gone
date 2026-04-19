# GONEP Facility-Tenancy + UUID Reset

- Doc Class: Dev Workstream Index
- Authority: Temporary implementation authority for the facility-tenancy and UUID reset
- Change Policy: Update during the reset until the new tenancy baseline is accepted
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/core/models.py`; `backend/portal_api/views.py`; `backend/portal_api/patient_views.py`; `backend/portal_api/provider_views.py`; `backend/portal_api/rider_views.py`; `backend/portal_api/utils.py`; `backend/core/admin.py`; `backend/core/admin_mixins.py`; `backend/core/management/commands/bootstrap_control_groups.py`; `backend/core/management/commands/seed_demo_data.py`

## Purpose
This folder is the working memory for the facility-first tenancy reset. It exists to replace user-first business ownership with facility-first tenancy, move `core` domain models to UUID primary keys, remove flat business-role groups from active authorization, and establish facility-scoped session, API, seed, and admin behavior.

## Loading Order
1. [01_RESET_BRIEF.md](01_RESET_BRIEF.md)
2. [02_CURRENT_STATE_TENANCY_INVENTORY.md](02_CURRENT_STATE_TENANCY_INVENTORY.md)
3. [03_OWNERSHIP_CLASSIFICATION.md](03_OWNERSHIP_CLASSIFICATION.md)
4. [04_UUID_IDENTITY_SPEC.md](04_UUID_IDENTITY_SPEC.md)
5. [05_ROLE_AND_MEMBERSHIP_MODEL.md](05_ROLE_AND_MEMBERSHIP_MODEL.md)
6. [06_MODEL_RESHAPE_MATRIX.md](06_MODEL_RESHAPE_MATRIX.md)
7. [07_API_AND_SESSION_CONTRACT_DELTA.md](07_API_AND_SESSION_CONTRACT_DELTA.md)
8. [08_ADMIN_TENANCY_SPEC.md](08_ADMIN_TENANCY_SPEC.md)
9. [09_DATA_RESET_AND_SEED_SPEC.md](09_DATA_RESET_AND_SEED_SPEC.md)
10. [10_IMPLEMENTATION_SEQUENCE.md](10_IMPLEMENTATION_SEQUENCE.md)
11. [11_QA_AND_ACCEPTANCE.md](11_QA_AND_ACCEPTANCE.md)

## Reset Summary
- `core` domain models now use UUID primary keys through `BaseTrackedModel`.
- `Facility` is the active operational tenancy boundary for staff-facing records and relevant cross-cutting records.
- Flat business-role groups are retired from active authorization flow.
- `ProviderMembership` is now the live single-facility staff access bridge.
- Patient and rider access uses explicit facility-access rows plus active-facility session context.
- Session payloads and `/me/` payloads now expose facility context instead of the retired group-driven assumptions.

## Boundaries
- Django auth internals keep their existing identity model; this reset does not convert Django `User` or built-in auth tables to UUID.
- Existing browser portal UX should remain recognizable.
- Existing `/api/v1/*` namespaces stay in place, but their payloads and permission rules may change to reflect facility tenancy.
- Clean local/demo data reset is allowed and expected.
