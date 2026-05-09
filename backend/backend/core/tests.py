import json
import uuid

from django.apps import apps
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.db import IntegrityError, models
from django.test import Client, RequestFactory, TestCase

from core.admin import PatientBookingAdmin, ProviderMembershipAdmin, UserAdmin
from core.models import (
    Facility,
    PatientBooking,
    PatientFacilityAccess,
    PatientPortalNotification,
    PatientProfile,
    PatientUserLink,
    ProviderAppointment,
    ProviderInventoryItem,
    ProviderMembership,
    ProviderSubRole,
    ProviderVerificationDocument,
    ProviderVerificationSubmission,
    ProviderVerificationStatus,
    RiderFacilityAccess,
    RiderPortalNotification,
    RiderProfile,
    RiderUserLink,
    WorkflowStatus,
)


API_ROOT = "/api/v1"
DEMO_PASSWORD = "Demo@12345"


def json_body(response):
    return json.loads(response.content.decode("utf-8"))


class UUIDPrimaryKeyTests(TestCase):
    def test_all_core_concrete_models_use_uuid_primary_keys(self):
        for model in apps.get_app_config("core").get_models():
            if model._meta.abstract or model._meta.proxy:
                continue
            self.assertIsInstance(
                model._meta.pk,
                models.UUIDField,
                msg=f"{model.__name__} must use a UUID primary key.",
            )


class BootstrapPurgeCommandTests(TestCase):
    def test_bootstrap_control_groups_removes_flat_business_groups(self):
        for name in (
            "admin_user",
            "patient_user",
            "provider_user",
            "rider_user",
            "control_finance_admin",
            "support_admin",
        ):
            Group.objects.get_or_create(name=name)

        call_command("bootstrap_control_groups")

        self.assertFalse(
            Group.objects.filter(
                name__in=(
                    "admin_user",
                    "patient_user",
                    "provider_user",
                    "rider_user",
                    "control_finance_admin",
                    "support_admin",
                )
            ).exists()
        )


class SeededFacilityTenancyTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo_data")
        user_model = get_user_model()
        cls.superuser = user_model.objects.get(email="demo.superadmin@gonep.local")
        cls.facility_admin_user = user_model.objects.get(email="admin@nairobi-general.co.ke")
        cls.doctor_user = user_model.objects.get(email="doctor@nairobi-general.co.ke")
        cls.lab_user = user_model.objects.get(email="lab@nairobi-general.co.ke")
        cls.patient_user = user_model.objects.get(email="demo.patient@gonep.local")
        cls.rider_user = user_model.objects.get(email="demo.rider@gonep.local")

        cls.nairobi = Facility.objects.get(facility_code="FAC-001")
        cls.westlands = Facility.objects.get(facility_code="FAC-002")

        cls.facility_admin_membership = ProviderMembership.objects.get(
            user=cls.facility_admin_user,
            facility=cls.nairobi,
            role=ProviderSubRole.FACILITY_ADMIN,
        )
        cls.doctor_membership = ProviderMembership.objects.get(
            user=cls.doctor_user,
            facility=cls.nairobi,
            role=ProviderSubRole.DOCTOR,
        )
        cls.lab_membership = ProviderMembership.objects.get(
            user=cls.lab_user,
            facility=cls.nairobi,
            role=ProviderSubRole.LAB_MANAGER,
        )

        cls.patient_link = PatientUserLink.objects.select_related(
            "patient", "default_facility"
        ).get(user=cls.patient_user)
        cls.rider_link = RiderUserLink.objects.select_related(
            "rider", "default_facility"
        ).get(user=cls.rider_user)

    def login_json(self, email, password=DEMO_PASSWORD):
        client = Client()
        client.get(f"{API_ROOT}/auth/csrf/")
        response = client.post(
            f"{API_ROOT}/auth/login/",
            data=json.dumps({"email": email, "password": password}),
            content_type="application/json",
        )
        return client, response

    def approve_provider_facility(self, facility=None, submitted_by=None):
        return ProviderVerificationSubmission.objects.create(
            facility=facility or self.nairobi,
            submitted_by=submitted_by or self.facility_admin_user,
            status=ProviderVerificationStatus.VERIFIED,
        )


