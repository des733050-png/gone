# 07 API Contract Matrix

- Doc Class: Living Doc
- Authority: Current public API family reference for the integrated portals
- Change Policy: Update when portal-facing routes or response ownership rules change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/portal_api/urls.py`; `backend/portal_api/views.py`; `backend/portal_api/patient_views.py`; `backend/portal_api/provider_views.py`; `backend/portal_api/rider_views.py`

## Shared Auth
| Area | Routes | Purpose |
| --- | --- | --- |
| Auth | `/api/v1/auth/csrf/`, `/api/v1/auth/login/`, `/api/v1/auth/logout/`, `/api/v1/auth/session/` | Shared browser auth bootstrap and session lifecycle |

## Patient
| Area | Routes | Purpose |
| --- | --- | --- |
| Session shape | `/api/v1/patient/me/` | Resolve active patient session context |
| Core data | `/api/v1/patient/appointments/`, `/orders/`, `/records/`, `/notifications/` | Main patient portal data surfaces |

## Provider
| Area | Routes | Purpose |
| --- | --- | --- |
| Session shape | `/api/v1/provider/me/` | Resolve active provider membership context |
| Core data | `/api/v1/provider/*` | Active provider shell business-data surfaces including appointments, consultations, lab, inventory, billing, support, notifications, POS, analytics, and staffing-related data |

## Rider
| Area | Routes | Purpose |
| --- | --- | --- |
| Session shape | `/api/v1/rider/me/` | Resolve active rider session context |
| Core data | `/api/v1/rider/requests/`, `/active/`, `/earnings/`, `/notifications/`, `/chat/`, `/profile/`, `/settings/` | Rider operations and delivery flows |

## Contract Rules
- Portal APIs remain namespaced by user context.
- Auth requirements are server-enforced.
- Ownership checks happen in backend code, not in the browser.
- Future contract changes should preserve frontend semantics wherever possible.
