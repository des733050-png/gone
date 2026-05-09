from datetime import timedelta
import json
import re
import time

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
    format_uuid,
    get_patient_active_facility,
    get_patient_link,
    parse_patient_booking_status,
)


# ─── Context helpers ──────────────────────────────────────────────────────────

def get_active_patient_context_or_raise(request):
    link = get_patient_link(request.user)
    if link is None:
        raise NotFound("Patient profile link not found.")
    facility, access_rows = get_patient_active_facility(
        link, request.session.get(PATIENT_FACILITY_SESSION_KEY)
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
        booking_ref, "booking_ref", "Appointment not found.",
    )


def get_patient_order_or_raise(patient, facility, order_number):
    return _lookup_by_id_or_code(
        patient.medication_orders.select_related("rider").prefetch_related("items").filter(facility=facility),
        order_number, "order_number", "Order not found.",
    )


def resolve_record_provider_labels(events):
    consultation_refs = [e.source_identifier for e in events if e.source_model == "PatientConsultation"]
    prescription_refs = [e.source_identifier for e in events if e.source_model == "PatientPrescription"]
    diagnostic_refs   = [e.source_identifier for e in events if e.source_model == "PatientDiagnosticOrder"]

    consultations = {c.consultation_ref: c for c in PatientConsultation.objects.filter(consultation_ref__in=consultation_refs)}
    prescriptions = {p.rx_number: p for p in PatientPrescription.objects.select_related("consultation").filter(rx_number__in=prescription_refs)}
    diagnostics   = {d.order_number: d for d in PatientDiagnosticOrder.objects.select_related("consultation").filter(order_number__in=diagnostic_refs)}

    labels = {}
    for event in events:
        provider_label = "Gonep Team"
        if event.source_model == "PatientConsultation":
            c = consultations.get(event.source_identifier)
            provider_label = (c.provider_name if c and c.provider_name else "Gonep Team")
        elif event.source_model == "PatientPrescription":
            p = prescriptions.get(event.source_identifier)
            provider_label = (p.consultation.provider_name if p and p.consultation and p.consultation.provider_name else "Pharmacy Team")
        elif event.source_model == "PatientDiagnosticOrder":
            d = diagnostics.get(event.source_identifier)
            provider_label = (d.consultation.provider_name if d and d.consultation and d.consultation.provider_name else "Diagnostic Lab")
        labels[event.pk] = provider_label
    return labels


# ─── Profile helpers ──────────────────────────────────────────────────────────

def build_profile_update_payload(link, payload):
    user = link.user
    patient = link.patient

    email = str(payload.get("email", user.email)).strip().lower()
    if not email:
        raise ValidationError({"email": "Email is required."})
    if user.__class__.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
        raise ValidationError({"email": "Another account already uses that email."})

    # Respect name lock
    if getattr(patient, "name_locked", False):
        first_name = user.first_name
        last_name  = user.last_name
    else:
        first_name = str(payload.get("first_name", user.first_name)).strip()
        last_name  = str(payload.get("last_name",  user.last_name)).strip()
        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        if not last_name:
            raise ValidationError({"last_name": "Last name is required."})

    phone_raw = str(payload.get("phone", patient.phone)).strip()
    if not phone_raw:
        raise ValidationError({"phone": "Phone number is required."})
    try:
        from portal_api.utils import normalize_kenya_phone
        phone = normalize_kenya_phone(phone_raw)
    except ValueError as exc:
        raise ValidationError({"phone": str(exc)})

    # Respect DOB lock
    if getattr(patient, "dob_locked", False):
        parsed_dob = patient.date_of_birth
    else:
        date_of_birth = payload.get("date_of_birth", None)
        if date_of_birth is None:
            parsed_dob = patient.date_of_birth
        elif date_of_birth == "":
            parsed_dob = None
        else:
            try:
                parsed_dob = PatientProfile._meta.get_field("date_of_birth").to_python(date_of_birth)
            except Exception as exc:
                raise ValidationError({"date_of_birth": "Date of birth must use YYYY-MM-DD format."}) from exc

    return {
        "user":    {"first_name": first_name, "last_name": last_name, "email": email},
        "patient": {
            "full_name":     f"{first_name} {last_name}".strip(),
            "phone":         phone,
            "email":         email,
            "address":       str(payload.get("address", patient.address)).strip(),
            "date_of_birth": parsed_dob,
        },
    }


