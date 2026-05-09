"""
portal_api/appointment_mgmt_views.py
Provider-side booking helper and appointment management endpoints.

Endpoints (all prefixed /api/v1/):
  GET  provider/booking/specialties/                   — specialties in facility
  GET  provider/booking/doctors/?specialty=X           — doctors by specialty
  GET  provider/booking/patients/?q=X                 — patient search
  GET  provider/booking/doctors/<code>/slots/?type=X  — doctor availability slots
  PATCH provider/appointments/<ref>/confirm/           — confirm pending booking
  PATCH provider/appointments/<ref>/reject/            — reject/cancel booking
  PATCH provider/appointments/<ref>/reschedule/        — reschedule
  PATCH provider/appointments/<ref>/assign/            — assign doctor (any status)
  PATCH provider/appointments/<ref>/start/             — start consult (→ in_progress, virtual room)
  PATCH provider/appointments/<ref>/complete/          — complete consult (→ completed)
  GET   provider/appointments/<ref>/meeting-room/      — get meeting room URL (virtual)
"""
from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    BookingSource,
    FacilitySpecialty,
    PatientBooking,
    PatientPortalNotification,
    ProviderAppointment,
    ProviderAvailability,
    ProviderMembership,
    ProviderPortalNotification,
    ProviderProfile,
    ProviderSubRole,
    WorkflowStatus,
    PatientProfile,
)
from portal_api.utils import format_uuid, calculate_age
from portal_api.provider_views import (
    ensure_provider_membership,
    build_appointment_payload,
    get_appointment_or_raise,
    log_provider_activity,
)
from portal_api.patient_booking_views import (
    _expand_slots,
    _next_notification_code,
    _next_provider_notification_code,
    _normalize_type,
    BOOKING_THRESHOLD_MINUTES,
)

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _booking_ref_counter():
    counter = PatientBooking.objects.count() + 1
    while True:
        candidate = f"BKG-{counter:04d}"
        if not PatientBooking.objects.filter(booking_ref=candidate).exists():
            return candidate
        counter += 1


