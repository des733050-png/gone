import json
import time
from datetime import timedelta

from django.db import transaction
from django.db.models import Prefetch
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    PatientBooking,
    PatientConsultation,
    PatientDiagnosticOrder,
    PatientMedicationOrder,
    PatientMedicationOrderItem,
    PatientPortalNotification,
    PatientPortalOrderStatus,
    PatientPreference,
    PatientPrescription,
    PatientProfile,
    PatientSupportTicket,
    WorkflowStatus,
)
from portal_api.utils import (
    PATIENT_FACILITY_SESSION_KEY,
    build_patient_appointment_payload,
    build_patient_notification_payload,
    build_patient_order_payload,
    build_patient_payload,
    build_patient_record_payload,
    build_patient_records_sections,
    get_patient_active_facility,
    get_patient_link,
    format_uuid,
    parse_patient_booking_status,
)


def get_active_patient_context_or_raise(request):
    link = get_patient_link(request.user)
    if link is None:
        raise NotFound("Patient profile link not found.")
    facility, access_rows = get_patient_active_facility(
        link,
        request.session.get(PATIENT_FACILITY_SESSION_KEY),
    )
    if facility is None:
        raise PermissionDenied("No facility context is available for this patient.")
    return link, facility, access_rows


def _lookup_by_id_or_code(queryset, identifier, code_field, not_found_message):
    try:
        return queryset.get(pk=identifier)
    except Exception:
        try:
            return queryset.get(**{code_field: identifier})
        except queryset.model.DoesNotExist as exc:
            raise NotFound(not_found_message) from exc


def get_patient_booking_or_raise(patient, facility, booking_ref):
    return _lookup_by_id_or_code(
        patient.bookings.filter(facility=facility),
        booking_ref,
        "booking_ref",
        "Appointment not found.",
    )


def get_patient_order_or_raise(patient, facility, order_number):
    return _lookup_by_id_or_code(
        patient.medication_orders.select_related("rider").prefetch_related("items").filter(
            facility=facility
        ),
        order_number,
        "order_number",
        "Order not found.",
    )


def resolve_record_provider_labels(events):
    consultation_refs = [
        event.source_identifier
        for event in events
        if event.source_model == "PatientConsultation"
    ]
    prescription_refs = [
        event.source_identifier
        for event in events
        if event.source_model == "PatientPrescription"
    ]
    diagnostic_refs = [
        event.source_identifier
        for event in events
        if event.source_model == "PatientDiagnosticOrder"
    ]

    consultations = {
        item.consultation_ref: item
        for item in PatientConsultation.objects.filter(
            consultation_ref__in=consultation_refs
        )
    }
    prescriptions = {
        item.rx_number: item
        for item in PatientPrescription.objects.select_related("consultation").filter(
            rx_number__in=prescription_refs
        )
    }
    diagnostics = {
        item.order_number: item
        for item in PatientDiagnosticOrder.objects.select_related("consultation").filter(
            order_number__in=diagnostic_refs
        )
    }

    labels = {}
    for event in events:
        provider_label = "Gonep Team"
        if event.source_model == "PatientConsultation":
            provider_label = (
                consultations.get(event.source_identifier).provider_name
                if consultations.get(event.source_identifier)
                and consultations.get(event.source_identifier).provider_name
                else "Gonep Team"
            )
        elif event.source_model == "PatientPrescription":
            prescription = prescriptions.get(event.source_identifier)
            provider_label = (
                prescription.consultation.provider_name
                if prescription
                and prescription.consultation
                and prescription.consultation.provider_name
                else "Pharmacy Team"
            )
        elif event.source_model == "PatientDiagnosticOrder":
            diagnostic = diagnostics.get(event.source_identifier)
            provider_label = (
                diagnostic.consultation.provider_name
                if diagnostic
                and diagnostic.consultation
                and diagnostic.consultation.provider_name
                else "Diagnostic Lab"
            )
        labels[event.pk] = provider_label
    return labels


