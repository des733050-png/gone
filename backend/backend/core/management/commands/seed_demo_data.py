from datetime import timedelta
from decimal import Decimal

from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

from core import models


DEMO_PASSWORD = "Demo@12345"
SUPERADMIN_PASSWORD = "password@123"


class Command(BaseCommand):
    help = "Seed facility-first demo data for the GONEP platform."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEMO_PASSWORD,
            help="Password used for demo users (default: Demo@12345).",
        )
        parser.add_argument(
            "--superadmin-password",
            default=SUPERADMIN_PASSWORD,
            help="Password used for the demo superuser (default: password@123).",
        )

    def handle(self, *args, **options):
        password = options["password"]
        superadmin_password = options["superadmin_password"]
        call_command("bootstrap_control_groups")
        self._reset_core_data()

        now = timezone.now()
        user_model = get_user_model()

        facilities = self._seed_facilities()
        users = self._seed_users(user_model, password, superadmin_password)
        memberships = self._seed_staff(users, facilities)
        patient_link = self._seed_patient(users, facilities, now)
        rider_link = self._seed_rider(users, facilities, now)

        self._seed_patient_operations(patient_link, rider_link, memberships, facilities, now)
        self._seed_provider_operations(patient_link, memberships, facilities, now)
        self._seed_rider_operations(rider_link, facilities, now)
        self._seed_finance_and_internal(facilities["nairobi"], users["superadmin"], now)

        self.stdout.write(self.style.SUCCESS("Facility-tenancy demo data seeded."))

    def _reset_core_data(self):
        app_models = list(apps.get_app_config("core").get_models())
        for model in reversed(app_models):
            model.objects.all().delete()

    def _upsert_user(self, user_model, *, username, email, password, is_staff, is_superuser, first_name, last_name):
        user, created = user_model.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "is_staff": is_staff,
                "is_superuser": is_superuser,
                "is_active": True,
            },
        )
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.is_staff = is_staff
        user.is_superuser = is_superuser
        user.is_active = True
        user.set_password(password)
        user.save()
        return user

    def _next_code(self, model_class, field_name, prefix, padding=4):
        counter = model_class.objects.count() + 1
        while True:
            candidate = f"{prefix}{counter:0{padding}d}"
            if not model_class.objects.filter(**{field_name: candidate}).exists():
                return candidate
            counter += 1

    def _seed_facilities(self):
        nairobi = models.Facility.objects.create(
            facility_code="FAC-001",
            name="Nairobi General Hospital",
            email="contact@nairobi-general.co.ke",
            phone="+254700000001",
            location="Nairobi",
            registration_no="REG-NRB-001",
            status=models.FacilityStatus.APPROVED,
        )
        westlands = models.Facility.objects.create(
            facility_code="FAC-002",
            name="Westlands Medical Centre",
            email="info@westlands-medical.co.ke",
            phone="+254700000002",
            location="Westlands",
            registration_no="REG-WST-002",
            status=models.FacilityStatus.APPROVED,
        )
        return {"nairobi": nairobi, "westlands": westlands}

    def _seed_users(self, user_model, password, superadmin_password):
        return {
            "superadmin": self._upsert_user(
                user_model,
                username="demo_superadmin",
                email="demo.superadmin@gonep.local",
                password=superadmin_password,
                is_staff=True,
                is_superuser=True,
                first_name="System",
                last_name="Admin",
            ),
            "facility_admin": self._upsert_user(
                user_model,
                username="facility_admin_nairobi",
                email="admin@nairobi-general.co.ke",
                password=password,
                is_staff=True,
                is_superuser=False,
                first_name="Grace",
                last_name="Muthoni",
            ),
            "doctor": self._upsert_user(
                user_model,
                username="doctor_nairobi",
                email="doctor@nairobi-general.co.ke",
                password=password,
                is_staff=True,
                is_superuser=False,
                first_name="Amina",
                last_name="Wanjiku",
            ),
            "billing": self._upsert_user(
                user_model,
                username="billing_nairobi",
                email="billing@nairobi-general.co.ke",
                password=password,
                is_staff=True,
                is_superuser=False,
                first_name="Samuel",
                last_name="Otieno",
            ),
            "lab": self._upsert_user(
                user_model,
                username="lab_nairobi",
                email="lab@nairobi-general.co.ke",
                password=password,
                is_staff=True,
                is_superuser=False,
                first_name="Priya",
                last_name="Sharma",
            ),
            "reception": self._upsert_user(
                user_model,
                username="reception_nairobi",
                email="reception@nairobi-general.co.ke",
                password=password,
                is_staff=True,
                is_superuser=False,
                first_name="Janet",
                last_name="Auma",
            ),
            "pos": self._upsert_user(
                user_model,
                username="pos_nairobi",
                email="pos1@nairobi-general.co.ke",
                password=password,
                is_staff=True,
                is_superuser=False,
                first_name="Main",
                last_name="Reception",
            ),
            "patient": self._upsert_user(
                user_model,
                username="demo_patient",
                email="demo.patient@gonep.local",
                password=password,
                is_staff=False,
                is_superuser=False,
                first_name="Faith",
                last_name="Njoroge",
            ),
            "rider": self._upsert_user(
                user_model,
                username="demo_rider",
                email="demo.rider@gonep.local",
                password=password,
                is_staff=False,
                is_superuser=False,
                first_name="Kevin",
                last_name="Mwangi",
            ),
        }

    def _provider_profile(self, facility, user, *, specialty="", license_number="", phone=""):
        return models.ProviderProfile.objects.create(
            provider_code=self._next_code(models.ProviderProfile, "provider_code", "PRV-", 4),
            facility=facility,
            full_name=user.get_full_name().strip() or user.email,
            specialty=specialty,
            status=models.WorkflowStatus.CONFIRMED,
            phone=phone,
            email=user.email,
            license_number=license_number,
            years_experience=4,
        )

    def _seed_staff(self, users, facilities):
        facility = facilities["nairobi"]
        membership_map = {}

        profiles = {
            "facility_admin": self._provider_profile(facility, users["facility_admin"], phone="+254711111111"),
            "doctor": self._provider_profile(
                facility,
                users["doctor"],
                specialty="General Practice",
                license_number="KMPDC-1001",
                phone="+254722222222",
            ),
            "billing": self._provider_profile(facility, users["billing"], phone="+254733333333"),
            "lab": self._provider_profile(facility, users["lab"], specialty="Laboratory", phone="+254744444444"),
            "reception": self._provider_profile(facility, users["reception"], phone="+254755555555"),
        }

        role_map = {
            "facility_admin": models.ProviderSubRole.FACILITY_ADMIN,
            "doctor": models.ProviderSubRole.DOCTOR,
            "billing": models.ProviderSubRole.BILLING_MANAGER,
            "lab": models.ProviderSubRole.LAB_MANAGER,
            "reception": models.ProviderSubRole.RECEPTIONIST,
            "pos": models.ProviderSubRole.POS,
        }

        for key, role in role_map.items():
            membership_map[key] = models.ProviderMembership.objects.create(
                user=users[key],
                provider=profiles.get(key),
                facility=facility,
                role=role,
                is_active=True,
            )
        return membership_map

    def _seed_patient(self, users, facilities, now):
        patient = models.PatientProfile.objects.create(
            patient_code="PAT-0001",
            full_name=users["patient"].get_full_name().strip(),
            status=models.WorkflowStatus.CONFIRMED,
            phone="+254766666666",
            email=users["patient"].email,
            date_of_birth=timezone.datetime(1992, 6, 10).date(),
            gender="Female",
            blood_group="O+",
            address="Kilimani, Nairobi",
            preferred_language="en",
            conditions=["Hypertension"],
            allergies=["Penicillin"],
        )
        link = models.PatientUserLink.objects.create(
            user=users["patient"],
            patient=patient,
            default_facility=facilities["nairobi"],
            is_active=True,
        )
        models.PatientFacilityAccess.objects.create(
            patient=patient,
            facility=facilities["nairobi"],
            is_default=True,
            is_active=True,
        )
        models.PatientFacilityAccess.objects.create(
            patient=patient,
            facility=facilities["westlands"],
            is_default=False,
            is_active=True,
        )
        for facility in facilities.values():
            models.PatientPreference.objects.create(
                patient=patient,
                facility=facility,
                appointment_reminders=True,
                order_updates=True,
                lab_results_alerts=True,
                medication_refill_reminders=True,
                marketing_updates=False,
                privacy_mode=False,
            )
        return link

    def _seed_rider(self, users, facilities, now):
        rider = models.RiderProfile.objects.create(
            rider_code="RDR-0001",
            full_name=users["rider"].get_full_name().strip(),
            status=models.WorkflowStatus.CONFIRMED,
            vehicle_type="Motorbike",
            vehicle_registration="KMC 234X",
            zone="Nairobi Central",
            phone="+254777777777",
            rating=Decimal("4.8"),
            total_trips=12,
            bank_details="KCB ****2044",
            is_online=True,
        )
        link = models.RiderUserLink.objects.create(
            user=users["rider"],
            rider=rider,
            default_facility=facilities["nairobi"],
            is_active=True,
        )
        models.RiderFacilityAccess.objects.create(
            rider=rider,
            facility=facilities["nairobi"],
            is_default=True,
            is_active=True,
        )
        models.RiderFacilityAccess.objects.create(
            rider=rider,
            facility=facilities["westlands"],
            is_default=False,
            is_active=True,
        )
        for facility in facilities.values():
            models.RiderPreference.objects.create(
                rider=rider,
                facility=facility,
                push_notifications=True,
                sound_alerts=True,
                location_share=True,
                auto_accept=False,
            )
        return link

    def _seed_patient_operations(self, patient_link, rider_link, memberships, facilities, now):
        patient = patient_link.patient
        facility = facilities["nairobi"]
        doctor = memberships["doctor"].provider
        # Appointments: upcoming, pending confirmation, in progress, past, cancelled
        appointments = [
            {
                "ref": "PBK-0001",
                "status": models.WorkflowStatus.CONFIRMED,
                "scheduled_for": now + timedelta(days=2),
                "notes": "Upcoming review in 2 days.",
            },
            {
                "ref": "PBK-0002",
                "status": models.WorkflowStatus.CONFIRMED,
                "scheduled_for": now + timedelta(days=5),
                "notes": "Upcoming monthly blood pressure check.",
            },
            {
                "ref": "PBK-0003",
                "status": models.WorkflowStatus.DRAFT,
                "scheduled_for": now + timedelta(days=3),
                "notes": "Pending confirmation appointment.",
            },
            {
                "ref": "PBK-0004",
                "status": models.WorkflowStatus.CONFIRMED,
                "scheduled_for": now - timedelta(minutes=10),
                "notes": "Current appointment that should read as in progress.",
            },
            {
                "ref": "PBK-0005",
                "status": models.WorkflowStatus.COMPLETED,
                "scheduled_for": now - timedelta(days=3),
                "notes": "Completed follow-up visit.",
            },
            {
                "ref": "PBK-0006",
                "status": models.WorkflowStatus.CANCELLED,
                "scheduled_for": now + timedelta(days=4),
                "notes": "CANCEL_META|by=Faith Njoroge|reason=Travel conflict",
            },
            {
                "ref": "PBK-0007",
                "status": models.WorkflowStatus.COMPLETED,
                "scheduled_for": now - timedelta(days=8),
                "notes": "Past appointment #2.",
            },
        ]
        booking_rows = []
        for item in appointments:
            booking_rows.append(
                models.PatientBooking.objects.create(
                    booking_ref=item["ref"],
                    patient=patient,
                    facility=facility,
                    status=item["status"],
                    service_type="Consultation",
                    channel="web",
                    provider_name=doctor.full_name,
                    provider_specialty=doctor.specialty,
                    location_details="Outpatient Wing",
                    fee_amount=Decimal("2500.00"),
                    scheduled_for=item["scheduled_for"],
                    notes=item["notes"],
                )
            )

        consultation = models.PatientConsultation.objects.create(
            consultation_ref="CON-0001",
            patient=patient,
            facility=facility,
            booking=booking_rows[4],
            status=models.WorkflowStatus.IN_PROGRESS,
            provider_name=doctor.full_name,
            assessment="Stable blood pressure.",
            plan="Continue monitoring and reduce sodium intake.",
            consulted_at=now - timedelta(days=1),
        )
        consultation_two = models.PatientConsultation.objects.create(
            consultation_ref="CON-0002",
            patient=patient,
            facility=facility,
            booking=booking_rows[6],
            status=models.WorkflowStatus.COMPLETED,
            provider_name=doctor.full_name,
            assessment="Improving medication adherence.",
            plan="Continue same medication for 30 days.",
            consulted_at=now - timedelta(days=7),
        )
        prescription = models.PatientPrescription.objects.create(
            rx_number="RX-0001",
            patient=patient,
            facility=facility,
            consultation=consultation,
            status=models.WorkflowStatus.CONFIRMED,
            medication_name="Amlodipine 5mg",
            dosage="Once daily",
            instructions="Take after breakfast.",
            issued_at=now - timedelta(days=1),
        )
        prescription_two = models.PatientPrescription.objects.create(
            rx_number="RX-0002",
            patient=patient,
            facility=facility,
            consultation=consultation_two,
            status=models.WorkflowStatus.CONFIRMED,
            medication_name="Losartan 50mg",
            dosage="Once daily",
            instructions="Take in the evening.",
            issued_at=now - timedelta(days=6),
        )
        diagnostic = models.PatientDiagnosticOrder.objects.create(
            order_number="LAB-0001",
            patient=patient,
            facility=facility,
            consultation=consultation,
            status=models.WorkflowStatus.CONFIRMED,
            test_type="HbA1c",
            result_summary="6.8%",
            result_at=now - timedelta(hours=12),
        )
        diagnostic_two = models.PatientDiagnosticOrder.objects.create(
            order_number="LAB-0002",
            patient=patient,
            facility=facility,
            consultation=consultation_two,
            status=models.WorkflowStatus.CONFIRMED,
            test_type="Lipid Profile",
            result_summary="LDL moderately elevated.",
            result_at=now - timedelta(days=5),
        )

        record_events = [
            ("consultation", "Consultation review", "PatientConsultation", consultation.consultation_ref, consultation.consulted_at, "Reviewed ongoing treatment plan."),
            ("prescription", "Medication prescribed", "PatientPrescription", prescription.rx_number, prescription.issued_at, "Amlodipine 5mg prescribed once daily."),
            ("diagnostic", "Diagnostic result available", "PatientDiagnosticOrder", diagnostic.order_number, diagnostic.result_at or now - timedelta(hours=12), "HbA1c result uploaded."),
            ("consultation", "Follow-up consultation", "PatientConsultation", consultation_two.consultation_ref, consultation_two.consulted_at, "Follow-up consultation completed."),
            ("prescription", "Medication refill issued", "PatientPrescription", prescription_two.rx_number, prescription_two.issued_at, "Losartan refill issued."),
            ("diagnostic", "Lipid profile posted", "PatientDiagnosticOrder", diagnostic_two.order_number, diagnostic_two.result_at, "Lipid panel added to your timeline."),
        ]
        for event_type, title, source_model, source_identifier, occurred_at, details in record_events:
            models.PatientRecordEvent.objects.create(
                patient=patient,
                facility=facility,
                event_type=event_type,
                status=models.WorkflowStatus.CONFIRMED,
                title=title,
                source_model=source_model,
                source_identifier=source_identifier,
                details=details,
                occurred_at=occurred_at,
            )

        # Orders and fulfillment states
        order_specs = [
            ("ORD-0001", models.PatientPortalOrderStatus.PENDING, "~20 mins", None, now - timedelta(minutes=20), None, 0),
            ("ORD-0002", models.PatientPortalOrderStatus.IN_TRANSIT, "~10 mins", rider_link.rider, now - timedelta(hours=1), now - timedelta(minutes=30), 2),
            ("ORD-0003", models.PatientPortalOrderStatus.DELIVERED, "Delivered", rider_link.rider, now - timedelta(days=1), now - timedelta(days=1, minutes=40), 3),
            ("ORD-0004", models.PatientPortalOrderStatus.CANCELLED, "Cancelled", None, now - timedelta(days=2), None, 0),
        ]
        created_orders = []
        for order_number, status, eta_label, rider, placed_at, started_at, progress_step in order_specs:
            order_row = models.PatientMedicationOrder.objects.create(
                order_number=order_number,
                patient=patient,
                facility=facility,
                prescription=prescription if order_number in {"ORD-0001", "ORD-0002"} else prescription_two,
                rider=rider,
                status=status,
                placed_at=placed_at,
                eta_label=eta_label,
                delivery_address=patient.address,
                pickup_address="Nairobi General Hospital Pharmacy",
                patient_phone=patient.phone,
                rider_payout_amount=Decimal("450.00"),
                distance_km=Decimal("7.4"),
                estimated_minutes=25,
                started_at=started_at,
                delivered_at=placed_at + timedelta(hours=2) if status == models.PatientPortalOrderStatus.DELIVERED else None,
                progress_step=progress_step,
                notes=f"Seeded {status} order example.",
            )
            models.PatientMedicationOrderItem.objects.create(
                order=order_row,
                medication_name="Amlodipine 5mg" if order_number in {"ORD-0001", "ORD-0002"} else "Losartan 50mg",
                quantity=30,
            )
            created_orders.append(order_row)

        # Notifications: mixed read/unread and event ids
        notification_rows = [
            ("PN-0001", "appointment_created", "Appointment confirmed", "Your appointment PBK-0001 is confirmed.", "calendar", False, "patient-booking:PBK-0001:appointment_created"),
            ("PN-0002", "appointment_in_progress", "Appointment in progress", "PBK-0004 is now in progress.", "clock", False, "patient-booking:PBK-0004:appointment_in_progress"),
            ("PN-0003", "appointment_cancelled", "Appointment cancelled", "PBK-0006 was cancelled.", "x", True, "patient-booking:PBK-0006:appointment_cancelled"),
            ("PN-0004", "order", "Order in transit", "ORD-0002 is on the way.", "truck", False, "patient-order:ORD-0002:in_transit"),
            ("PN-0005", "order", "Order delivered", "ORD-0003 was delivered.", "check-circle", True, "patient-order:ORD-0003:delivered"),
            ("PN-0006", "lab_result", "Lab result posted", "New lipid profile result is available.", "flask-outline", False, "patient-lab:LAB-0002:result"),
        ]
        for code, kind, title, body, icon_name, read, event_id in notification_rows:
            models.PatientPortalNotification.objects.create(
                notification_code=code,
                patient=patient,
                facility=facility,
                event_id=event_id,
                kind=kind,
                title=title,
                body=body,
                icon_lib="feather",
                icon_name=icon_name,
                read=read,
            )

        # Support: multiple severities and statuses
        support_rows = [
            ("PT-0001", "Delivery update", "Need an ETA for ORD-0002.", models.WorkflowStatus.IN_PROGRESS, models.SeverityLevel.MEDIUM),
            ("PT-0002", "Prescription clarification", "Please confirm evening dosage.", models.WorkflowStatus.COMPLETED, models.SeverityLevel.LOW),
            ("PT-0003", "Payment issue", "I was charged twice for an order.", models.WorkflowStatus.CANCELLED, models.SeverityLevel.HIGH),
        ]
        for ticket_number, subject, message, status, severity in support_rows:
            models.PatientSupportTicket.objects.create(
                ticket_number=ticket_number,
                patient=patient,
                facility=facility,
                subject=subject,
                message=message,
                status=status,
                severity=severity,
                channel="portal",
            )

    def _seed_provider_operations(self, patient_link, memberships, facilities, now):
        patient = patient_link.patient
        facility = facilities["nairobi"]
        doctor = memberships["doctor"].provider

        appointment = models.ProviderAppointment.objects.create(
            appointment_ref="APT-0001",
            provider=doctor,
            facility=facility,
            patient=patient,
            status=models.WorkflowStatus.CONFIRMED,
            scheduled_for=now + timedelta(hours=2),
            appointment_type="In Facility",
            patient_phone=patient.phone,
            visit_reason="BP follow-up",
        )
        consultation = models.ProviderConsultation.objects.create(
            consultation_ref="PVC-0001",
            provider=doctor,
            patient=patient,
            appointment=appointment,
            facility=facility,
            status=models.WorkflowStatus.IN_PROGRESS,
            consultation_type="Follow-up",
            assessment="Improving blood pressure trends.",
            consulted_at=now - timedelta(days=1),
        )
        models.ProviderPrescriptionTask.objects.create(
            task_ref="PRX-0001",
            provider=doctor,
            patient=patient,
            consultation=consultation,
            facility=facility,
            status=models.WorkflowStatus.CONFIRMED,
            medication_name="Amlodipine 5mg",
            quantity=30,
            instructions="Take once daily",
            sent_at=now - timedelta(hours=20),
        )
        models.ProviderLabResult.objects.create(
            lab_ref="PLAB-0001",
            facility=facility,
            provider=doctor,
            patient=patient,
            test_name="HbA1c",
            result_value="6.8%",
            reference_range="<6.5%",
            status="high",
            critical=False,
            reported_at=now - timedelta(hours=8),
        )
        models.ProviderAvailability.objects.create(
            provider=doctor,
            facility=facility,
            slots=[{"id": "slot-1", "day": "Mon", "start": "09:00", "end": "13:00", "type": "In Facility"}],
            blocked_days=[],
        )
        models.ProviderClinicalSetting.objects.create(
            facility=facility,
            edit_window_hours=24,
            push_notifications=True,
            critical_lab_alerts=True,
            email_reports=True,
            two_factor_enabled=False,
        )
        inventory = models.ProviderInventoryItem.objects.create(
            item_code="INV-0001",
            facility=facility,
            name="Amlodipine 5mg",
            category="Hypertension",
            stock=120,
            unit="tabs",
            unit_price=Decimal("15.00"),
            reorder=20,
            status="ok",
            ecommerce=True,
            active=True,
        )
        models.ProviderBillingRecord.objects.create(
            billing_code="BIL-0001",
            facility=facility,
            patient=patient,
            patient_name=patient.full_name,
            service_name="Consultation",
            amount=Decimal("2500.00"),
            status="pending",
            payment_method="invoice",
            billed_on=timezone.localdate(),
        )
        models.ProviderPortalNotification.objects.create(
            notification_code="PVN-0001",
            user=memberships["doctor"].user,
            facility=facility,
            title="New consultation added",
            message="Faith Njoroge has a follow-up consultation pending.",
        )
        models.ProviderSupportTicket.objects.create(
            ticket_code="SUP-0001",
            facility=facility,
            raised_by=memberships["doctor"].user,
            raised_by_name=memberships["doctor"].user.get_full_name().strip(),
            raised_by_role=memberships["doctor"].role,
            title="Lab turnaround review",
            description="HbA1c results should alert earlier in the dashboard.",
                category="Other",
            priority="medium",
            status="open",
            responses=[],
        )
        models.ProviderActivityLog.objects.create(
            log_code="LOG-0001",
            actor=memberships["facility_admin"].user,
            facility=facility,
            staff_name=memberships["facility_admin"].user.get_full_name().strip(),
            staff_membership_id=str(memberships["facility_admin"].id),
            role=memberships["facility_admin"].role,
            module="Staff",
            action="Seeded facility staff",
            detail="Initial facility staff created.",
            entry_type="staff",
            occurred_at=now - timedelta(hours=3),
        )
        models.ProviderPosTransaction.objects.create(
            transaction_code="POS-0001",
            facility=facility,
            pos_id=str(memberships["pos"].id),
            cashier_name=memberships["pos"].user.get_full_name().strip(),
            items=[{"id": str(inventory.id), "reference": inventory.item_code, "name": inventory.name, "qty": 2}],
            subtotal=Decimal("30.00"),
            discount_total=Decimal("0.00"),
            grand_total=Decimal("30.00"),
            payment_method="cash",
            payment_ref="",
            status="completed",
            receipt_no="RCP-0001",
        )
        models.ProviderEarningsSnapshot.objects.create(
            provider=doctor,
            facility=facility,
            status=models.WorkflowStatus.CONFIRMED,
            period_start=timezone.localdate() - timedelta(days=30),
            period_end=timezone.localdate(),
            gross_amount=Decimal("25000.00"),
            fee_amount=Decimal("2500.00"),
            net_amount=Decimal("22500.00"),
            payout_state=models.PayoutState.PENDING_APPROVAL,
        )
        models.ProviderProtocol.objects.create(
            protocol_code="PRO-0001",
            facility=facility,
            title="Hypertension follow-up",
            status=models.WorkflowStatus.CONFIRMED,
            version="v1",
            category="clinical",
            content="Check vitals, review medication adherence, and confirm refill needs.",
            published_at=now - timedelta(days=7),
        )

    def _seed_rider_operations(self, rider_link, facilities, now):
        rider = rider_link.rider
        facility = facilities["nairobi"]
        delivered_order = rider.medication_orders.filter(status=models.PatientPortalOrderStatus.IN_TRANSIT).first()
        if delivered_order:
            models.RiderHistoryEntry.objects.create(
                facility=facility,
                rider=rider,
                job=None,
                status=models.WorkflowStatus.CONFIRMED,
                title="Picked up delivery",
                details=f"{delivered_order.order_number} is on the way.",
                occurred_at=now - timedelta(minutes=20),
            )
            models.RiderPortalNotification.objects.create(
                notification_code="RN-0001",
                facility=facility,
                rider=rider,
                title="Delivery accepted",
                message=f"You accepted {delivered_order.order_number}.",
                icon_lib="mc",
                icon_name="truck-fast",
                color="success",
            )
            models.RiderChatMessage.objects.create(
                message_code="RM-0001",
                facility=facility,
                rider=rider,
                order=delivered_order,
                sender_role="patient",
                sender_name=delivered_order.patient.full_name,
                message="Please call when near the gate.",
                sent_at=now - timedelta(minutes=10),
            )
        models.RiderEarningsSnapshot.objects.create(
            facility=facility,
            rider=rider,
            status=models.WorkflowStatus.CONFIRMED,
            period_start=timezone.localdate() - timedelta(days=30),
            period_end=timezone.localdate(),
            gross_amount=Decimal("4200.00"),
            bonus_amount=Decimal("300.00"),
            net_amount=Decimal("4500.00"),
            payout_state=models.PayoutState.PENDING_APPROVAL,
        )

    def _seed_finance_and_internal(self, facility, owner, now):
        supplier = models.Supplier.objects.create(
            facility=facility,
            name="MediSupply East Africa",
            contact_person="Alice Kariuki",
            email="orders@medisupply.co.ke",
            phone="+254788888888",
            status=models.WorkflowStatus.CONFIRMED,
        )
        stock = models.StockItem.objects.create(
            facility=facility,
            sku="SKU-0001",
            name="Amlodipine 5mg",
            status=models.InventoryState.IN_STOCK,
            quantity=120,
            reorder_level=20,
            unit_price=Decimal("15.00"),
            supplier=supplier,
        )
        models.InventoryBatch.objects.create(
            facility=facility,
            stock_item=stock,
            batch_code="BAT-0001",
            status=models.InventoryState.IN_STOCK,
            quantity=120,
            received_on=timezone.localdate() - timedelta(days=14),
            expires_on=timezone.localdate() + timedelta(days=365),
        )
        models.SaleRecord.objects.create(
            facility=facility,
            sale_number="SAL-0001",
            item=stock,
            status=models.WorkflowStatus.CONFIRMED,
            quantity=2,
            total_amount=Decimal("30.00"),
            sold_at=now - timedelta(hours=1),
            channel="POS",
        )
        models.RevenueEntry.objects.create(
            facility=facility,
            reference="REV-0001",
            source="POS",
            status=models.WorkflowStatus.CONFIRMED,
            amount=Decimal("30.00"),
            currency="KES",
            booked_at=now - timedelta(hours=1),
        )
        models.PayoutRequest.objects.create(
            facility=facility,
            reference="PAY-0001",
            beneficiary_name="Dr. Amina Wanjiku",
            status=models.PayoutState.PENDING_APPROVAL,
            amount=Decimal("22500.00"),
            currency="KES",
            requested_at=now - timedelta(days=1),
        )
        models.Invoice.objects.create(
            facility=facility,
            invoice_number="INV-0001",
            customer_name="Faith Njoroge",
            status=models.WorkflowStatus.CONFIRMED,
            amount=Decimal("2500.00"),
            currency="KES",
            issued_on=timezone.localdate(),
        )
        models.TransactionLog.objects.create(
            facility=facility,
            transaction_id="TX-0001",
            transaction_type="sale",
            status=models.WorkflowStatus.CONFIRMED,
            amount=Decimal("30.00"),
            currency="KES",
            processed_at=now - timedelta(hours=1),
            payload={"source": "seed"},
        )
        models.ExecutiveKPI.objects.create(
            facility=facility,
            metric_name="Revenue",
            metric_code="KPI-REV-01",
            status=models.WorkflowStatus.CONFIRMED,
            value=Decimal("25000.00"),
            trend_delta=Decimal("8.50"),
            period_start=timezone.localdate() - timedelta(days=30),
            period_end=timezone.localdate(),
            owner=owner,
        )
        models.AuditEvent.objects.create(
            facility=facility,
            module="finance",
            action="seed_complete",
            severity=models.SeverityLevel.LOW,
            actor=owner,
            model_label="Facility",
            object_identifier=facility.facility_code,
            message="Facility-tenancy seed completed.",
        )
