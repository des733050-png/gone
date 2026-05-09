"""
mark_overdue_appointments — auto-cancel rule.

Run on a 5-minute (or hourly) cron. Any appointment whose `scheduled_for`
is in the past AND status is still draft/idle/confirmed gets transitioned
to CANCELLED with `auto_cancelled_at = now`. The patient gets an in-app
notification explaining why and inviting them to reschedule.

Usage:
    python manage.py mark_overdue_appointments
    python manage.py mark_overdue_appointments --dry-run
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import (
    PatientBooking,
    PatientPortalNotification,
    ProviderAppointment,
    WorkflowStatus,
)


# Statuses that indicate the appointment never started — these are the only
# ones eligible for auto-cancel. IN_PROGRESS / COMPLETED / REJECTED / CANCELLED
# are explicitly skipped.
OVERDUE_TARGETS = {
    WorkflowStatus.DRAFT,
    WorkflowStatus.IDLE,
    WorkflowStatus.CONFIRMED,
}


def _next_notification_code():
    counter = PatientPortalNotification.objects.count() + 1
    while True:
        candidate = f"pn-{counter:04d}"
        if not PatientPortalNotification.objects.filter(notification_code=candidate).exists():
            return candidate
        counter += 1


class Command(BaseCommand):
    help = "Auto-cancel any appointment whose scheduled time has elapsed and was never started."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Print what would happen without writing.")

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options["dry_run"]
        now = timezone.now()

        # ── ProviderAppointment side ──
        appt_qs = ProviderAppointment.objects.filter(
            scheduled_for__lt=now,
            status__in=OVERDUE_TARGETS,
            deleted_at__isnull=True,
        )
        appt_count = appt_qs.count()

        # ── PatientBooking side ──
        bk_qs = PatientBooking.objects.filter(
            scheduled_for__lt=now,
            status__in=OVERDUE_TARGETS,
            deleted_at__isnull=True,
        )
        bk_count = bk_qs.count()

        self.stdout.write(self.style.NOTICE(
            f"[mark_overdue_appointments] now={now.isoformat()} "
            f"appointments={appt_count} bookings={bk_count} dry_run={dry}"
        ))

        if dry:
            return

        for appt in appt_qs.select_related("patient", "facility"):
            appt.status = WorkflowStatus.CANCELLED
            appt.auto_cancelled_at = now
            appt.notes = (appt.notes or "") + f"\nAUTO_CANCEL|at={now.isoformat()}|reason=overdue"
            appt.save(update_fields=["status", "auto_cancelled_at", "notes", "updated_at"])

        for bk in bk_qs.select_related("patient", "facility"):
            bk.status = WorkflowStatus.CANCELLED
            bk.auto_cancelled_at = now
            bk.notes = (bk.notes or "") + f"\nAUTO_CANCEL|at={now.isoformat()}|reason=overdue"
            bk.save(update_fields=["status", "auto_cancelled_at", "notes", "updated_at"])
            if bk.patient:
                PatientPortalNotification.objects.create(
                    notification_code=_next_notification_code(),
                    patient=bk.patient,
                    facility=bk.facility,
                    kind="appointment",
                    title="Appointment cancelled (overdue)",
                    body=(
                        f"Your appointment {bk.booking_ref} was automatically "
                        f"cancelled because the scheduled time elapsed. "
                        f"Please reschedule when convenient."
                    ),
                    icon_lib="feather",
                    icon_name="alert-circle",
                    read=False,
                )

        self.stdout.write(self.style.SUCCESS(
            f"Auto-cancelled {appt_count} appointments, {bk_count} bookings."
        ))
