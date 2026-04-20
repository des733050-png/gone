from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


DEPRECATED_GROUPS = (
    "admin_user",
    "patient_user",
    "provider_user",
    "rider_user",
    "control_ops_admin",
    "control_finance_admin",
    "control_compliance_admin",
    "support_admin",
    "patient_ops_admin",
    "provider_ops_admin",
    "rider_ops_admin",
)


class Command(BaseCommand):
    help = "Remove deprecated flat business-role groups after the facility-tenancy reset."

    def handle(self, *args, **options):
        removed = 0
        for name in DEPRECATED_GROUPS:
            deleted, _ = Group.objects.filter(name=name).delete()
            if deleted:
                removed += 1
                self.stdout.write(f"Removed deprecated group: {name}")
        self.stdout.write(
            self.style.SUCCESS(
                f"Deprecated business-group cleanup complete. Groups removed: {removed}."
            )
        )