def build_profile_update_payload(link, payload):
    user = link.user
    patient = link.patient

    email = str(payload.get("email", user.email)).strip().lower()
    if not email:
        raise ValidationError({"email": "Email is required."})
    duplicate = (
        user.__class__.objects.filter(email__iexact=email).exclude(pk=user.pk).exists()
    )
    if duplicate:
        raise ValidationError({"email": "Another account already uses that email."})

    first_name = str(payload.get("first_name", user.first_name)).strip()
    last_name = str(payload.get("last_name", user.last_name)).strip()
    if not first_name:
        raise ValidationError({"first_name": "First name is required."})
    if not last_name:
        raise ValidationError({"last_name": "Last name is required."})

    phone = str(payload.get("phone", patient.phone)).strip()
    if not phone:
        raise ValidationError({"phone": "Phone number is required."})

    date_of_birth = payload.get("date_of_birth", None)
    if date_of_birth is None:
        parsed_dob = patient.date_of_birth
    elif date_of_birth == "":
        parsed_dob = None
    else:
        try:
            parsed_dob = PatientProfile._meta.get_field("date_of_birth").to_python(
                date_of_birth
            )
        except Exception as exc:
            raise ValidationError(
                {"date_of_birth": "Date of birth must use YYYY-MM-DD format."}
            ) from exc

    return {
        "user": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
        },
        "patient": {
            "full_name": f"{first_name} {last_name}".strip(),
            "phone": phone,
            "email": email,
            "address": str(payload.get("address", patient.address)).strip(),
            "date_of_birth": parsed_dob,
        },
    }


def build_patient_settings_payload(link, facility):
    preferences, _ = PatientPreference.objects.get_or_create(
        patient=link.patient,
        facility=facility,
        defaults={
            "appointment_reminders": True,
            "order_updates": True,
            "lab_results_alerts": True,
            "medication_refill_reminders": True,
            "marketing_updates": False,
            "privacy_mode": False,
        },
    )
    return {
        "appointment_reminders": preferences.appointment_reminders,
        "order_updates": preferences.order_updates,
        "lab_results_alerts": preferences.lab_results_alerts,
        "medication_refill_reminders": preferences.medication_refill_reminders,
        "marketing_updates": preferences.marketing_updates,
        "privacy_mode": preferences.privacy_mode,
    }


def _next_patient_notification_code():
    counter = PatientPortalNotification.objects.count() + 1
    while True:
        candidate = f"PT-NOTIF-{counter:04d}"
        if not PatientPortalNotification.objects.filter(notification_code=candidate).exists():
            return candidate
        counter += 1


def next_identifier(model_class, field_name, prefix, padding=4):
    latest_value = (
        model_class.objects.filter(**{f"{field_name}__startswith": prefix})
        .order_by(f"-{field_name}")
        .values_list(field_name, flat=True)
        .first()
    )
    if latest_value:
        suffix = latest_value.replace(prefix, "")
        if suffix.isdigit():
            return f"{prefix}{int(suffix) + 1:0{padding}d}"
    return f"{prefix}{1:0{padding}d}"


def _upsert_patient_booking_notification(
    booking,
    event_kind,
    *,
    title,
    body,
    icon_name="calendar",
):
    event_id = f"patient-booking:{booking.booking_ref}:{event_kind}"
    notification, created = PatientPortalNotification.objects.get_or_create(
        patient=booking.patient,
        facility=booking.facility,
        event_id=event_id,
        defaults={
            "notification_code": _next_patient_notification_code(),
            "kind": event_kind,
            "title": title,
            "body": body,
            "icon_lib": "feather",
            "icon_name": icon_name,
            "read": False,
        },
    )
    if not created:
        changed_fields = []
        if notification.title != title:
            notification.title = title
            changed_fields.append("title")
        if notification.body != body:
            notification.body = body
            changed_fields.append("body")
        if notification.kind != event_kind:
            notification.kind = event_kind
            changed_fields.append("kind")
        if notification.icon_name != icon_name:
            notification.icon_name = icon_name
            changed_fields.append("icon_name")
        # Preserve read state for identical events across refresh/login.
        # Only mark unread again when the event payload meaningfully changes.
        if changed_fields and notification.read:
            notification.read = False
            changed_fields.append("read")
        if changed_fields:
            changed_fields.append("updated_at")
            notification.save(update_fields=changed_fields)
    return notification


