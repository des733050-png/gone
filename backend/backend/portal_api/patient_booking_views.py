"""
portal_api/patient_booking_views.py
Patient-facing booking discovery and appointment creation endpoints.

Endpoints (all prefixed /api/v1/):
  GET  patient/specialties/                     — list specialties available in facility
  GET  patient/doctors/?specialty=X             — list doctors for a specialty
  GET  patient/doctors/<provider_code>/slots/   — get available time slots
  POST patient/appointments/create/             — create a new booking
  GET  patient/appointments/<ref>/meeting-room/ — get Daily.co meeting room URL
"""
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    BookingSource,
    Facility,
    FacilitySpecialty,
    PatientBooking,
    PatientPortalNotification,
    ProviderAvailability,
    ProviderMembership,
    ProviderPortalNotification,
    ProviderProfile,
    ProviderSubRole,
    WorkflowStatus,
)
from portal_api.patient_views import get_active_patient_context_or_raise
from portal_api.utils import (
    build_patient_appointment_payload,
    format_currency,
    format_uuid,
)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Accept full names or common abbreviations (seed data / UI may use either).
SLOT_DAY_TO_WEEKDAY = {
    "monday": 0,
    "mon": 0,
    "tuesday": 1,
    "tue": 1,
    "tues": 1,
    "wednesday": 2,
    "wed": 2,
    "thursday": 3,
    "thu": 3,
    "thur": 3,
    "thurs": 3,
    "friday": 4,
    "fri": 4,
    "saturday": 5,
    "sat": 5,
    "sunday": 6,
    "sun": 6,
}
SLOT_HORIZON_WEEKS = 8


def _slot_day_to_weekday(day_name):
    if not day_name:
        return None
    key = str(day_name).strip().lower()
    if key in SLOT_DAY_TO_WEEKDAY:
        return SLOT_DAY_TO_WEEKDAY[key]
    try:
        return DAYS.index(day_name)
    except ValueError:
        return None


def _next_booking_ref():
    counter = PatientBooking.objects.count() + 1
    while True:
        candidate = f"BKG-{counter:04d}"
        if not PatientBooking.objects.filter(booking_ref=candidate).exists():
            return candidate
        counter += 1


def _next_notification_code():
    counter = PatientPortalNotification.objects.count() + 1
    while True:
        candidate = f"pn-{counter:04d}"
        if not PatientPortalNotification.objects.filter(notification_code=candidate).exists():
            return candidate
        counter += 1


def _next_provider_notification_code():
    counter = ProviderPortalNotification.objects.count() + 1
    while True:
        candidate = f"pvn-{counter:04d}"
        if not ProviderPortalNotification.objects.filter(notification_code=candidate).exists():
            return candidate
        counter += 1


SLOT_GRANULARITY_MINUTES = 30  # bookable increment within each availability window
BOOKING_THRESHOLD_MINUTES = 30  # minimum gap between two bookings on the same doctor


def _normalize_type(value):
    """
    Canonicalise an appointment type so the slot filter matches regardless of
    how the value was saved. Returns lowercase, underscore-separated. Legacy
    'chat' / 'chat_text' / 'text' aliases are mapped to 'virtual'.
    """
    s = str(value or "").strip().lower()
    out = []
    last_us = False
    for ch in s:
        if ch in (" ", "-", "_", "\t", "/"):
            if not last_us and out:
                out.append("_")
                last_us = True
        else:
            out.append(ch)
            last_us = False
    canon = "".join(out).strip("_")
    # Legacy aliases
    if canon in {"chat", "text", "chat_text", "video", "virtual_visit"}:
        return "virtual"
    return canon


def _parse_hhmm(value):
    """Parse 'HH:MM' (24-hour) into (hour, minute) or None."""
    try:
        parts = str(value or "").split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        if 0 <= h <= 23 and 0 <= m <= 59:
            return h, m
    except (ValueError, IndexError, AttributeError):
        pass
    return None


