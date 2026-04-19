# GONEP Release Freeze Checklist

Last updated: 2026-03-07

## Pre-Freeze (T-2 to T-1 days)
1. Confirm all migrations are committed and applied in staging.
2. Run:
   - `python manage.py check`
   - `python manage.py test core`
   - `python manage.py production_readiness_check --strict`
3. Confirm role groups exist and permissions are synced:
   - `python manage.py bootstrap_control_groups`
4. Verify internal admin access:
   - `/` redirects to `/admin/`
   - `/admin/`

## Freeze Window (T day)
1. Block schema changes unless P0 fix.
2. Allow only:
   - hotfixes with rollback note
   - documentation corrections
3. Verify high-risk finance actions produce `AuditEvent` entries:
   - payout approve/reject/paid
   - export and reconcile actions

## Post-Deploy Verification
1. Run smoke pass for each operating area:
   - command centre access
   - patient operations
   - provider operations
   - rider operations
2. Validate role-scoped access with at least one non-superuser account per module group.
3. Check backlog pressure:
   - unresolved complaints
   - pending audits
   - action queue pending count

## Exit Criteria
1. No critical migration/runtime errors.
2. Role-scoped admin views and actions work as expected.
3. Observability/audit coverage present for high-risk paths.
4. Freeze signoff recorded in release notes.
