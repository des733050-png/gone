from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="provideractivitylog",
            name="role",
            field=models.CharField(
                blank=True,
                choices=[
                    ("facility_admin", "Facility Admin"),
                    ("doctor", "Doctor"),
                    ("billing_manager", "Billing Manager"),
                    ("lab_manager", "Lab Manager"),
                    ("receptionist", "Receptionist"),
                    ("pos", "POS"),
                ],
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="providersupportticket",
            name="category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("Bug", "Bug"),
                    ("Feature Request", "Feature Request"),
                    ("Access", "Access"),
                    ("Performance", "Performance"),
                    ("Data Issue", "Data Issue"),
                    ("Other", "Other"),
                ],
                default="Other",
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="providersupportticket",
            name="priority",
            field=models.CharField(
                choices=[
                    ("low", "Low"),
                    ("medium", "Medium"),
                    ("high", "High"),
                    ("critical", "Critical"),
                ],
                default="medium",
                max_length=16,
            ),
        ),
        migrations.AlterField(
            model_name="providersupportticket",
            name="raised_by_role",
            field=models.CharField(
                choices=[
                    ("facility_admin", "Facility Admin"),
                    ("doctor", "Doctor"),
                    ("billing_manager", "Billing Manager"),
                    ("lab_manager", "Lab Manager"),
                    ("receptionist", "Receptionist"),
                    ("pos", "POS"),
                ],
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="providersupportticket",
            name="status",
            field=models.CharField(
                choices=[
                    ("open", "Open"),
                    ("in_progress", "In progress"),
                    ("resolved", "Resolved"),
                    ("closed", "Closed"),
                ],
                default="open",
                max_length=24,
            ),
        ),
    ]