def _emit_patient_booking_transition_notification(
    booking,
    transition,
    *,
    actor_label=None,
    old_schedule=None,
):
    when_label = timezone.localtime(booking.scheduled_for).strftime("%b %d at %I:%M %p") if booking.scheduled_for else "TBD"
    doctor_label = booking.provider_name or "your care team"
    if transition == "created":
        return _upsert_patient_booking_notification(
            booking,
            "appointment_created",
            title="Appointment created",
            body=f"Your appointment with {doctor_label} is booked for {when_label}.",
        )
    if transition == "approved":
        return _upsert_patient_booking_notification(
            booking,
            "appointment_approved",
            title="Appointment confirmed",
            body=f"Your appointment with {doctor_label} has been confirmed for {when_label}.",
            icon_name="check-circle",
        )
    if transition == "rejected":
        return _upsert_patient_booking_notification(
            booking,
            "appointment_rejected",
            title="Appointment request rejected",
            body=f"{actor_label or 'The provider'} rejected your appointment request.",
            icon_name="x-circle",
        )
    if transition == "rescheduled":
        old_label = timezone.localtime(old_schedule).strftime("%b %d at %I:%M %p") if old_schedule else "the previous time"
        return _upsert_patient_booking_notification(
            booking,
            "appointment_rescheduled",
            title="Appointment rescheduled",
            body=f"Your appointment moved from {old_label} to {when_label}.",
        )
    if transition == "cancelled":
        return _upsert_patient_booking_notification(
            booking,
            "appointment_cancelled",
            title="Appointment cancelled",
            body=f"Your appointment for {when_label} was cancelled.",
            icon_name="x",
        )
    if transition == "in_progress":
        return _upsert_patient_booking_notification(
            booking,
            "appointment_in_progress",
            title="Appointment in progress",
            body=f"Your appointment with {doctor_label} is now in progress.",
            icon_name="clock",
        )
    return None


class PatientMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, access_rows = get_active_patient_context_or_raise(request)
        return Response(build_patient_payload(link, facility, access_rows))

    @transaction.atomic
    def patch(self, request):
        link, facility, access_rows = get_active_patient_context_or_raise(request)
        update_payload = build_profile_update_payload(link, request.data or {})

        for field_name, value in update_payload["user"].items():
            setattr(link.user, field_name, value)
        link.user.save(update_fields=["first_name", "last_name", "email"])

        for field_name, value in update_payload["patient"].items():
            setattr(link.patient, field_name, value)
        link.patient.save(
            update_fields=["full_name", "phone", "email", "address", "date_of_birth"]
        )

        return Response(build_patient_payload(link, facility, access_rows))


class PatientSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        return Response(build_patient_settings_payload(link, facility))

    @transaction.atomic
    def patch(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        preferences, _ = PatientPreference.objects.get_or_create(
            patient=link.patient,
            facility=facility,
            defaults={
                "appointment_reminders": True,
                "order_updates": True,
                "lab_results_alerts": True,
                "medication_refill_reminders": True,
                "marketing_updates": False,
                "privacy_mode": False,
            },
        )
        data = request.data or {}
        update_fields = ["updated_at"]
        if "appointment_reminders" in data:
            preferences.appointment_reminders = bool(data.get("appointment_reminders"))
            update_fields.append("appointment_reminders")
        if "order_updates" in data:
            preferences.order_updates = bool(data.get("order_updates"))
            update_fields.append("order_updates")
        if "lab_results_alerts" in data:
            preferences.lab_results_alerts = bool(data.get("lab_results_alerts"))
            update_fields.append("lab_results_alerts")
        if "medication_refill_reminders" in data:
            preferences.medication_refill_reminders = bool(
                data.get("medication_refill_reminders")
            )
            update_fields.append("medication_refill_reminders")
        if "marketing_updates" in data:
            preferences.marketing_updates = bool(data.get("marketing_updates"))
            update_fields.append("marketing_updates")
        if "privacy_mode" in data:
            preferences.privacy_mode = bool(data.get("privacy_mode"))
            update_fields.append("privacy_mode")
        preferences.save(update_fields=update_fields)
        return Response(build_patient_settings_payload(link, facility))


class PatientAppointmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        bookings = (
            link.patient.bookings.filter(facility=facility)
            .prefetch_related(
                Prefetch(
                    "consultations",
                    queryset=PatientConsultation.objects.order_by("-consulted_at"),
                    to_attr="prefetched_consultations",
                )
            )
            .order_by("scheduled_for", "-created_at")
        )
        payload = []
        for booking in bookings:
            consultation = (
                booking.prefetched_consultations[0]
                if getattr(booking, "prefetched_consultations", None)
                else None
            )
            booking.latest_consultation = consultation
            booking_payload = build_patient_appointment_payload(booking, consultation)
            _emit_patient_booking_transition_notification(booking, "created")
            if booking_payload.get("status") == "in_progress":
                _emit_patient_booking_transition_notification(booking, "in_progress")
            payload.append(booking_payload)
        return Response(payload)


class PatientAppointmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_ref):
        link, facility, _ = get_active_patient_context_or_raise(request)
        booking = get_patient_booking_or_raise(link.patient, facility, booking_ref)
        consultation = booking.consultations.order_by("-consulted_at").first()
        return Response(build_patient_appointment_payload(booking, consultation))

    def patch(self, request, booking_ref):
        link, facility, _ = get_active_patient_context_or_raise(request)
        booking = get_patient_booking_or_raise(link.patient, facility, booking_ref)
        previous_status = booking.status
        previous_schedule = booking.scheduled_for
        update_fields = ["updated_at"]

        scheduled_for_raw = request.data.get("scheduled_for", None)
        if scheduled_for_raw is not None:
            try:
                parsed_scheduled_for = PatientBooking._meta.get_field(
                    "scheduled_for"
                ).to_python(scheduled_for_raw)
            except Exception as exc:
                raise ValidationError(
                    {"scheduled_for": "Scheduled datetime must be a valid ISO datetime."}
                ) from exc
            if parsed_scheduled_for is None:
                raise ValidationError(
                    {"scheduled_for": "Scheduled datetime is required for rescheduling."}
                )
            if timezone.is_naive(parsed_scheduled_for):
                parsed_scheduled_for = timezone.make_aware(
                    parsed_scheduled_for, timezone.get_current_timezone()
                )
            minimum_allowed = timezone.now() + timedelta(hours=48)
            if parsed_scheduled_for < minimum_allowed:
                raise ValidationError(
                    {
                        "scheduled_for": "Reschedule time must be at least 48 hours from now."
                    }
                )
            booking.scheduled_for = parsed_scheduled_for
            update_fields.append("scheduled_for")

        next_status = request.data.get("status")
        if next_status:
            parsed_status = parse_patient_booking_status(str(next_status).strip())
            if parsed_status == booking.status:
                pass
            elif parsed_status == WorkflowStatus.CANCELLED:
                scheduled_for = booking.scheduled_for
                now = timezone.now()
                if scheduled_for is None:
                    raise ValidationError(
                        {"status": "Cannot cancel an appointment without a schedule."}
                    )
                if now > (scheduled_for - timedelta(hours=24)):
                    raise ValidationError(
                        {
                            "status": "Appointments can only be cancelled at least 24 hours before start time."
                        }
                    )
                reason = str(request.data.get("cancellation_reason", "")).strip()
                actor_label = (
                    request.user.get_full_name().strip()
                    if request.user and request.user.get_full_name().strip()
                    else request.user.email
                )
                safe_actor = actor_label.replace("|", " ").strip()
                safe_reason = reason.replace("|", " ").strip()
                prior_notes = booking.notes or ""
                note_lines = [
                    line
                    for line in prior_notes.splitlines()
                    if not line.startswith("CANCEL_META|")
                ]
                note_lines.append(
                    f"CANCEL_META|by={safe_actor}|reason={safe_reason}"
                )
                booking.notes = "\n".join([line for line in note_lines if line]).strip()
                booking.status = parsed_status
                update_fields.extend(["notes", "status"])
            else:
                booking.status = parsed_status
                update_fields.append("status")
        elif scheduled_for_raw is not None:
            booking.status = WorkflowStatus.DRAFT
            update_fields.append("status")

        booking.save(update_fields=list(dict.fromkeys(update_fields)))
        if scheduled_for_raw is not None and booking.scheduled_for != previous_schedule:
            _emit_patient_booking_transition_notification(
                booking,
                "rescheduled",
                old_schedule=previous_schedule,
            )
        if previous_status != booking.status:
            if booking.status == WorkflowStatus.CANCELLED:
                _emit_patient_booking_transition_notification(booking, "cancelled")
            elif booking.status == WorkflowStatus.CONFIRMED:
                _emit_patient_booking_transition_notification(booking, "approved")
            elif booking.status == WorkflowStatus.IN_PROGRESS:
                _emit_patient_booking_transition_notification(booking, "in_progress")
        consultation = booking.consultations.order_by("-consulted_at").first()
        return Response(build_patient_appointment_payload(booking, consultation))


class PatientOrdersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        orders = (
            link.patient.medication_orders.select_related("rider")
            .prefetch_related("items")
            .filter(facility=facility)
            .order_by("-placed_at", "-created_at")
        )
        return Response([build_patient_order_payload(order) for order in orders])


class PatientOrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        link, facility, _ = get_active_patient_context_or_raise(request)
        order = get_patient_order_or_raise(link.patient, facility, order_number)
        return Response(build_patient_order_payload(order, include_tracking=True))


def _next_reorder_number(base_order_number):
    suffix = 1
    while True:
        candidate = f"{base_order_number}-R{suffix:02d}"
        if not PatientMedicationOrder.objects.filter(order_number=candidate).exists():
            return candidate
        suffix += 1


class PatientOrderReorderView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_number):
        link, facility, _ = get_active_patient_context_or_raise(request)
        original = get_patient_order_or_raise(link.patient, facility, order_number)
        recreated = PatientMedicationOrder.objects.create(
            order_number=_next_reorder_number(original.order_number),
            patient=link.patient,
            facility=facility,
            prescription=original.prescription,
            rider=original.rider,
            status=PatientPortalOrderStatus.IN_TRANSIT,
            placed_at=timezone.now(),
            eta_label="~15 mins",
            delivery_address=original.delivery_address or link.patient.address,
            pickup_address=original.pickup_address,
            patient_phone=link.patient.phone,
            rider_payout_amount=original.rider_payout_amount,
            distance_km=original.distance_km,
            estimated_minutes=original.estimated_minutes,
            notes=f"Reorder created from {original.order_number}.",
        )
        PatientMedicationOrderItem.objects.bulk_create(
            [
                PatientMedicationOrderItem(
                    order=recreated,
                    medication_name=item.medication_name,
                    quantity=item.quantity,
                )
                for item in original.items.all()
            ]
        )
        recreated.refresh_from_db()
        return Response(build_patient_order_payload(recreated), status=201)


class PatientRecordsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        events = list(
            link.patient.record_events.filter(facility=facility).order_by("-occurred_at")
        )
        provider_labels = resolve_record_provider_labels(events)
        records = [
            build_patient_record_payload(event, provider_labels.get(event.pk))
            for event in events
        ]
        sections = build_patient_records_sections(records)
        return Response({"items": records, "sections": sections})


def build_patient_record_detail_payload(event, provider_label):
    detail = {
        "summary": event.details or "",
        "fields": {},
    }
    if event.source_model == "PatientConsultation":
        consultation = (
            PatientConsultation.objects.filter(consultation_ref=event.source_identifier)
            .only("assessment", "plan", "status", "consulted_at")
            .first()
        )
        if consultation:
            detail["fields"] = {
                "assessment_summary": (consultation.assessment or "")[:220],
                "plan_summary": (consultation.plan or "")[:220],
                "status": consultation.status,
                "consulted_at": consultation.consulted_at.isoformat() if consultation.consulted_at else None,
            }
    elif event.source_model == "PatientPrescription":
        prescription = (
            PatientPrescription.objects.filter(rx_number=event.source_identifier)
            .only("medication_name", "dosage", "instructions", "issued_at", "status")
            .first()
        )
        if prescription:
            detail["fields"] = {
                "drug_name": prescription.medication_name,
                "dosage": prescription.dosage,
                "instructions": prescription.instructions,
                "prescribed_date": prescription.issued_at.isoformat() if prescription.issued_at else None,
                "status": prescription.status,
            }
    elif event.source_model == "PatientDiagnosticOrder":
        lab = (
            PatientDiagnosticOrder.objects.filter(order_number=event.source_identifier)
            .only("test_type", "result_summary", "result_at", "status")
            .first()
        )
        if lab:
            detail["fields"] = {
                "test_name": lab.test_type,
                "result_summary": lab.result_summary,
                "result_date": lab.result_at.isoformat() if lab.result_at else None,
                "status": lab.status,
            }
    base_payload = build_patient_record_payload(event, provider_label)
    return {
        **base_payload,
        "detail": detail,
    }


class PatientRecordDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, record_id):
        link, facility, _ = get_active_patient_context_or_raise(request)
        event = _lookup_by_id_or_code(
            link.patient.record_events.filter(facility=facility),
            record_id,
            "id",
            "Record not found.",
        )
        provider_labels = resolve_record_provider_labels([event])
        return Response(build_patient_record_detail_payload(event, provider_labels.get(event.pk)))


def build_patient_support_ticket_payload(ticket):
    return {
        "id": format_uuid(ticket.id),
        "reference": ticket.ticket_number,
        "subject": ticket.subject,
        "message": ticket.message,
        "status": ticket.status,
        "severity": ticket.severity,
        "channel": ticket.channel or "app",
        "facility": ticket.facility.name,
        "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
        "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        "resolved_at": ticket.resolved_at.isoformat() if ticket.resolved_at else None,
    }


class PatientSupportTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        tickets = (
            PatientSupportTicket.objects.filter(patient=link.patient, facility=facility)
            .select_related("facility")
            .order_by("-created_at")
        )
        return Response([build_patient_support_ticket_payload(item) for item in tickets])

    @transaction.atomic
    def post(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        data = request.data or {}
        subject = str(data.get("subject") or "").strip()
        message = str(data.get("message") or "").strip()
        if not subject or not message:
            raise ValidationError({"detail": "Subject and message are required."})
        ticket = PatientSupportTicket.objects.create(
            ticket_number=next_identifier(PatientSupportTicket, "ticket_number", "PTKT-", 4),
            patient=link.patient,
            facility=facility,
            status=WorkflowStatus.IN_PROGRESS,
            severity=str(data.get("severity") or "medium").strip().lower(),
            channel="app",
            subject=subject,
            message=message,
        )
        return Response(build_patient_support_ticket_payload(ticket), status=201)


class PatientSupportTicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, ticket_number):
        link, facility, _ = get_active_patient_context_or_raise(request)
        ticket = _lookup_by_id_or_code(
            link.patient.support_tickets.filter(facility=facility),
            ticket_number,
            "ticket_number",
            "Support ticket not found.",
        )
        data = request.data or {}
        update_fields = ["updated_at"]
        if "subject" in data:
            ticket.subject = str(data.get("subject") or "").strip() or ticket.subject
            update_fields.append("subject")
        if "message" in data:
            ticket.message = str(data.get("message") or "").strip() or ticket.message
            update_fields.append("message")
        if "severity" in data:
            ticket.severity = str(data.get("severity") or ticket.severity).strip().lower()
            update_fields.append("severity")
        ticket.save(update_fields=update_fields)
        return Response(build_patient_support_ticket_payload(ticket))


class PatientNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        notifications = (
            link.patient.portal_notifications.filter(facility=facility).order_by("-created_at")
        )
        return Response(
            [build_patient_notification_payload(notification) for notification in notifications]
        )


class PatientNotificationsReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        link.patient.portal_notifications.filter(facility=facility, read=False).update(
            read=True,
            updated_at=timezone.now(),
        )
        return Response({"detail": "Notifications updated."})


class PatientEventStreamView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        cursor_param = str(request.query_params.get("cursor") or "").strip()
        cursor = timezone.now() - timedelta(seconds=5)
        if cursor_param:
            try:
                parsed = timezone.datetime.fromisoformat(cursor_param.replace("Z", "+00:00"))
                if timezone.is_naive(parsed):
                    parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
                cursor = parsed
            except Exception:
                pass

        def event_stream():
            stream_cursor = cursor
            started_at = time.monotonic()
            while (time.monotonic() - started_at) < 25:
                emitted = False
                notifications = list(
                    link.patient.portal_notifications.filter(
                        facility=facility,
                        updated_at__gt=stream_cursor,
                    ).order_by("updated_at")
                )
                for notification in notifications:
                    payload = build_patient_notification_payload(notification)
                    payload["type"] = "notification"
                    yield f"event: notification\ndata: {json.dumps(payload)}\n\n"
                    if notification.updated_at and notification.updated_at > stream_cursor:
                        stream_cursor = notification.updated_at
                    emitted = True

                bookings = list(
                    link.patient.bookings.filter(
                        facility=facility,
                        updated_at__gt=stream_cursor,
                    ).order_by("updated_at")
                )
                for booking in bookings:
                    consultation = booking.consultations.order_by("-consulted_at").first()
                    payload = build_patient_appointment_payload(booking, consultation)
                    payload["type"] = "appointment"
                    yield f"event: appointment\ndata: {json.dumps(payload)}\n\n"
                    if booking.updated_at and booking.updated_at > stream_cursor:
                        stream_cursor = booking.updated_at
                    emitted = True

                if not emitted:
                    yield ": keepalive\n\n"
                time.sleep(2)

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class PatientNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_code):
        link, facility, _ = get_active_patient_context_or_raise(request)
        notification = _lookup_by_id_or_code(
            link.patient.portal_notifications.filter(facility=facility),
            notification_code,
            "notification_code",
            "Notification not found.",
        )
        if not notification.read:
            notification.read = True
            notification.save(update_fields=["read", "updated_at"])
        return Response(build_patient_notification_payload(notification))
