# Generated 2026-05-18 — Specialization master list + SpecializationRequest

import django.db.models.deletion
import uuid

from django.conf import settings
from django.db import migrations, models
from django.utils.text import slugify


# ── Seed data: 30 common Kenyan healthcare specializations ────────────────────
SEED_SPECIALIZATIONS = [
    ("Anaesthesiology",          ""),
    ("Cardiology",               ""),
    ("Critical Care / ICU",      ""),
    ("Dentistry",                ""),
    ("Dermatology",              ""),
    ("Emergency Medicine",       ""),
    ("Endocrinology",            ""),
    ("ENT (Ear, Nose & Throat)", ""),
    ("Family Medicine",          ""),
    ("Gastroenterology",         ""),
    ("General Medicine",         ""),
    ("General Surgery",          ""),
    ("Gynaecology & Obstetrics", ""),
    ("Internal Medicine",        ""),
    ("Laboratory Medicine",      ""),
    ("Nephrology",               ""),
    ("Neurology",                ""),
    ("Nutrition & Dietetics",    ""),
    ("Occupational Health",      ""),
    ("Oncology",                 ""),
    ("Ophthalmology",            ""),
    ("Orthopaedics",             ""),
    ("Paediatrics",              ""),
    ("Pathology",                ""),
    ("Pharmacy",                 ""),
    ("Physiotherapy",            ""),
    ("Psychiatry",               ""),
    ("Pulmonology",              ""),
    ("Radiology",                ""),
    ("Urology",                  ""),
]


def seed_specializations(apps, schema_editor):
    """Create the master specialization catalogue from the seed list."""
    Specialization = apps.get_model("core", "Specialization")
    for name, description in SEED_SPECIALIZATIONS:
        Specialization.objects.get_or_create(
            name=name,
            defaults={
                "slug": slugify(name),
                "description": description,
                "is_active": True,
            },
        )


def backfill_facility_specialty_fk(apps, schema_editor):
    """
    For every existing FacilitySpecialty row, try to find a matching
    Specialization (case-insensitive) and link it.  Rows with no match
    are left with specialization=NULL so nothing breaks; admins can
    clean them up later via the Django admin.
    """
    FacilitySpecialty = apps.get_model("core", "FacilitySpecialty")
    Specialization    = apps.get_model("core", "Specialization")

    for fs in FacilitySpecialty.objects.all():
        spec = Specialization.objects.filter(name__iexact=fs.name.strip()).first()
        if spec:
            fs.specialization_id = spec.pk
            fs.save(update_fields=["specialization_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0016_patientbooking_auto_cancelled_at_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── 1. Create Specialization ────────────────────────────────────────
        migrations.CreateModel(
            name="Specialization",
            fields=[
                ("id",          models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
                ("updated_at",  models.DateTimeField(auto_now=True)),
                ("name",        models.CharField(max_length=120, unique=True)),
                ("slug",        models.SlugField(max_length=140, unique=True, blank=True)),
                ("description", models.TextField(blank=True)),
                ("is_active",   models.BooleanField(default=True, db_index=True)),
            ],
            options={"ordering": ["name"]},
        ),

        # ── 2. Create SpecializationRequest ─────────────────────────────────
        migrations.CreateModel(
            name="SpecializationRequest",
            fields=[
                ("id",          models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ("created_at",  models.DateTimeField(auto_now_add=True)),
                ("updated_at",  models.DateTimeField(auto_now=True)),
                ("name",        models.CharField(max_length=120)),
                ("reason",      models.TextField(blank=True)),
                ("status",      models.CharField(
                    max_length=20,
                    choices=[("pending","Pending"),("approved","Approved"),("rejected","Rejected")],
                    default="pending",
                    db_index=True,
                )),
                ("review_note", models.TextField(blank=True)),
                ("facility", models.ForeignKey(
                    to="core.Facility",
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="specialization_requests",
                )),
                ("requested_by", models.ForeignKey(
                    to=settings.AUTH_USER_MODEL,
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True,
                    related_name="+",
                )),
                ("reviewed_by", models.ForeignKey(
                    to=settings.AUTH_USER_MODEL,
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True, blank=True,
                    related_name="+",
                )),
                ("specialization", models.ForeignKey(
                    to="core.Specialization",
                    on_delete=django.db.models.deletion.SET_NULL,
                    null=True, blank=True,
                    related_name="requests",
                )),
            ],
            options={"ordering": ["-created_at"]},
        ),

        # ── 3. Add specialization FK to FacilitySpecialty ───────────────────
        migrations.AddField(
            model_name="facilityspecialty",
            name="specialization",
            field=models.ForeignKey(
                to="core.Specialization",
                on_delete=django.db.models.deletion.SET_NULL,
                null=True, blank=True,
                related_name="facility_specialties",
            ),
        ),

        # ── 4. Seed the master catalogue ────────────────────────────────────
        migrations.RunPython(seed_specializations, migrations.RunPython.noop),

        # ── 5. Back-fill FK on existing FacilitySpecialty rows ──────────────
        migrations.RunPython(backfill_facility_specialty_fk, migrations.RunPython.noop),
    ]
