# 00 Master Charter

- Doc Class: Protected Core
- Authority: Governing project charter
- Change Policy: Protected; update only with explicit user approval
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: governing project brief; integrated repo baseline; admin reset decisions on 2026-04-04

## Project Identity
GONEP is a unified browser-based healthcare logistics platform rooted at `main/` with:

- `frontend/Gonep-patient`
- `frontend/Gonep-provider`
- `frontend/Gonep-rider`
- `backend/`
- `docs/`

The user-facing experience lives in the browser portals. The backend owns the operational truth. The Django admin now serves as the internal command centre.

## Mission
Operate and evolve the integrated GONEP system without breaking the established portal UX contract, security posture, or backend ownership boundaries.

## Core Operating Model
- The frontend is the source of UX intent, navigation semantics, terminology, and user-facing flow expectations.
- The backend is the source of authentication, authorization, validation, persistence, ownership checks, auditability, and operational rules.
- The Django admin is the internal command centre for system-wide operations and support work.
- The root `docs/` tree is the long-term project memory and current-state authority.

## Non-Negotiable Rules
1. Frontend preservation remains strict. Prefer backend adaptation or integration-layer changes over UI redesign.
2. Browser auth remains Django session/cookie auth with CSRF enabled.
3. Client-submitted identifiers are identifiers only and never proof of access.
4. Backend permission checks remain server-enforced.
5. Documentation must describe current system reality and active workstreams, not force future work to replay already-completed implementation phases.
6. The admin should expose live operational domains clearly and should not preserve obsolete shell concepts by default.
7. Root docs remain authoritative over portal-local or backend-local reference docs.

## Current Platform Baseline
- Patient, provider, and rider active shells are backend-backed.
- Shared auth is Django session/cookie auth with CSRF enabled.
- Public browser APIs live under `/api/v1/*`.
- `/admin/` is the internal control surface.
- The current active internal workstream is the `GONEP Command Centre` reset from Unfold to Jazmin.

## Documentation Governance
Doc classes:
- Protected core docs: stable authority docs that should not change casually.
- Living docs: current-state architecture, integration, security, and operational references.
- Dev workstream docs: temporary implementation authority for large internal refactors or resets.
- Appendices: retrieval-oriented reference material.

## How Future Work Should Behave
1. Read the project index.
2. Read the relevant current-state docs.
3. Read the active dev workstream docs if a major internal reset is in progress.
4. Update living docs when system reality changes.
5. Avoid reviving obsolete phase, milestone, or transitional admin concepts unless the user explicitly asks for archival reconstruction.