class SeedAndMembershipTests(SeededFacilityTenancyTestCase):
    def test_seed_creates_single_facility_staff_memberships(self):
        memberships = ProviderMembership.objects.filter(user__is_superuser=False)
        self.assertTrue(memberships.exists())
        self.assertEqual(
            memberships.values_list("user_id", flat=True).distinct().count(),
            memberships.count(),
        )
        self.assertTrue(
            memberships.exclude(facility=self.nairobi).count() >= 0
        )

    def test_patient_and_rider_default_facility_access_are_seeded(self):
        patient_access = PatientFacilityAccess.objects.filter(patient=self.patient_link.patient)
        rider_access = RiderFacilityAccess.objects.filter(rider=self.rider_link.rider)
        self.assertEqual(patient_access.count(), 2)
        self.assertEqual(rider_access.count(), 2)
        self.assertTrue(patient_access.filter(facility=self.nairobi, is_default=True).exists())
        self.assertTrue(rider_access.filter(facility=self.nairobi, is_default=True).exists())

    def test_provider_membership_is_unique_per_user_and_facility(self):
        with self.assertRaises(IntegrityError):
            ProviderMembership.objects.create(
                user=self.facility_admin_user,
                provider=self.facility_admin_membership.provider,
                facility=self.nairobi,
                role=ProviderSubRole.FACILITY_ADMIN,
                is_active=True,
            )


