from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_support_ticket_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientportalnotification",
            name="event_id",
            field=models.CharField(blank=True, db_index=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="providerportalnotification",
            name="event_id",
            field=models.CharField(blank=True, db_index=True, max_length=120, null=True),
        ),
        migrations.AddField(
            model_name="riderportalnotification",
            name="event_id",
            field=models.CharField(blank=True, db_index=True, max_length=120, null=True),
        ),
        migrations.AlterUniqueTogether(
            name="patientportalnotification",
            unique_together={("patient", "facility", "event_id")},
        ),
        migrations.AlterUniqueTogether(
            name="providerportalnotification",
            unique_together={("user", "facility", "event_id")},
        ),
        migrations.AlterUniqueTogether(
            name="riderportalnotification",
            unique_together={("rider", "facility", "event_id")},
        ),
    ]
