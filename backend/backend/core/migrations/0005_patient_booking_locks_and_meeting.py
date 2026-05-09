from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_merge_0003_notification_event_id_0003_patientpreference_more_settings"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprofile",
            name="dob_locked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="patientprofile",
            name="name_locked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="patientbooking",
            name="daily_room_url",
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name="patientbooking",
            name="service_type_detail",
            field=models.CharField(
                blank=True,
                max_length=20,
                help_text="Virtual, Home Visit, or In Facility",
            ),
        ),
    ]