def _expand_slots(availability, weeks=SLOT_HORIZON_WEEKS):
    """
    Expand each availability window into concrete bookable datetimes at
    SLOT_GRANULARITY_MINUTES (30-min) increments.

    A slot stored as {day:'Mon', start:'09:00', end:'12:00'} produces:
      09:00, 09:30, 10:00, 10:30, 11:00, 11:30  (each on the next N Mondays)

    Slots in the doctor's blocked_days are skipped entirely. The slot 'type'
    is preserved on every emitted bookable time so the patient can filter.
    """
    today = timezone.localdate()
    blocked_days = set(availability.blocked_days or [])
    results = []
    for slot in (availability.slots or []):
        day_name = slot.get("day", "")
        if not day_name or day_name in blocked_days:
            continue
        start = _parse_hhmm(slot.get("start", ""))
        end = _parse_hhmm(slot.get("end", "")) or start
        slot_type = slot.get("type", "In Facility")
        slot_id = slot.get("id", "")
        if start is None:
            continue

        day_index = _slot_day_to_weekday(day_name)
        if day_index is None:
            continue

        sh, sm = start
        eh, em = end
        # If end is missing or before start, fall back to a single 30-min slot
        if (eh, em) <= (sh, sm):
            eh, em = sh, sm + SLOT_GRANULARITY_MINUTES

        # Walk forward finding matching weekdays
        current = today
        weeks_found = 0
        max_days = weeks * 14 + 21
        days_walked = 0
        while weeks_found < weeks and days_walked < max_days:
            if current.weekday() == day_index:
                # Emit all 30-min increments within [start, end)
                cur_h, cur_m = sh, sm
                normalized_type = _normalize_type(slot_type)
                while (cur_h, cur_m) < (eh, em):
                    dt = timezone.make_aware(
                        datetime(current.year, current.month, current.day, cur_h, cur_m)
                    )
                    if dt > timezone.now():
                        time_disp = dt.strftime("%I:%M %p").lstrip("0").replace(" 0", " ")
                        results.append({
                            "slot_id": f"{slot_id}-{cur_h:02d}{cur_m:02d}" if slot_id else f"{day_name}-{cur_h:02d}{cur_m:02d}",
                            "day": day_name,
                            "datetime": dt.isoformat(),
                            "date": current.isoformat(),
                            "time": time_disp,
                            "start": time_disp,
                            "display_time": time_disp,
                            "date_label": f"{dt.strftime('%a, %b')} {dt.day}",
                            "type": normalized_type,
                            "type_raw": slot_type,
                        })
                    cur_m += SLOT_GRANULARITY_MINUTES
                    if cur_m >= 60:
                        cur_h += cur_m // 60
                        cur_m = cur_m % 60
                weeks_found += 1
            current += timedelta(days=1)
            days_walked += 1
    results.sort(key=lambda s: s["datetime"])
    return results


def _fan_out_provider_notification(facility, patient, booking):
    """Notify all doctors + facility admins + superusers about a new booking."""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    memberships = ProviderMembership.objects.select_related("user", "facility").filter(
        facility=facility,
        is_active=True,
        role__in=[ProviderSubRole.DOCTOR, ProviderSubRole.FACILITY_ADMIN],
    )
    notified_user_ids = set()
    for membership in memberships:
        if membership.user_id in notified_user_ids:
            continue
        notified_user_ids.add(membership.user_id)
        ProviderPortalNotification.objects.create(
            notification_code=_next_provider_notification_code(),
            user=membership.user,
            facility=facility,
            title="New appointment booked",
            message=f"{patient.full_name} booked {booking.booking_ref} — {booking.service_type or 'Consultation'}.",
            icon_lib="feather",
            icon_name="calendar",
            color="primary",
        )

    for superuser in User.objects.filter(is_superuser=True, is_active=True):
        if superuser.pk in notified_user_ids:
            continue
        ProviderPortalNotification.objects.create(
            notification_code=_next_provider_notification_code(),
            user=superuser,
            facility=facility,
            title="New appointment booked",
            message=f"{patient.full_name} booked {booking.booking_ref}.",
            icon_lib="feather",
            icon_name="calendar",
            color="primary",
        )


def _notify_patient(patient, facility, booking, title=None, body=None):
    PatientPortalNotification.objects.create(
        notification_code=_next_notification_code(),
        patient=patient,
        facility=facility,
        kind="appointment",
        title=title or "Appointment booked",
        body=body or f"Your appointment {booking.booking_ref} has been scheduled.",
        icon_lib="feather",
        icon_name="calendar-check",
        read=False,
    )


def _create_daily_room(booking_ref):
    """
    DEPRECATED — use the send_virtual_meeting_links management command instead.
    Kept only as a fallback reference; no longer called in request/response cycle.
    The management command in core.management.commands.send_virtual_meeting_links
    handles room creation and stores the URL on PatientBooking.daily_room_url.
    """
    raise NotImplementedError(
        "Call send_virtual_meeting_links management command, not _create_daily_room directly."
    )