class ProviderBookingSpecialtiesView(APIView):
    """GET /api/v1/provider/booking/specialties/ — facility specialties for booking flow."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        rows = FacilitySpecialty.objects.filter(facility=membership.facility).order_by("name")
        return Response([{"id": format_uuid(s.id), "name": s.name} for s in rows])


class ProviderBookingDoctorsView(APIView):
    """GET /api/v1/provider/booking/doctors/?specialty=X — doctors in facility by specialty."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        specialty = str(request.query_params.get("specialty") or "").strip()

        qs = ProviderProfile.objects.select_related("facility_specialty").filter(
            facility=membership.facility,
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
        provider_ids = [p.id for p in profiles]
        with_slots = {
            row.provider_id
            for row in ProviderAvailability.objects.filter(
                facility=membership.facility, provider_id__in=provider_ids
            )
            if row.slots
        }

        # Build doctor_id (portal uid) for each profile
        from portal_api.provider_views import provider_membership_uid_for_profile
        return Response([
            {
                "provider_code": p.provider_code,
                "doctor_id": provider_membership_uid_for_profile(p, membership.facility),
                "full_name": p.full_name,
                "specialty": (
                    p.specialty
                    or (p.facility_specialty.name if p.facility_specialty else "")
                    or "General Care"
                ),
                "has_slots": p.id in with_slots,
            }
            for p in profiles
        ])


class ProviderBookingPatientSearchView(APIView):
    """GET /api/v1/provider/booking/patients/?q=X — search patients by name/phone/email."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        query = str(request.query_params.get("q") or "").strip()
        if len(query) < 2:
            return Response({"results": []})

        qs = PatientProfile.objects.filter(
            Q(full_name__icontains=query)
            | Q(phone__icontains=query)
            | Q(email__icontains=query)
            | Q(patient_code__icontains=query)
        ).distinct()[:15]

        def _mask_phone(value):
            raw = str(value or "").strip()
            if len(raw) <= 4:
                return raw
            return f"{raw[:2]}***{raw[-2:]}"

        def _mask_email(value):
            raw = str(value or "").strip()
            if "@" not in raw:
                return raw
            local, domain = raw.split("@", 1)
            if len(local) <= 2:
                masked_local = f"{local[:1]}*"
            else:
                masked_local = f"{local[:2]}***"
            return f"{masked_local}@{domain}"

        results = [
            {
                "id": p.patient_code,
                "patient_code": p.patient_code,
                "name": p.full_name,
                "full_name": p.full_name,
                "phone": _mask_phone(p.phone),
                "email": _mask_email(p.email),
                "age": calculate_age(p.date_of_birth),
            }
            for p in qs
        ]
        log_provider_activity(
            request.user,
            membership,
            {
                "module": "Appointments",
                "action": "patient_search_global",
                "detail": (
                    f"query={query}|results={len(results)}"
                    f"|scope=all_patients|facility={membership.facility.facility_code}"
                ),
                "type": "appointments",
            },
        )
        return Response({"results": results})


class ProviderBookingDoctorSlotsView(APIView):
    """GET /api/v1/provider/booking/doctors/<code>/slots/?type=X — doctor availability slots."""
    permission_classes = [IsAuthenticated]

    def get(self, request, provider_code):
        membership = ensure_provider_membership(request.user)
        slot_type = str(request.query_params.get("type") or "").strip()

        provider = ProviderProfile.objects.filter(
            provider_code=provider_code,
            facility=membership.facility,
        ).first()
        if provider is None:
            raise NotFound("Doctor not found.")

        availability = ProviderAvailability.objects.filter(
            provider=provider, facility=membership.facility
        ).first()

        slots = _expand_slots(availability) if availability else []
        if slot_type:
            target = _normalize_type(slot_type)
            slots = [s for s in slots if _normalize_type(s.get("type", "")) == target]

        # Exclude already-booked slots (confirmed PatientBookings for this doctor)
        booked_datetimes = set(
            PatientBooking.objects.filter(
                provider=provider,
                status__in=[WorkflowStatus.CONFIRMED, WorkflowStatus.DRAFT],
                scheduled_for__isnull=False,
            ).values_list("scheduled_for", flat=True)
        )

        def _is_booked(slot_dt_str):
            try:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(slot_dt_str)
                if dt is None:
                    return False
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                for booked in booked_datetimes:
                    if booked is None:
                        continue
                    if timezone.is_naive(booked):
                        booked = timezone.make_aware(booked)
                    # 30-min booking threshold — a 9:00 booking blocks 8:31–9:29
                    # but allows 9:30 and after to be booked.
                    if abs((dt - booked).total_seconds()) < 1800:
                        return True
            except Exception:
                pass
            return False

        available_slots = [s for s in slots if not _is_booked(s.get("datetime", ""))]

        blocked_days = []
        if availability and isinstance(availability.blocked_days, list):
            blocked_days = availability.blocked_days

        return Response({
            "provider_code": provider.provider_code,
            "full_name": provider.full_name,
            "slots": available_slots,
            "blocked_days": blocked_days,
        })


class ProviderAppointmentConfirmView(APIView):
    """PATCH /api/v1/provider/appointments/<ref>/confirm/ — confirm a pending booking."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)

        # Try to find by ProviderAppointment reference first
        appt = ProviderAppointment.objects.select_related(
            "provider", "patient", "facility", "patient_booking"
        ).filter(facility=membership.facility, appointment_ref=appointment_ref).first()

        if appt and appt.patient_booking:
            booking = appt.patient_booking
            appt.status = WorkflowStatus.CONFIRMED
            appt.save(update_fields=["status", "updated_at"])
        elif appt:
            appt.status = WorkflowStatus.CONFIRMED
            appt.save(update_fields=["status", "updated_at"])
            booking = None
        else:
            # Fall back to direct PatientBooking reference
            booking = PatientBooking.objects.filter(
                facility=membership.facility,
                booking_ref=appointment_ref,
            ).first()
            if booking is None:
                raise NotFound("Appointment not found.")
            appt = None

        if booking:
            booking.status = WorkflowStatus.CONFIRMED
            booking.save(update_fields=["status", "updated_at"])
            # Notify patient
            if booking.patient:
                PatientPortalNotification.objects.create(
                    notification_code=_next_notification_code(),
                    patient=booking.patient,
                    facility=booking.facility,
                    kind="appointment",
                    title="Appointment confirmed",
                    body=f"Your appointment {booking.booking_ref} has been confirmed by the clinic.",
                    icon_lib="feather",
                    icon_name="check-circle",
                    read=False,
                )

        if appt:
            return Response(build_appointment_payload(appt))
        return Response({
            "booking_ref": booking.booking_ref,
            "status": booking.status,
            "message": "Appointment confirmed.",
        })


class ProviderAppointmentRejectView(APIView):
    """PATCH /api/v1/provider/appointments/<ref>/reject/ — reject/cancel a pending booking."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        reason = str((request.data or {}).get("reason") or "Rejected by provider").strip()

        appt = ProviderAppointment.objects.select_related(
            "provider", "patient", "facility", "patient_booking"
        ).filter(facility=membership.facility, appointment_ref=appointment_ref).first()

        if appt and appt.patient_booking:
            booking = appt.patient_booking
            appt.status = WorkflowStatus.REJECTED
            appt.notes = (appt.notes or "") + f"\nREJECT|reason={reason}"
            appt.save(update_fields=["status", "notes", "updated_at"])
        elif appt:
            appt.status = WorkflowStatus.REJECTED
            appt.notes = (appt.notes or "") + f"\nREJECT|reason={reason}"
            appt.save(update_fields=["status", "notes", "updated_at"])
            booking = None
        else:
            booking = PatientBooking.objects.filter(
                facility=membership.facility,
                booking_ref=appointment_ref,
            ).first()
            if booking is None:
                raise NotFound("Appointment not found.")
            appt = None

        if booking:
            booking.status = WorkflowStatus.REJECTED
            booking.notes = (booking.notes or "") + f"\nREJECT|reason={reason}"
            booking.save(update_fields=["status", "notes", "updated_at"])
            if booking.patient:
                PatientPortalNotification.objects.create(
                    notification_code=_next_notification_code(),
                    patient=booking.patient,
                    facility=booking.facility,
                    kind="appointment",
                    title="Appointment rejected",
                    body=f"Your appointment request {booking.booking_ref} was rejected: {reason}. You may reschedule.",
                    icon_lib="feather",
                    icon_name="x-circle",
                    read=False,
                )

        if appt:
            return Response(build_appointment_payload(appt))
        return Response({
            "booking_ref": booking.booking_ref,
            "status": booking.status,
            "message": "Appointment rejected.",
        })


class ProviderAppointmentRescheduleView(APIView):
    """PATCH /api/v1/provider/appointments/<ref>/reschedule/ — reschedule to a new time."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_ref):
        from django.utils.dateparse import parse_datetime
        membership = ensure_provider_membership(request.user)
        data = request.data or {}
        new_dt_str = str(data.get("scheduled_for") or data.get("slot_datetime") or "").strip()
        new_type = str(data.get("appointment_type") or "").strip()
        if not new_dt_str:
            raise ValidationError({"scheduled_for": "scheduled_for (ISO datetime) is required."})
        new_dt = parse_datetime(new_dt_str)
        if new_dt is None:
            raise ValidationError({"scheduled_for": "Use ISO format e.g. 2026-06-01T09:00:00."})
        from django.utils import timezone as tz
        if tz.is_naive(new_dt):
            new_dt = tz.make_aware(new_dt)
        if new_dt < tz.now():
            raise ValidationError({"scheduled_for": "New time must be in the future."})

        # Try ProviderAppointment first
        appt = ProviderAppointment.objects.select_related(
            "provider", "patient", "facility", "patient_booking"
        ).filter(facility=membership.facility, appointment_ref=appointment_ref).first()

        booking = None
        # Reschedule rule (per spec): just moves the appointment to a new
        # date/type. Status stays the same EXCEPT pending/draft, which is
        # promoted to confirmed because the provider is implicitly approving
        # the new time. Rejected/cancelled stay rejected/cancelled — the
        # provider can later re-confirm explicitly via the Approve action.
        _promote_to_confirmed = {
            WorkflowStatus.DRAFT, WorkflowStatus.IDLE,
        }
        actor_label = (
            getattr(request.user, "get_full_name", lambda: "")() or
            getattr(request.user, "email", "") or
            "provider"
        )
        audit_line = (
            f"\nRESCHEDULE|by={actor_label}"
            f"|at={tz.now().isoformat(timespec='seconds')}"
            f"|to={new_dt.isoformat(timespec='seconds')}"
            + (f"|type={new_type}" if new_type else "")
        )

        if appt:
            appt.scheduled_for = new_dt
            update_fields = ["scheduled_for", "status", "notes", "updated_at"]
            if new_type:
                appt.appointment_type = new_type
                update_fields.append("appointment_type")
            if appt.status in _promote_to_confirmed:
                appt.status = WorkflowStatus.CONFIRMED
            appt.notes = (appt.notes or "") + audit_line
            appt.save(update_fields=update_fields)
            booking = appt.patient_booking
        else:
            booking = PatientBooking.objects.filter(
                facility=membership.facility,
                booking_ref=appointment_ref,
            ).first()
            if booking is None:
                raise NotFound("Appointment not found.")

        if booking:
            booking.scheduled_for = new_dt
            update_fields = ["scheduled_for", "status", "notes", "updated_at"]
            if new_type:
                booking.appointment_type = new_type
                update_fields.append("appointment_type")
            if booking.status in _promote_to_confirmed:
                booking.status = WorkflowStatus.CONFIRMED
            booking.notes = (booking.notes or "") + audit_line
            booking.save(update_fields=update_fields)
            if booking.patient:
                sched_str = new_dt.strftime("%a, %b %d at %I:%M %p")
                PatientPortalNotification.objects.create(
                    notification_code=_next_notification_code(),
                    patient=booking.patient,
                    facility=booking.facility,
                    kind="appointment",
                    title="Appointment rescheduled",
                    body=f"Your appointment {booking.booking_ref} has been rescheduled to {sched_str}.",
                    icon_lib="feather",
                    icon_name="clock",
                    read=False,
                )

        if appt:
            return Response(build_appointment_payload(appt))
        return Response({
            "booking_ref": booking.booking_ref,
            "scheduled_for": new_dt.isoformat(),
            "status": booking.status,
            "message": "Appointment rescheduled.",
        })


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _create_or_get_room_url(booking):
    """
    Return a meeting room URL for a Virtual booking. If one was already
    issued (booking.daily_room_url), return it; otherwise create one now.
    Falls back to a deterministic Jitsi URL when DAILY_API_KEY isn't set.
    """
    if booking.daily_room_url:
        return booking.daily_room_url
    # Reuse the management-command helper so the URL convention is identical.
    from core.management.commands.send_virtual_meeting_links import (
        _create_daily_room as _create_room,
    )
    url = _create_room(booking.booking_ref)
    booking.daily_room_url = url
    booking.save(update_fields=["daily_room_url", "updated_at"])
    return url


def _is_virtual(appt_or_booking):
    t = (getattr(appt_or_booking, "appointment_type", "") or "").lower().strip()
    return t == "virtual"


def _resolve_appointment(facility, ref):
    """
    Return (appt, booking). Either may be None depending on whether the
    record is a ProviderAppointment or a free-floating PatientBooking.
    Raises NotFound if neither can be located.
    """
    appt = ProviderAppointment.objects.select_related(
        "provider", "patient", "facility", "patient_booking"
    ).filter(facility=facility, appointment_ref=ref).first()
    booking = None
    if appt:
        booking = appt.patient_booking
    else:
        booking = PatientBooking.objects.select_related(
            "patient", "facility", "provider"
        ).filter(facility=facility, booking_ref=ref).first()
        if booking is None:
            raise NotFound("Appointment not found.")
    return appt, booking


# ─── Assign / Re-assign doctor ────────────────────────────────────────────────

class ProviderAppointmentAssignView(APIView):
    """
    PATCH /api/v1/provider/appointments/<ref>/assign/
    Body: { "doctor_id": "<provider-membership-uid OR provider_code>" }

    Assigns a doctor to an existing appointment regardless of status —
    so a provider can fill in missing doctors on past, completed, or
    rejected records (the user's stated requirement).
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        doctor_id = str((request.data or {}).get("doctor_id") or "").strip()
        if not doctor_id:
            raise ValidationError({"doctor_id": "doctor_id is required."})

        # Locate the doctor's ProviderProfile (accept either membership uid or provider_code)
        provider = None
        # Try as membership ID first
        try:
            from portal_api.provider_views import resolve_provider_membership_for_portal_id
            doc_membership = resolve_provider_membership_for_portal_id(
                membership.facility, doctor_id, ProviderSubRole.DOCTOR
            )
            provider = doc_membership.provider
        except Exception:
            # Fall back to provider_code lookup within the facility
            provider = ProviderProfile.objects.filter(
                provider_code=doctor_id, facility=membership.facility
            ).first()
            if provider is None:
                raise NotFound("Doctor not found in this facility.")

        appt, booking = _resolve_appointment(membership.facility, appointment_ref)

        if appt is not None:
            appt.provider = provider
            # Doctor names are sometimes denormalised onto the row — keep in sync.
            try:
                appt.patient_phone = appt.patient_phone  # no-op trigger
            except Exception:
                pass
            appt.save(update_fields=["provider", "updated_at"])
        if booking is not None:
            booking.provider = provider
            booking.provider_name = provider.full_name
            booking.provider_specialty = (
                provider.specialty
                or (provider.facility_specialty.name if provider.facility_specialty else "")
                or "General Care"
            )
            booking.save(update_fields=["provider", "provider_name", "provider_specialty", "updated_at"])

            # Notify patient
            if booking.patient:
                PatientPortalNotification.objects.create(
                    notification_code=_next_notification_code(),
                    patient=booking.patient,
                    facility=booking.facility,
                    kind="appointment",
                    title="Doctor assigned",
                    body=(
                        f"Dr. {provider.full_name} has been assigned to your appointment "
                        f"{booking.booking_ref}."
                    ),
                    icon_lib="feather",
                    icon_name="user-check",
                    read=False,
                )

        if appt:
            appt.refresh_from_db()
            return Response(build_appointment_payload(appt))
        return Response({
            "booking_ref": booking.booking_ref,
            "doctor_name": provider.full_name,
            "provider_code": provider.provider_code,
            "message": "Doctor assigned.",
        })


# ─── Start consult (→ in_progress, virtual room) ──────────────────────────────

class ProviderAppointmentStartView(APIView):
    """
    PATCH /api/v1/provider/appointments/<ref>/start/
    Marks the appointment as IN_PROGRESS. For Virtual visits, returns a
    meeting room URL (creating one on the fly if the management command
    hasn't already issued one).
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        appt, booking = _resolve_appointment(membership.facility, appointment_ref)

        # Both records must have a doctor before consult can start
        target_provider_id = (
            (appt.provider_id if appt else None)
            or (booking.provider_id if booking else None)
        )
        if target_provider_id is None:
            raise ValidationError({
                "doctor_id": "Assign a doctor before starting the consultation."
            })

        if appt is not None:
            appt.status = WorkflowStatus.IN_PROGRESS
            appt.save(update_fields=["status", "updated_at"])
        if booking is not None:
            booking.status = WorkflowStatus.IN_PROGRESS
            booking.save(update_fields=["status", "updated_at"])

        # Build response. For virtual: return room URL.
        room_url = None
        is_virt = False
        if appt is not None:
            is_virt = _is_virtual(appt) or (booking and _is_virtual(booking))
        elif booking is not None:
            is_virt = _is_virtual(booking)

        if is_virt and booking is not None:
            try:
                room_url = _create_or_get_room_url(booking)
            except Exception as exc:
                # Don't fail the start — just return without a URL.
                room_url = None

        # Notify patient: consult started
        if booking is not None and booking.patient is not None:
            body = "Your consultation has started."
            if is_virt and room_url:
                body += f" Join: {room_url}"
            PatientPortalNotification.objects.create(
                notification_code=_next_notification_code(),
                patient=booking.patient,
                facility=booking.facility,
                kind="appointment",
                title="Consultation started",
                body=body,
                icon_lib="feather",
                icon_name="play-circle",
                read=False,
            )

        if appt is not None:
            appt.refresh_from_db()
            payload = build_appointment_payload(appt)
            payload["room_url"] = room_url
            payload["is_virtual"] = is_virt
            return Response(payload)
        return Response({
            "booking_ref": booking.booking_ref,
            "status": "in_progress",
            "is_virtual": is_virt,
            "room_url": room_url,
            "message": "Consultation started.",
        })


# ─── Complete consult (→ completed) ───────────────────────────────────────────

class ProviderAppointmentCompleteView(APIView):
    """PATCH /api/v1/provider/appointments/<ref>/complete/ — mark as completed."""
    permission_classes = [IsAuthenticated]

    def patch(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        appt, booking = _resolve_appointment(membership.facility, appointment_ref)

        if appt is not None:
            appt.status = WorkflowStatus.COMPLETED
            appt.save(update_fields=["status", "updated_at"])
        if booking is not None:
            booking.status = WorkflowStatus.COMPLETED
            booking.save(update_fields=["status", "updated_at"])
            if booking.patient:
                PatientPortalNotification.objects.create(
                    notification_code=_next_notification_code(),
                    patient=booking.patient,
                    facility=booking.facility,
                    kind="appointment",
                    title="Consultation completed",
                    body=f"Your consultation {booking.booking_ref} is complete.",
                    icon_lib="feather",
                    icon_name="check-circle",
                    read=False,
                )

        if appt is not None:
            appt.refresh_from_db()
            return Response(build_appointment_payload(appt))
        return Response({
            "booking_ref": booking.booking_ref,
            "status": "completed",
            "message": "Consultation completed.",
        })


# ─── Provider meeting room (virtual) ─────────────────────────────────────────

class ProviderAppointmentMeetingRoomView(APIView):
    """
    GET /api/v1/provider/appointments/<ref>/meeting-room/
    Returns the same Daily/Jitsi URL the patient sees, creating one if
    necessary. Provider can therefore "join" the same room.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        appt, booking = _resolve_appointment(membership.facility, appointment_ref)
        if booking is None:
            raise NotFound("This appointment has no patient booking, so no meeting room exists.")
        if not _is_virtual(booking) and not (appt and _is_virtual(appt)):
            raise ValidationError({"detail": "This appointment is not a virtual visit."})
        try:
            room_url = _create_or_get_room_url(booking)
        except Exception as exc:
            return Response({"room_url": None, "error": str(exc)}, status=502)
        return Response({
            "appointment_ref": appointment_ref,
            "booking_ref": booking.booking_ref,
            "room_url": room_url,
            "scheduled_for": booking.scheduled_for.isoformat() if booking.scheduled_for else None,
        })
