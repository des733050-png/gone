from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count

from core.models import (
    ActionQueueItem,
    AuditEvent,
    CommandIncident,
    Complaint,
    ComplianceAudit,
    Facility,
    PatientFacilityAccess,
    ProviderMembership,
    RiderFacilityAccess,
)


class Command(BaseCommand):
    help = "Run facility-tenancy production readiness checks for tenancy, queues, and observability."

    def add_arguments(self, parser):
        parser.add_argument(
            "--strict",
            action="store_true",
            help="Fail with non-zero exit code if required checks are missing.",
        )

    def handle(self, *args, **options):
        strict = options["strict"]
        failures = []

        facility_count = Facility.objects.count()
        inactive_staff = ProviderMembership.objects.filter(is_active=False).count()
        patients_without_access = (
            PatientFacilityAccess.objects.values("patient_id")
            .annotate(total=Count("id"))
            .filter(total=0)
            .count()
        )
        riders_without_access = (
            RiderFacilityAccess.objects.values("rider_id")
            .annotate(total=Count("id"))
            .filter(total=0)
            .count()
        )

        if facility_count == 0:
            failures.append("No facilities exist.")

        open_critical_incidents = CommandIncident.objects.filter(
            severity="critical"
        ).exclude(status="completed").count()
        unresolved_complaints = Complaint.objects.exclude(sla_state="resolved").count()
        pending_audits = ComplianceAudit.objects.exclude(review_state="approved").count()
        queue_backlog = ActionQueueItem.objects.exclude(status="completed").count()

        finance_audit_actions = (
            AuditEvent.objects.filter(module="finance")
            .values("action")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

        self.stdout.write("=== GONEP Production Readiness Snapshot ===")
        self.stdout.write(f"Facilities: {facility_count}")
        self.stdout.write(f"Inactive staff memberships: {inactive_staff}")
        self.stdout.write(f"Patients without facility access rows: {patients_without_access}")
        self.stdout.write(f"Riders without facility access rows: {riders_without_access}")
        self.stdout.write(f"Open critical incidents: {open_critical_incidents}")
        self.stdout.write(f"Unresolved complaints: {unresolved_complaints}")
        self.stdout.write(f"Pending compliance audits: {pending_audits}")
        self.stdout.write(f"Action queue backlog: {queue_backlog}")
        self.stdout.write("Top finance audit actions:")
        if finance_audit_actions:
            for item in finance_audit_actions[:10]:
                self.stdout.write(f" - {item['action']}: {item['total']}")
        else:
            self.stdout.write(" - none")

        if failures:
            for failure in failures:
                self.stdout.write(self.style.ERROR(failure))
            if strict:
                raise CommandError("Production readiness check failed in strict mode.")
            self.stdout.write(self.style.WARNING("Readiness check completed with warnings."))
        else:
            self.stdout.write(self.style.SUCCESS("Readiness check passed."))