class PatientSpecialtiesView(APIView):
    """GET /api/v1/patient/specialties/ — deduplicated specialties across all facilities."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        get_active_patient_context_or_raise(request)
        # Collect from FacilitySpecialty catalog (all facilities)
        catalog = set(
            FacilitySpecialty.objects.values_list("name", flat=True)
        )
        # Also include specialty field on confirmed doctors across all facilities
        from_doctors = ProviderProfile.objects.filter(
            memberships__is_active=True,
            memberships__role=ProviderSubRole.DOCTOR,
            status=WorkflowStatus.CONFIRMED,
        ).values_list("specialty", flat=True)
        for s in from_doctors:
            if s:
                catalog.add(s)
        specialties = sorted(catalog - {""}, key=str.casefold)
        return Response(specialties)


class PatientDoctorsView(APIView):
    """GET /api/v1/patient/doctors/?specialty=X — list doctors for a specialty (all facilities)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        get_active_patient_context_or_raise(request)
        specialty = str(request.query_params.get("specialty") or "").strip()

        qs = ProviderProfile.objects.select_related("facility", "facility_specialty").filter(
            memberships__is_active=True,
            memberships__role=ProviderSubRole.DOCTOR,
            status=WorkflowStatus.CONFIRMED,
        ).distinct()

        if specialty:
            qs = qs.filter(
                Q(specialty__iexact=specialty)
                | Q(facility_specialty__name__iexact=specialty)
            )

        profiles = list(qs.order_by("full_name"))
        if not profiles:
            return Response([])

        provider_ids = [p.id for p in profiles]
        with_slots = {
            row.provider_id
            for row in ProviderAvailability.objects.filter(provider_id__in=provider_ids)
            if row.slots
        }

        return Response(
            [
                {
                    "provider_code": p.provider_code,
                    "full_name": p.full_name,
                    "specialty": (
                        p.specialty
                        or (p.facility_specialty.name if p.facility_specialty else "")
                        or "General Care"
                    ),
                    "facility_name": p.facility.name if p.facility else "",
                    "license": p.license_number,
                    "experience_years": p.years_experience,
                    "bio": p.bio,
                    "has_slots": p.id in with_slots,
                }
                for p in profiles
            ]
        )


class PatientDoctorSlotsView(APIView):
    """GET /api/v1/patient/doctors/<provider_code>/slots/?type=X — available slots."""
    permission_classes = [IsAuthenticated]

    def get(self, request, provider_code):
        get_active_patient_context_or_raise(request)
        slot_type = str(request.query_params.get("type") or "").strip()

        provider = ProviderProfile.objects.filter(
            provider_code=provider_code,
            status=WorkflowStatus.CONFIRMED,
        ).first()
        if provider is None:
            raise NotFound("Doctor not found.")

        availability = ProviderAvailability.objects.filter(
            provider=provider, facility=provider.facility
        ).first()

        slots = _expand_slots(availability) if availability else []
        if slot_type:
            target = _normalize_type(slot_type)
            slots = [s for s in slots if _normalize_type(s.get("type", "")) == target]

        # Filter out times within 30 min of an existing CONFIRMED/DRAFT booking
        booked_datetimes = list(
            PatientBooking.objects.filter(
                provider=provider,
                status__in=[WorkflowStatus.CONFIRMED, WorkflowStatus.DRAFT],
                scheduled_for__isnull=False,
            ).values_list("scheduled_for", flat=True)
        )

        def _is_taken(slot_iso):
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(slot_iso) if slot_iso else None
            if dt is None:
                return False
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt)
            for b in booked_datetimes:
                if b is None:
                    continue
                if timezone.is_naive(b):
                    b = timezone.make_aware(b)
                if abs((dt - b).total_seconds()) < BOOKING_THRESHOLD_MINUTES * 60:
                    return True
            return False

        slots = [s for s in slots if not _is_taken(s.get("datetime", ""))]

        blocked_days = []
        if availability and isinstance(availability.blocked_days, list):
            blocked_days = availability.blocked_days

        return Response({
            "provider_code": provider.provider_code,
            "full_name": provider.full_name,
            "slots": slots,
            "blocked_days": blocked_days,
        })


