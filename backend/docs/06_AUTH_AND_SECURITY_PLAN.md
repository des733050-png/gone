# 06 Auth And Security Plan

- Doc Class: Living Doc
- Authority: Current browser auth and backend security model
- Change Policy: Update when auth, CSRF, cookie, or authorization behavior changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `backend/config/settings.py`; `backend/portal_api/views.py`; `backend/portal_api/patient_views.py`; `backend/portal_api/provider_views.py`; `backend/portal_api/rider_views.py`

## Active Model
- Django-backed login
- session/cookie auth
- HttpOnly cookie in secure environments
- CSRF enabled
- backend-enforced permissions
- `request.user` as server identity

## Why This Remains The Standard
- The app is browser-based.
- The same backend serves all three portals.
- Server-side session auth matches the platform’s security direction and avoids client-side token sprawl.

## Implementation Notes
- Portal auth layers bootstrap against backend session truth.
- Unsafe requests require CSRF.
- Browser tabs on different frontend ports still share the same backend session if they use the same browser profile.

## Disallowed Patterns
- UID-based authorization
- trusting client-submitted ownership claims
- localStorage token auth as the primary browser auth strategy
- casually disabling CSRF

## Internal Command Centre
The Django admin is separate from the public portal experience, but it still operates under Django auth and staff/superuser access rules.
