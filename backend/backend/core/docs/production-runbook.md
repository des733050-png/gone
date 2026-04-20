# GONEP Production Runbook

Last updated: 2026-03-07

## Deployment Checklist
1. Set environment variables:
2. `DJANGO_DEBUG=False`
3. `DJANGO_ALLOWED_HOSTS=<domain list>`
4. `DJANGO_CSRF_TRUSTED_ORIGINS=https://<domains>`

1. Install dependencies and migrate:
2. `python -m pip install -r requirements.txt`
3. `python manage.py migrate`
4. `python manage.py collectstatic --noinput`
5. `python manage.py bootstrap_control_groups`

1. Verify admin health:
2. `/` redirects to `/admin/`.
3. `/admin/` loads and role-specific visibility is correct.
4. Core workflow actions create expected `AuditEvent` entries.

## Operational Monitoring
- Monitor failed login rates and admin errors.
- Monitor queue growth in `ActionQueueItem`.
- Monitor unresolved compliance backlog:
  - complaints with `sla_state != resolved`
  - audits with `review_state` pending/review/evidence.

## Incident Handling
1. Capture issue in `AuditEvent`/ticketing.
2. Identify impacted operational area and role.
3. Apply rollback or hotfix migration as needed.
4. Re-run smoke tests across affected module.

## Smoke Test Set
1. Superuser can access the full command centre.
2. Group-scoped user can access the intended operational surfaces.
3. CRUD create/change/delete works for command-centre entities.
4. Workflow actions run and update status.
5. Finance high-risk actions emit audit events.