class PatientBookingCreateView(APIView):
    """POST /api/v1/patient/appointments/create/ — create a new booking."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        link, facility, _ = get_active_patient_context_or_raise(request)
        data = request.data or {}
        patient = link.patient

        provider_code = str(data.get("provider_code") or "").strip()
        slot_datetime_str = str(data.get("slot_datetime") or "").strip()
        service_type = str(data.get("service_type") or "Consultation").strip()
        appointment_type = str(data.get("service_type_detail") or data.get("appointment_type") or "In Facility").strip()
        notes = str(data.get("notes") or "").strip()

        if not slot_datetime_str:
            raise ValidationError({"slot_datetime": "slot_datetime is required (ISO format)."})

        from django.utils.dateparse import parse_datetime
        scheduled_for = parse_datetime(slot_datetime_str)
        if scheduled_for is None:
            raise ValidationError({"slot_datetime": "Use ISO datetime format e.g. 2026-05-10T09:00:00."})
        if timezone.is_naive(scheduled_for):
            scheduled_for = timezone.make_aware(scheduled_for)

        if scheduled_for < timezone.now() + timedelta(minutes=BOOKING_THRESHOLD_MINUTES):
            raise ValidationError({"slot_datetime": "Appointment must be at least 30 minutes in the future."})

        # Double-booking check — patient. Uses 30-min threshold (exclusive at edges)
        # so a 9:00 booking blocks 8:31–9:29 but allows 9:30 and after.
        threshold = timedelta(minutes=BOOKING_THRESHOLD_MINUTES)
        patient_clash = PatientBooking.objects.filter(
            patient=patient,
            status__in=[WorkflowStatus.CONFIRMED, WorkflowStatus.DRAFT],
            scheduled_for__gt=scheduled_for - threshold,
            scheduled_for__lt=scheduled_for + threshold,
        ).exists()
        if patient_clash:
            raise ValidationError({"slot_datetime": "You already have an appointment within 30 minutes of this slot."})

        provider = None
        provider_name = ""
        provider_specialty = ""

        if provider_code:
            # Cross-facility lookup: patient can book any confirmed doctor by code
            provider = ProviderProfile.objects.filter(
                provider_code=provider_code,
                status=WorkflowStatus.CONFIRMED,
            ).first()
            if provider is None:
                raise NotFound("Doctor not found.")
            provider_name = provider.full_name
            provider_specialty = (
                provider.specialty
                or (provider.facility_specialty.name if provider.facility_specialty else "")
                or "General Care"
            )

            # Double-booking check — doctor. 30-min exclusive threshold.
            doctor_clash = PatientBooking.objects.filter(
                provider=provider,
                status__in=[WorkflowStatus.CONFIRMED, WorkflowStatus.DRAFT],
                scheduled_for__gt=scheduled_for - threshold,
                scheduled_for__lt=scheduled_for + threshold,
            ).exists()
            if doctor_clash:
                raise ValidationError({"slot_datetime": "This doctor is already booked within 30 minutes of this slot."})

        booking = PatientBooking.objects.create(
            booking_ref=_next_booking_ref(),
            patient=patient,
            facility=provider.facility if provider else facility,
            provider=provider,
            status=WorkflowStatus.DRAFT,
            source="patient",
            service_type=service_type,
            appointment_type=appointment_type,
            provider_name=provider_name,
            provider_specialty=provider_specialty,
            scheduled_for=scheduled_for,
            notes=notes,
            fee_amount=0,
        )

        _notify_patient(
            patient,
            booking.facility,
            booking,
            title="Appointment request sent",
            body=f"Your appointment request {booking.booking_ref} is pending confirmation.",
        )
        _fan_out_provider_notification(booking.facility, patient, booking)

        consultation = booking.consultations.order_by("-consulted_at").first()
        return Response(build_patient_appointment_payload(booking, consultation), status=201)


class PatientMeetingRoomView(APIView):
    """
    GET /api/v1/patient/appointments/<ref>/meeting-room/

    Returns the stored Daily.co room URL for a Virtual appointment.
    The URL is only available once send_virtual_meeting_links has run
    (≈ 5 minutes before the scheduled time).

    Rules:
      - appointment_type must be 'Virtual'
      - status must be confirmed or in_progress
      - URL is served from daily_room_url (set by the management command)
      - If called too early (> 10 min before), returns 'not_ready' with time_until
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_ref):
        link, facility, _ = get_active_patient_context_or_raise(request)
        try:
            booking = link.patient.bookings.filter(facility=facility).get(booking_ref=booking_ref)
        except PatientBooking.DoesNotExist:
            raise NotFound("Appointment not found.")

        if not booking.is_virtual:
            raise ValidationError({
                "detail": "This appointment is not a virtual visit. "
                          "For In Facility appointments, attend at the clinic location. "
                          "For Home Visits, the doctor will come to you."
            })

        if booking.status not in {WorkflowStatus.CONFIRMED, WorkflowStatus.IN_PROGRESS}:
            raise ValidationError({"detail": "Meeting room is only available for confirmed appointments."})

        now = timezone.now()
        scheduled = booking.scheduled_for

        # Too far in the future — link not generated yet
        if scheduled and (scheduled - now) > timedelta(minutes=10):
            minutes_until = int((scheduled - now).total_seconds() / 60)
            return Response({
                "booking_ref": booking.booking_ref,
                "status": "not_ready",
                "message": f"Your meeting link will be sent {minutes_until} minutes before the appointment.",
                "room_url": None,
            })

        # Meeting already ended (> 90 min past scheduled time)
        if scheduled and (now - scheduled) > timedelta(minutes=90):
            return Response({
                "booking_ref": booking.booking_ref,
                "status": "expired",
                "message": "This meeting has ended.",
                "room_url": None,
            })

        # URL ready — return stored URL (may still be None if command hasn't run yet)
        room_url = booking.daily_room_url
        return Response({
            "booking_ref": booking.booking_ref,
            "status": "ready" if room_url else "pending",
            "room_url": room_url,
            "message": (
                "Your meeting link is ready." if room_url
                else "Your meeting link is being prepared. Please check back shortly."
            ),
        })