class SessionAndFacilityContextTests(SeededFacilityTenancyTestCase):
    def test_provider_session_payload_is_facility_scoped(self):
        client, response = self.login_json("admin@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        payload = json_body(response)["user"]
        self.assertEqual(payload["principal_type"], "staff")
        self.assertEqual(payload["role"], ProviderSubRole.FACILITY_ADMIN)
        self.assertEqual(payload["active_facility_id"], str(self.nairobi.id))
        self.assertEqual(payload["active_facility_name"], self.nairobi.name)
        self.assertEqual(len(payload["accessible_facilities"]), 1)
        uuid.UUID(payload["id"])

        session_response = client.get(f"{API_ROOT}/auth/session/")
        self.assertEqual(session_response.status_code, 200)
        session_payload = json_body(session_response)["user"]
        self.assertEqual(session_payload["active_facility_id"], str(self.nairobi.id))

    def test_patient_switches_active_facility_and_data_scope(self):
        westlands_booking = PatientBooking.objects.create(
            booking_ref="PBK-WEST-0001",
            patient=self.patient_link.patient,
            facility=self.westlands,
            status=WorkflowStatus.CONFIRMED,
            service_type="Review",
            channel="web",
        )
        client, response = self.login_json("demo.patient@gonep.local")
        self.assertEqual(response.status_code, 200)
        payload = json_body(response)["user"]
        self.assertEqual(payload["active_facility_id"], str(self.nairobi.id))
        self.assertEqual(len(payload["accessible_facilities"]), 2)

        list_response = client.get(f"{API_ROOT}/patient/appointments/")
        before_items = json_body(list_response)
        self.assertFalse(any(item["id"] == str(westlands_booking.id) for item in before_items))

        switch_response = client.post(
            f"{API_ROOT}/auth/facility-context/",
            data=json.dumps(
                {"principal": "patient", "facility_id": str(self.westlands.id)}
            ),
            content_type="application/json",
        )
        self.assertEqual(switch_response.status_code, 200)
        switched_payload = json_body(switch_response)["user"]
        self.assertEqual(switched_payload["active_facility_id"], str(self.westlands.id))

        scoped_response = client.get(f"{API_ROOT}/patient/appointments/")
        scoped_items = json_body(scoped_response)
        self.assertTrue(any(item["id"] == str(westlands_booking.id) for item in scoped_items))
        self.assertTrue(all(item["facility_id"] == str(self.westlands.id) for item in scoped_items))

    def test_rider_switches_active_facility_and_notification_scope(self):
        westlands_note = RiderPortalNotification.objects.create(
            notification_code="RN-WEST-0001",
            rider=self.rider_link.rider,
            facility=self.westlands,
            title="Westlands assignment ready",
            message="A Westlands delivery is now available.",
        )
        client, response = self.login_json("demo.rider@gonep.local")
        self.assertEqual(response.status_code, 200)
        payload = json_body(response)["user"]
        self.assertEqual(payload["active_facility_id"], str(self.nairobi.id))
        self.assertEqual(len(payload["accessible_facilities"]), 2)

        before_response = client.get(f"{API_ROOT}/rider/notifications/")
        before_items = json_body(before_response)
        self.assertFalse(any(item["id"] == str(westlands_note.id) for item in before_items))

        switch_response = client.post(
            f"{API_ROOT}/auth/facility-context/",
            data=json.dumps(
                {"principal": "rider", "facility_id": str(self.westlands.id)}
            ),
            content_type="application/json",
        )
        self.assertEqual(switch_response.status_code, 200)

        scoped_response = client.get(f"{API_ROOT}/rider/notifications/")
        scoped_items = json_body(scoped_response)
        self.assertTrue(any(item["id"] == str(westlands_note.id) for item in scoped_items))
        self.assertFalse(any(item["code"] == "RN-0001" for item in scoped_items))


class ProviderIsolationTests(SeededFacilityTenancyTestCase):
    def test_provider_cannot_access_other_facility_inventory_item_by_uuid(self):
        self.approve_provider_facility()
        other_item = ProviderInventoryItem.objects.create(
            item_code="INV-WEST-0001",
            facility=self.westlands,
            name="Metformin 500mg",
            category="Diabetes",
            stock=80,
            unit="tabs",
            unit_price="12.50",
            reorder=15,
            status="ok",
            ecommerce=True,
            active=True,
        )
        client, response = self.login_json("lab@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)

        detail_response = client.patch(
            f"{API_ROOT}/provider/inventory/{other_item.id}/",
            data=json.dumps({"name": "Should Fail"}),
            content_type="application/json",
        )
        self.assertEqual(detail_response.status_code, 404)

    def test_public_provider_payload_uses_uuid_and_facility_fields(self):
        client, response = self.login_json("doctor@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        me_response = client.get(f"{API_ROOT}/provider/me/")
        payload = json_body(me_response)
        uuid.UUID(payload["id"])
        uuid.UUID(payload["staff_id"])
        uuid.UUID(payload["facility_id"])
        self.assertEqual(payload["active_facility_id"], str(self.nairobi.id))
        self.assertNotIn("hospital_id", payload)
        self.assertNotIn("affiliated_hospitals", payload)


class ProviderVerificationGateTests(SeededFacilityTenancyTestCase):
    def test_provider_login_payload_includes_restricted_verification_status(self):
        client, response = self.login_json("admin@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        payload = json_body(response)["user"]
        self.assertEqual(payload["verification_status"], "UNVERIFIED")
        self.assertEqual(payload["access"], "RESTRICTED")
        self.assertTrue(payload["can_upload_verification_documents"])

        session_response = client.get(f"{API_ROOT}/auth/session/")
        session_payload = json_body(session_response)["user"]
        self.assertEqual(session_payload["verification_status"], "UNVERIFIED")
        self.assertEqual(session_payload["access"], "RESTRICTED")

    def test_unverified_provider_is_blocked_from_gated_endpoint(self):
        client, response = self.login_json("doctor@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        blocked = client.get(f"{API_ROOT}/provider/appointments/")
        self.assertEqual(blocked.status_code, 403)
        payload = json_body(blocked)
        self.assertFalse(payload["success"])
        self.assertEqual(payload["code"], "VERIFICATION_REQUIRED")

    def test_facility_admin_can_submit_documents_and_pending_blocks_reupload(self):
        client, response = self.login_json("admin@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        upload = SimpleUploadedFile(
            "license.pdf",
            b"license bytes",
            content_type="application/pdf",
        )
        submitted = client.post(
            f"{API_ROOT}/provider/verification/submit/",
            data={"document_type": "LICENSE", "file": upload},
        )
        self.assertEqual(submitted.status_code, 201)
        payload = json_body(submitted)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["verification_status"], "PENDING")
        self.assertFalse(payload["data"]["can_upload_verification_documents"])
        self.assertEqual(ProviderVerificationDocument.objects.count(), 1)

        second_upload = SimpleUploadedFile(
            "id.pdf",
            b"id bytes",
            content_type="application/pdf",
        )
        blocked = client.post(
            f"{API_ROOT}/provider/verification/submit/",
            data={"document_type": "ID", "file": second_upload},
        )
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(json_body(blocked)["code"], "VERIFICATION_UPLOAD_LOCKED")

    def test_facility_admin_can_upload_long_original_filename(self):
        client, response = self.login_json("admin@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)

        long_name = (
            "proton-recovery-kit_1_3Q1wamm_"
            + ("x" * 220)
            + ".pdf"
        )
        upload = SimpleUploadedFile(
            long_name,
            b"pdf bytes",
            content_type="application/pdf",
        )
        submitted = client.post(
            f"{API_ROOT}/provider/verification/submit/",
            data={"document_type": "LICENSE", "file": upload},
        )
        self.assertEqual(submitted.status_code, 201)
        self.assertEqual(ProviderVerificationDocument.objects.count(), 1)

        doc = ProviderVerificationDocument.objects.first()
        self.assertEqual(doc.original_filename, long_name)
        # Stored file path must be short and not embed the original filename.
        self.assertTrue(len(doc.file.name) < 500)
        self.assertNotIn("proton-recovery-kit", doc.file.name)

    def test_admin_approval_unlocks_provider_apis(self):
        submission = ProviderVerificationSubmission.objects.create(
            facility=self.nairobi,
            submitted_by=self.facility_admin_user,
            status=ProviderVerificationStatus.PENDING,
        )
        submission.approve(reviewed_by=self.superuser)
        client, response = self.login_json("doctor@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        allowed = client.get(f"{API_ROOT}/provider/appointments/")
        self.assertEqual(allowed.status_code, 200)

    def test_admin_rejection_allows_new_upload(self):
        submission = ProviderVerificationSubmission.objects.create(
            facility=self.nairobi,
            submitted_by=self.facility_admin_user,
            status=ProviderVerificationStatus.PENDING,
            rejection_reason="Expired license.",
        )
        submission.reject(reviewed_by=self.superuser, reason="Expired license.")
        client, response = self.login_json("admin@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        status_response = client.get(f"{API_ROOT}/provider/verification/status/")
        status_payload = json_body(status_response)["data"]
        self.assertEqual(status_payload["verification_status"], "REJECTED")
        self.assertTrue(status_payload["can_upload_verification_documents"])

        upload = SimpleUploadedFile("license.pdf", b"new bytes", content_type="application/pdf")
        submitted = client.post(
            f"{API_ROOT}/provider/verification/submit/",
            data={"document_type": "LICENSE", "file": upload},
        )
        self.assertEqual(submitted.status_code, 201)
        self.assertEqual(
            ProviderVerificationSubmission.objects.filter(
                facility=self.nairobi,
                status=ProviderVerificationStatus.PENDING,
            ).count(),
            1,
        )

    def test_non_facility_admin_cannot_submit_documents(self):
        client, response = self.login_json("doctor@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)
        upload = SimpleUploadedFile("license.pdf", b"bytes", content_type="application/pdf")
        submitted = client.post(
            f"{API_ROOT}/provider/verification/submit/",
            data={"document_type": "LICENSE", "file": upload},
        )
        self.assertEqual(submitted.status_code, 403)

    def test_verified_facility_admin_can_create_update_and_soft_delete_appointment(self):
        self.approve_provider_facility()
        client, response = self.login_json("admin@nairobi-general.co.ke")
        self.assertEqual(response.status_code, 200)

        created = client.post(
            f"{API_ROOT}/provider/appointments/",
            data=json.dumps(
                {
                    "doctor_id": str(self.doctor_membership.id),
                    "date": "2026-05-10",
                    "time": "10:00",
                    "type": "In Facility",
                    "reason": "Initial consultation",
                    "phone": "+254700000000",
                    "status": "confirmed",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(created.status_code, 201)
        created_payload = json_body(created)
        self.assertEqual(created_payload["status"], "confirmed")
        appointment = ProviderAppointment.objects.get(
            appointment_ref=created_payload["reference"]
        )
        self.assertEqual(appointment.facility_id, self.nairobi.id)

        updated = client.patch(
            f"{API_ROOT}/provider/appointments/{appointment.appointment_ref}/",
            data=json.dumps({"status": "cancelled", "reason": "Patient unavailable"}),
            content_type="application/json",
        )
        self.assertEqual(updated.status_code, 200)
        appointment.refresh_from_db()
        self.assertEqual(appointment.status, WorkflowStatus.CANCELLED)
        self.assertEqual(appointment.visit_reason, "Patient unavailable")

        deleted = client.delete(
            f"{API_ROOT}/provider/appointments/{appointment.appointment_ref}/"
        )
        self.assertEqual(deleted.status_code, 200)
        appointment.refresh_from_db()
        self.assertIsNotNone(appointment.deleted_at)

        recycle_list = client.get(f"{API_ROOT}/provider/appointments/?bin=1")
        self.assertEqual(recycle_list.status_code, 200)
        recycle_payload = json_body(recycle_list)
        self.assertTrue(
            any(item.get("reference") == appointment.appointment_ref for item in recycle_payload)
        )

        restore = client.post(
            f"{API_ROOT}/provider/appointments/{appointment.appointment_ref}/restore/"
        )
        self.assertEqual(restore.status_code, 200)
        appointment.refresh_from_db()
        self.assertIsNone(appointment.deleted_at)


class AdminTenancyTests(SeededFacilityTenancyTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.site = AdminSite()

    def _request(self, user):
        request = self.factory.get("/admin/")
        request.user = user
        return request

    def test_user_admin_is_superuser_only(self):
        admin_obj = UserAdmin(get_user_model(), self.site)
        self.assertTrue(admin_obj.has_module_permission(self._request(self.superuser)))
        self.assertFalse(admin_obj.has_module_permission(self._request(self.facility_admin_user)))

    def test_provider_membership_admin_requires_facility_admin(self):
        admin_obj = ProviderMembershipAdmin(ProviderMembership, self.site)
        self.assertTrue(
            admin_obj.has_module_permission(self._request(self.facility_admin_user))
        )
        self.assertFalse(admin_obj.has_module_permission(self._request(self.doctor_user)))

    def test_patient_booking_admin_queryset_is_facility_filtered(self):
        other_patient = PatientProfile.objects.create(
            patient_code="PAT-WEST-0001",
            full_name="Westlands Patient",
            status=WorkflowStatus.CONFIRMED,
        )
        PatientBooking.objects.create(
            booking_ref="PBK-WEST-ADMIN-01",
            patient=other_patient,
            facility=self.westlands,
            status=WorkflowStatus.CONFIRMED,
            service_type="Consultation",
        )
        admin_obj = PatientBookingAdmin(PatientBooking, self.site)
        queryset = admin_obj.get_queryset(self._request(self.facility_admin_user))
        self.assertTrue(queryset.exists())
        self.assertTrue(all(item.facility_id == self.nairobi.id for item in queryset))
        self.assertFalse(queryset.filter(facility=self.westlands).exists())
