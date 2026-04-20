# 03 Frontend Source Of Truth

- Doc Class: Living Doc
- Authority: UX contract and portal behavior reference
- Change Policy: Update when visible portal behavior or major screen responsibilities change
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `frontend/Gonep-patient`; `frontend/Gonep-provider`; `frontend/Gonep-rider`

## Principle
The frontend remains the source of truth for:

- user-facing terminology
- navigation semantics
- screen responsibilities
- interaction patterns
- visible role expectations
- the overall browser experience

## Portal Summary
- Patient portal: medication ordering, bookings, records, notifications, profile, and support flows
- Provider portal: clinical workflows, staffing, inventory, billing, POS, notifications, and provider operations
- Rider portal: delivery requests, active delivery, history, earnings, chat, notifications, and rider account flows

## Current Technical State
- All three active portals are backend-backed.
- Auth bootstrap is session-based and uses the backend as session truth.
- Portal UX should remain recognizable even when backend internals evolve.

## Change Rules
- Prefer adapting backend contracts or portal API layers over altering visible flows.
- Use frontend changes only for integration, correctness, resilience, or compatibility.
- Treat duplicate or legacy frontend trees as repo debt, not as the active UX authority.