class PatientAppointmentRescheduleView(APIView):
    """
    PATCH /api/v1/patient/appointments/<ref>/reschedule/

    Patient reschedules their own appointment.
    - Allowed when status is confirmed, rejected, or draft.
    - Rescheduled appointment goes back to draft (awaiting provider re-confirmation).
    - Cannot reschedule to a past time or within 1 hour.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, booking_ref):
        from django.utils.dateparse import parse_datetime
        link, facility, _ = get_active_patient_context_or_raise(request)
        patient = link.patient

        try:
            booking = patient.bookings.filter(facility=facility).get(booking_ref=booking_ref)
        except PatientBooking.DoesNotExist:
            raise NotFound("Appointment not found.")

        if booking.status in {WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED}:
            raise ValidationError({"detail": "Cannot reschedule a completed or cancelled appointment."})

        data = request.data or {}
        new_dt_str = str(data.get("slot_datetime") or data.get("scheduled_for") or "").strip()
        if not new_dt_str:
            raise ValidationError({"slot_datetime": "slot_datetime (ISO datetime) is required."})

        new_dt = parse_datetime(new_dt_str)
        if new_dt is None:
            raise ValidationError({"slot_datetime": "Use ISO format e.g. 2026-06-01T09:00:00."})
        if timezone.is_naive(new_dt):
            new_dt = timezone.make_aware(new_dt)
        if new_dt < timezone.now() + timedelta(minutes=BOOKING_THRESHOLD_MINUTES):
            raise ValidationError({"slot_datetime": "New time must be at least 30 minutes in the future."})

        # Double-booking check for patient — 30-min exclusive threshold
        threshold = timedelta(minutes=BOOKING_THRESHOLD_MINUTES)
        clash = PatientBooking.objects.filter(
            patient=patient,
            status__in=[WorkflowStatus.CONFIRMED, WorkflowStatus.DRAFT],
            scheduled_for__gt=new_dt - threshold,
            scheduled_for__lt=new_dt + threshold,
        ).exclude(booking_ref=booking_ref).exists()
        if clash:
            raise ValidationError({"slot_datetime": "You already have an appointment within 30 minutes of this slot."})

        old_status = booking.status
        booking.scheduled_for = new_dt
        # Rescheduled by patient → back to draft (needs provider re-confirmation)
        booking.status = WorkflowStatus.DRAFT
        new_type = str(data.get("appointment_type") or "").strip()
        update_fields = ["scheduled_for", "status", "updated_at"]
        if new_type:
            booking.appointment_type = new_type
            update_fields.append("appointment_type")
        booking.save(update_fields=update_fields)

        # Notify patient of successful reschedule
        sched_str = new_dt.strftime("%a, %b %d at %I:%M %p")
        PatientPortalNotification.objects.create(
            notification_code=_next_notification_code(),
            patient=patient,
            facility=facility,
            kind="appointment",
            title="Appointment rescheduled",
            body=f"Your appointment {booking.booking_ref} has been rescheduled to {sched_str}. Awaiting confirmation.",
            icon_lib="feather",
            icon_name="clock",
            read=False,
        )

        consultation = booking.consultations.order_by("-consulted_at").first()
        from portal_api.utils import build_patient_appointment_payload
        return Response(build_patient_appointment_payload(booking, consultation))
