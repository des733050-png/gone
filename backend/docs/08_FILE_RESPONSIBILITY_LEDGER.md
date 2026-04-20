# 08 File Responsibility Ledger

- Doc Class: Living Doc
- Authority: High-signal file and folder responsibility map
- Change Policy: Update when ownership boundaries or major file roles change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: repo inventory on 2026-04-04

| Path | Role | Modification Guidance |
| --- | --- | --- |
| `frontend/Gonep-patient/src/` | Active patient UX and API integration surface | Preserve UX; prefer API-layer changes first |
| `frontend/Gonep-provider/src/` | Active provider shell and business workflow surface | Preserve active namespaced shell; be careful around legacy duplicate trees |
| `frontend/Gonep-rider/src/` | Active rider UX and API integration surface | Preserve UX; route backend changes through existing integration seams |
| `backend/config/settings.py` | Global Django stack, auth/security, admin framework configuration | High-impact; update carefully and verify |
| `backend/config/urls.py` | Root route boundaries | High-impact; affects admin entry and API exposure |
| `backend/core/models.py` | Primary domain model ledger | High-impact; central operational truth |
| `backend/core/admin.py` | Internal command-centre model registrations and CRUD behavior | Active command-centre surface |
| `backend/core/admin_mixins.py` | Shared admin access and action behavior | Keep simple and current-state accurate |
| `backend/portal_api/` | Public browser API implementation | Must remain stable for portal UX |
| `docs/` | Long-term current-state project memory | Update when system reality changes |
| `docs/dev/admin-command-centre/` | Temporary implementation authority for the admin reset | Update during the reset only |
