from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_support_ticket_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientpreference",
            name="lab_results_alerts",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientpreference",
            name="medication_refill_reminders",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientpreference",
            name="marketing_updates",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="patientpreference",
            name="privacy_mode",
            field=models.BooleanField(default=False),
        ),
    ]
