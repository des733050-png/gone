# Jazmin Baseline Spec

- Doc Class: Dev UI Baseline
- Authority: Minimal admin UI specification for the reset
- Change Policy: Update only if the admin framework or branding baseline changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: user direction on 2026-04-04; `backend/config/settings.py`

## Framework
- Remove `django-unfold`
- Add `django-jazzmin`
- Use Jazmin defaults as the primary admin UI

## Branding
- Site title: `GONEP Command Centre`
- Site header: `GONEP Command Centre`
- Welcome text: operational and minimal
- Logo and favicon: optional, lightweight reuse of existing backend branding assets where useful

## UI Policy
- No replacement custom admin templates in the initial reset
- No custom dashboard framework in the initial reset
- No heavy theme CSS in the initial reset
- Use Jazmin ordering, icons, and top-menu links to improve navigation without a new custom shell

## Outcome
The admin should feel current, clean, and operational without recreating the complexity of the old Unfold stack.
