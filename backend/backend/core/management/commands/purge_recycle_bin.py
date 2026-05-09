"""
purge_recycle_bin — permanently remove soft-deleted appointments older than 90 days.

Run as a daily cron. Soft-deleted records (deleted_at IS NOT NULL) are kept
for the retention window so admins can restore them; after the window they
are hard-deleted to keep the DB lean.

Usage:
    python manage.py purge_recycle_bin
    python manage.py purge_recycle_bin --retention-days=90 --dry-run
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import PatientBooking, ProviderAppointment


DEFAULT_RETENTION_DAYS = 90


class Command(BaseCommand):
    help = "Hard-delete appointments soft-deleted more than N days ago (default 90)."

    def add_arguments(self, parser):
        parser.add_argument("--retention-days", type=int, default=DEFAULT_RETENTION_DAYS)
        parser.add_argument("--dry-run", action="store_true")

    @transaction.atomic
    def handle(self, *args, **options):
        days = max(1, int(options["retention_days"]))
        cutoff = timezone.now() - timedelta(days=days)
        dry = options["dry_run"]

        appt_qs = ProviderAppointment.objects.filter(deleted_at__lt=cutoff)
        bk_qs = PatientBooking.objects.filter(deleted_at__lt=cutoff)

        appt_count = appt_qs.count()
        bk_count = bk_qs.count()

        self.stdout.write(self.style.NOTICE(
            f"[purge_recycle_bin] cutoff={cutoff.isoformat()} "
            f"appointments={appt_count} bookings={bk_count} dry_run={dry}"
        ))

        if dry:
            return

        appt_qs.delete()
        bk_qs.delete()
        self.stdout.write(self.style.SUCCESS(
            f"Purged {appt_count} appointments + {bk_count} bookings."
        ))
