# FILE: backend/core/migrations/0004_merge_and_patient_fields.py
#
# This migration is a historical merge point.
#
# The repository contains earlier migrations that already add the following
# fields (and in some environments they may already exist in the database):
# - notification event_id fields + unique constraints
# - patient preference extended settings
# - patient profile lock flags
# - patient booking virtual meeting fields
#
# Re-applying those AddField operations in SQLite (test DB) raises errors like
# "duplicate column name". To keep migrations runnable in all environments,
# this migration is now a no-op that only ties the graph together.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        # Provider verification branch
        ("core", "0003_provider_verification"),
        # Notifications/patient fields branch
        ("core", "0005_patient_booking_locks_and_meeting"),
    ]

    operations = []