def build_patient_settings_payload(link, facility):
    defaults = {
        "appointment_reminders": True,
        "order_updates": True,
        "lab_results_alerts": True,
        "medication_refill_reminders": True,
        "marketing_updates": False,
        "privacy_mode": False,
    }
    preferences, _ = PatientPreference.objects.get_or_create(patient=link.patient, facility=facility, defaults=defaults)
    return {
        "appointment_reminders":       preferences.appointment_reminders,
        "order_updates":               preferences.order_updates,
        "lab_results_alerts":          getattr(preferences, "lab_results_alerts", True),
        "medication_refill_reminders": getattr(preferences, "medication_refill_reminders", True),
        "marketing_updates":           getattr(preferences, "marketing_updates", False),
        "privacy_mode":                getattr(preferences, "privacy_mode", False),
    }


def _next_notification_code():
    counter = PatientPortalNotification.objects.count() + 1
    while True:
        candidate = f"pn-{counter:04d}"
        if not PatientPortalNotification.objects.filter(notification_code=candidate).exists():
            return candidate
        counter += 1


def _upsert_patient_booking_notification(patient, facility, event_id=None, title="", body="", icon_name="bell"):
    PatientPortalNotification.objects.create(
        notification_code=_next_notification_code(),
        patient=patient,
        facility=facility,
        kind="appointment",
        title=title,
        body=body,
        icon_lib="feather",
        icon_name=icon_name,
        read=False,
    )


# ─── Profile & settings views ─────────────────────────────────────────────────

class PatientMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, access_rows = get_active_patient_context_or_raise(request)
        return Response(build_patient_payload(link, facility, access_rows))

    @transaction.atomic
    def patch(self, request):
        link, facility, access_rows = get_active_patient_context_or_raise(request)
        # Snapshot old name to detect changes before update_payload overwrites.
        old_first = link.user.first_name
        old_last = link.user.last_name
        update_payload = build_profile_update_payload(link, request.data or {})

        for field_name, value in update_payload["user"].items():
            setattr(link.user, field_name, value)
        link.user.save(update_fields=["first_name", "last_name", "email"])

        for field_name, value in update_payload["patient"].items():
            setattr(link.patient, field_name, value)
        patient_save_fields = ["full_name", "phone", "email", "address", "date_of_birth"]
        # Flip name_locked once the patient successfully changes their name.
        if not getattr(link.patient, "name_locked", False):
            new_first = update_payload["user"].get("first_name", old_first)
            new_last = update_payload["user"].get("last_name", old_last)
            if (new_first, new_last) != (old_first, old_last):
                link.patient.name_locked = True
                patient_save_fields.append("name_locked")
        link.patient.save(update_fields=patient_save_fields)
        link.patient.refresh_from_db()

        return Response(build_patient_payload(link, facility, access_rows))


class PatientSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        return Response(build_patient_settings_payload(link, facility))

    @transaction.atomic
    def patch(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        defaults = {"appointment_reminders": True, "order_updates": True}
        preferences, _ = PatientPreference.objects.get_or_create(patient=link.patient, facility=facility, defaults=defaults)
        data = request.data or {}
        update_fields = ["updated_at"]
        for field_name in ["appointment_reminders", "order_updates", "lab_results_alerts",
                           "medication_refill_reminders", "marketing_updates", "privacy_mode"]:
            if field_name in data and hasattr(preferences, field_name):
                setattr(preferences, field_name, bool(data.get(field_name)))
                update_fields.append(field_name)
        preferences.save(update_fields=update_fields)
        return Response(build_patient_settings_payload(link, facility))


# ─── Appointments ─────────────────────────────────────────────────────────────

CANCEL_WINDOW_HOURS = 24

CANCEL_META = {
    "patient": {"title": "Appointment cancelled", "body": "You cancelled your appointment.", "icon": "x-circle"},
}


class PatientAppointmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        bookings = (
            link.patient.bookings.filter(facility=facility)
            .prefetch_related(
                Prefetch("consultations", queryset=PatientConsultation.objects.order_by("-consulted_at"), to_attr="prefetched_consultations")
            )
            .order_by("scheduled_for", "-created_at")
        )
        payload = []
        for booking in bookings:
            consultation = (booking.prefetched_consultations[0] if getattr(booking, "prefetched_consultations", None) else None)
            booking.latest_consultation = consultation
            payload.append(build_patient_appointment_payload(booking, consultation))
        return Response(payload)


class PatientAppointmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_ref):
        link, facility, _ = get_active_patient_context_or_raise(request)
        booking = get_patient_booking_or_raise(link.patient, facility, booking_ref)
        consultation = booking.consultations.order_by("-consulted_at").first()
        return Response(build_patient_appointment_payload(booking, consultation))

    @transaction.atomic
    def patch(self, request, booking_ref):
        link, facility, _ = get_active_patient_context_or_raise(request)
        booking = get_patient_booking_or_raise(link.patient, facility, booking_ref)
        data = request.data or {}
        patient = link.patient
        now = timezone.now()

        next_status_raw = str(data.get("status") or "").strip()

        if next_status_raw in {"cancelled", "reschedule"}:
            if booking.status in {WorkflowStatus.CANCELLED, WorkflowStatus.COMPLETED}:
                raise ValidationError({"detail": "Cannot modify a completed or already-cancelled appointment."})
            if booking.scheduled_for and now > (booking.scheduled_for - timedelta(hours=CANCEL_WINDOW_HOURS)):
                raise ValidationError({"detail": f"Appointments can only be cancelled at least {CANCEL_WINDOW_HOURS} hours in advance."})

        if next_status_raw == "cancelled":
            booking.status = WorkflowStatus.CANCELLED
            reason = str(data.get("reason") or "Patient cancelled").strip()
            booking.notes = f"CANCEL_META|by=patient|reason={reason}"
            booking.save(update_fields=["status", "notes", "updated_at"])
            _upsert_patient_booking_notification(
                patient, facility,
                event_id=f"cancel-{booking.booking_ref}",
                title="Appointment cancelled",
                body=f"Your appointment {booking.booking_ref} was cancelled.",
                icon_name="x-circle",
            )
        elif next_status_raw:
            booking.status = parse_patient_booking_status(next_status_raw)
            booking.save(update_fields=["status", "updated_at"])

        consultation = booking.consultations.order_by("-consulted_at").first()
        return Response(build_patient_appointment_payload(booking, consultation))


# ─── Orders ───────────────────────────────────────────────────────────────────

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
        PatientMedicationOrderItem.objects.bulk_create([
            PatientMedicationOrderItem(order=recreated, medication_name=item.medication_name, quantity=item.quantity)
            for item in original.items.all()
        ])
        recreated.refresh_from_db()
        return Response(build_patient_order_payload(recreated), status=201)


# ─── Records ──────────────────────────────────────────────────────────────────

class PatientRecordsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        events = list(link.patient.record_events.filter(facility=facility).order_by("-occurred_at"))
        provider_labels = resolve_record_provider_labels(events)
        records = [build_patient_record_payload(event, provider_labels.get(event.pk)) for event in events]
        sections = build_patient_records_sections(records)
        return Response({"records": records, "sections": sections})


class PatientRecordDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, record_id):
        link, facility, _ = get_active_patient_context_or_raise(request)
        event = _lookup_by_id_or_code(
            link.patient.record_events.filter(facility=facility),
            record_id, "id", "Record not found.",
        )
        provider_labels = resolve_record_provider_labels([event])
        return Response(build_patient_record_payload(event, provider_labels.get(event.pk)))


# ─── Support tickets ──────────────────────────────────────────────────────────

class PatientSupportTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        tickets = link.patient.support_tickets.filter(facility=facility).order_by("-created_at")
        return Response([_build_support_ticket_payload(t) for t in tickets])

    @transaction.atomic
    def post(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        data = request.data or {}
        subject = str(data.get("subject") or "").strip()
        message = str(data.get("message") or "").strip()
        if not subject:
            raise ValidationError({"subject": "Subject is required."})

        counter = PatientSupportTicket.objects.count() + 1
        ticket_number = f"PST-{counter:04d}"
        while PatientSupportTicket.objects.filter(ticket_number=ticket_number).exists():
            counter += 1
            ticket_number = f"PST-{counter:04d}"

        ticket = PatientSupportTicket.objects.create(
            ticket_number=ticket_number,
            patient=link.patient,
            facility=facility,
            subject=subject,
            message=message,
            status=WorkflowStatus.IN_PROGRESS,
        )
        return Response(_build_support_ticket_payload(ticket), status=201)


class PatientSupportTicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, ticket_number):
        link, facility, _ = get_active_patient_context_or_raise(request)
        ticket = _lookup_by_id_or_code(
            link.patient.support_tickets.filter(facility=facility),
            ticket_number, "ticket_number", "Support ticket not found.",
        )
        return Response(_build_support_ticket_payload(ticket))


def _build_support_ticket_payload(ticket):
    return {
        "id":            format_uuid(ticket.id),
        "ticket_number": ticket.ticket_number,
        "subject":       ticket.subject,
        "message":       ticket.message,
        "status":        ticket.status,
        "severity":      ticket.severity,
        "created_at":    ticket.created_at.isoformat(),
        "resolved_at":   ticket.resolved_at.isoformat() if ticket.resolved_at else None,
    }


# ─── Notifications ────────────────────────────────────────────────────────────

class PatientNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        notifications = link.patient.portal_notifications.filter(facility=facility).order_by("-created_at")
        return Response([build_patient_notification_payload(n) for n in notifications])


class PatientNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_code):
        link, facility, _ = get_active_patient_context_or_raise(request)
        notification = _lookup_by_id_or_code(
            link.patient.portal_notifications.filter(facility=facility),
            notification_code, "notification_code", "Notification not found.",
        )
        if not notification.read:
            notification.read = True
            notification.save(update_fields=["read", "updated_at"])
        return Response(build_patient_notification_payload(notification))


class PatientNotificationsReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        link.patient.portal_notifications.filter(facility=facility, read=False).update(
            read=True, updated_at=timezone.now()
        )
        return Response({"detail": "All notifications marked as read."})


# ─── SSE event stream ─────────────────────────────────────────────────────────

class PatientEventStreamView(APIView):
    """
    Server-Sent Events stream for real-time notification delivery.
    Frontend subscribes to /api/v1/patient/events/stream/ and receives
    notification pushes without polling.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        patient = link.patient

        def event_generator():
            last_check = timezone.now()
            yield "data: {}\n\n"   # initial heartbeat
            while True:
                time.sleep(10)
                new_notifications = list(
                    patient.portal_notifications.filter(
                        facility=facility,
                        created_at__gt=last_check,
                    ).order_by("-created_at")
                )
                last_check = timezone.now()
                if new_notifications:
                    payload = json.dumps([build_patient_notification_payload(n) for n in new_notifications])
                    yield f"data: {payload}\n\n"
                else:
                    yield ": heartbeat\n\n"

        response = StreamingHttpResponse(event_generator(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
