# GonePharm Observability Guide

Last updated: 2026-03-07

## Core Signals
1. **Audit Events**
2. Capture high-risk admin actions (finance + bulk workflow actions).
3. Query trend:
   - `AuditEvent` grouped by `module` and `action`.

1. **Queue Backlog**
2. `ActionQueueItem` with `status != completed`.
3. Track backlog by module (`ops`, `compliance`, `commerce`, `finance`, `patient`, `provider`, `rider`).

1. **Compliance Pressure**
2. `Complaint` where `sla_state != resolved`.
3. `ComplianceAudit` where `review_state != approved`.

1. **Operational Risk**
2. `CommandIncident` where `severity = critical` and `status != completed`.

## Suggested Dashboard Panels
1. Open critical incidents.
2. Unresolved complaints.
3. Pending compliance audits.
4. Action queue backlog by module.
5. Top finance audit actions in last 24h.

## Recommended Daily Commands
1. `python manage.py production_readiness_check`
2. `python manage.py bootstrap_control_groups`
3. `python manage.py check`

## Audit Validation Spot-Checks
1. Run payout approve/reject/paid from admin.
2. Verify corresponding `AuditEvent` rows exist with:
   - `module=finance`
   - `action` in `approve_payout`, `reject_payout`, `mark_payout_paid`

## Escalation Rule
Escalate to release owner if any condition is true:
1. Open critical incidents > 0 for 24h.
2. Queue backlog grows for 3 consecutive checks.
3. Finance audit events missing after payout actions.
