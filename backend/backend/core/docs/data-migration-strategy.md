# GonePharm Data Migration Strategy

Last updated: 2026-03-07

## Objective
Move from scaffold/demo records to production-safe data population with traceability and rollback checkpoints.

## Principles
- No destructive migration without backup.
- Migrate by module batches: Control -> Patient -> Provider -> Rider.
- Keep identifier preservation where possible (`*_ref`, `*_code`, `ticket_number`).
- Log every migration run to `AuditEvent`.

## Migration Steps
1. **Pre-flight**
2. Export current DB snapshot.
3. Run `python manage.py check` and ensure zero pending migrations.
4. Verify role groups via `python manage.py bootstrap_control_groups`.

1. **Reference Seeding**
2. Seed operational tags/status defaults.
3. Seed baseline protocols and template queues.

1. **Entity Backfill**
2. Control module entities (bookings/incidents/finance/compliance).
3. Patient entities and timeline links.
4. Provider entities and earnings links.
5. Rider entities and job/history links.

1. **Validation**
2. Validate FK integrity.
3. Validate role access matrix by group.
4. Validate workflow status vocabulary compliance.

1. **Cutover**
2. Freeze write operations during final import.
3. Run smoke tests in admin.
4. Tag release and archive migration logs.

## Rollback
- Restore DB snapshot.
- Re-run migrations to expected schema version.
- Re-apply controlled seed only.
