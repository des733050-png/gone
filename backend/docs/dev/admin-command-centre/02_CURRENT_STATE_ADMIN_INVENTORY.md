# Current State Admin Inventory

- Doc Class: Dev Inventory
- Authority: Exact current-state baseline before the admin reset
- Change Policy: Update only if additional stale surfaces are discovered during the reset
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/config/settings.py`; `backend/config/urls.py`; `backend/core/admin.py`; `backend/core/admin_mixins.py`; `backend/core/views.py`; `backend/templates/`

## Framework And Settings
- `backend/config/settings.py` currently includes `unfold` and `unfold.contrib.forms`.
- The old admin branding is still `GonePharm Admin` / `GonePharm Control Center`.
- Admin behavior depends on `core.unfold.*` callbacks for dashboard, environment badge, sidebar navigation, and site dropdown.
- Custom admin CSS is injected through `core/admin-brand.css`.

## Template Surfaces
- `backend/templates/admin/base.html`
- `backend/templates/admin/index.html`
- `backend/templates/admin/login.html`
- `backend/templates/admin/logged_out.html`
- `backend/templates/unfold/helpers/app_list.html`
- `backend/templates/unfold/helpers/app_list_default.html`
- `backend/templates/unfold/helpers/unauthenticated_title.html`
- `backend/templates/public/index.html`

## Entry Surfaces
- `/` currently serves `module_launcher` from `backend/core/views.py`.
- `/admin/` serves Django admin.
- `/api/v1/` serves browser-portal APIs.

## Code Surfaces
- `backend/core/unfold.py` contains the custom admin dashboard, environment badge, dropdown, and old sidebar navigation.
- `backend/core/admin_mixins.py` contains admin access and action helpers, but active access logic still normalizes old alias names such as `control_ops_admin` to newer role groups.
- `backend/core/admin.py` registers many models but still uses Unfold `ModelAdmin` and old role naming.

## Coverage Gaps
The following live integrated models were missing from active admin registration before the reset:
- `PatientPreference`
- `ProviderLabResult`
- `ProviderAvailability`
- `ProviderClinicalSetting`
- `ProviderInventoryItem`
- `ProviderBillingRecord`
- `ProviderPortalNotification`
- `ProviderSupportTicket`
- `ProviderActivityLog`
- `ProviderPosTransaction`
- `RiderRequestDecision`
- `RiderPortalNotification`
- `RiderChatMessage`
- `RiderPreference`

## Documentation Drift
- Root docs still instruct future work to load roadmap and milestone docs first.
- `docs/milestones/` still exists even though the earlier integration program is complete.
- `README.md` still points new work to phase and milestone context.
