# FILE: backend/portal_api/utils.py
# COMPLETE MERGED FILE
#
# Merge sources:
#   - Our patched utils.py (full appointment payload, notification payload,
#     records sections, all format helpers)
#   - V2's utils.py (verification helpers, build_provider_verification_payload,
#     is_provider_verified, ACCESS_* constants)
#
# Result: full superset of both — nothing dropped.

from datetime import date, timedelta
from decimal import Decimal
import re

from django.utils import timezone

from core.models import (
    PatientFacilityAccess,
    PatientPortalOrderStatus,
    ProviderMembership,
    ProviderVerificationStatus,
    ProviderVerificationSubmission,
    RiderFacilityAccess,
    WorkflowStatus,
)


# ─── Constants ────────────────────────────────────────────────────────────────

PATIENT_RECORD_STYLES = {
    "consultation": {"type": "Consultation", "icon": "stethoscope", "color": "#1A6FE8"},
    "prescription": {"type": "Prescription", "icon": "pill",        "color": "#1A6FE8"},
    "diagnostic":   {"type": "Lab Result",   "icon": "flask-outline", "color": "#06B6D4"},
}

PATIENT_FACILITY_SESSION_KEY = "patient_active_facility_id"
RIDER_FACILITY_SESSION_KEY   = "rider_active_facility_id"
STAFF_FACILITY_SESSION_KEY   = "staff_active_facility_id"

# V2 verification access constants
ACCESS_FULL        = "FULL"
ACCESS_RESTRICTED  = "RESTRICTED"
VERIFICATION_UNVERIFIED = "UNVERIFIED"


# ─── General helpers ─────────────────────────────────────────────────────────

def calculate_age(date_of_birth):
    if not date_of_birth:
        return None
    today = date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )


def format_joined_label(joined_at):
    return joined_at.strftime("%b %Y")


def normalize_kenya_phone(value):
    """
    Normalize a Kenyan phone number to E.164 (+2547XXXXXXXX or +2541XXXXXXXX).
    Accepts inputs like:
      0712345678   ->  +254712345678
      0112345678   ->  +254112345678
      254712345678 ->  +254712345678
      +254712345678 (already E.164) -> unchanged
      712345678    ->  +254712345678 (assume KE mobile prefix)
    Returns the normalized string. Raises ValueError if it can't be parsed
    into a plausible Kenyan mobile number.
    """
    if value is None:
        return ""
    raw = str(value).strip()
    if not raw:
        return ""
    # Strip everything except leading + and digits
    digits = "".join(ch for ch in raw if ch.isdigit())
    if raw.startswith("+"):
        candidate = "+" + digits
    elif digits.startswith("254"):
        candidate = "+" + digits
    elif digits.startswith("0"):
        candidate = "+254" + digits[1:]
    elif digits.startswith("7") or digits.startswith("1"):
        candidate = "+254" + digits
    else:
        candidate = "+" + digits
    # Kenya mobile is +254 followed by 9 digits starting with 7 or 1
    body = candidate[1:]
    if not body.startswith("254") or len(body) != 12 or body[3] not in ("7", "1"):
        raise ValueError(
            "Phone must be a valid Kenyan mobile, e.g. 0712345678 or +254712345678."
        )
    return candidate


def sanitize_freeform_text(value, max_len=500):
    """Trim, collapse internal whitespace, and clamp length for freeform text."""
    if value is None:
        return ""
    s = " ".join(str(value).split())
    return s[:max_len]


def split_name(user, fallback_full_name=""):
    first_name = (user.first_name or "").strip()
    last_name  = (user.last_name  or "").strip()
    if first_name or last_name:
        return first_name, last_name
    fallback = (fallback_full_name or "").strip()
    if not fallback:
        return "", ""
    parts = fallback.split()
    if len(parts) == 1:
        return parts[0], ""
    return " ".join(parts[:-1]), parts[-1]


def format_uuid(value):
    return str(value) if value else None


def build_facility_payload(facility):
    if facility is None:
        return None
    return {
        "id":   format_uuid(facility.id),
        "code": facility.facility_code,
        "name": facility.name,
    }


# ─── Provider verification helpers (from v2) ─────────────────────────────────

def get_provider_verification_submission(facility):
    """Returns the most recent verification submission for a facility, or None."""
    if facility is None:
        return None
    return (
        ProviderVerificationSubmission.objects.filter(facility=facility)
        .order_by("-created_at")
        .first()
    )


def build_provider_verification_payload(facility):
    """
    Returns a dict describing the facility's verification status.
    Included in build_provider_payload() and build_session_payload() for staff.
    """
    submission = get_provider_verification_submission(facility)
    if submission is None:
        status           = VERIFICATION_UNVERIFIED
        reviewed_at      = None
        rejection_reason = ""
    else:
        status           = submission.status
        reviewed_at      = submission.reviewed_at.isoformat() if submission.reviewed_at else None
        rejection_reason = submission.rejection_reason

    # Collect all documents uploaded for this facility (latest per doc type).
    submitted_types = []
    submitted_names = {}
    if facility is not None:
        from core.models import ProviderVerificationDocument
        seen = set()
        docs = (
            ProviderVerificationDocument.objects
            .filter(submission__facility=facility)
            .order_by("-created_at")
            .select_related("submission")
        )
        for doc in docs:
            if doc.document_type not in seen:
                seen.add(doc.document_type)
                submitted_types.append(doc.document_type)
                submitted_names[doc.document_type] = doc.original_filename

    return {
        "verification_status": status,
        "access": (
            ACCESS_FULL
            if status == ProviderVerificationStatus.VERIFIED
            else ACCESS_RESTRICTED
        ),
        # PENDING is included so providers can add/replace documents while
        # their submission is awaiting review (e.g. they only uploaded 1 of 4
        # required files before closing the tab, or they want to update a doc
        # before the admin has finished reviewing).
        "can_upload_verification_documents": status in {
            VERIFICATION_UNVERIFIED,
            ProviderVerificationStatus.REJECTED,
            ProviderVerificationStatus.PENDING,
        },
        "reviewed_at":               reviewed_at,
        "rejection_reason":          rejection_reason,
        "submitted_document_types":  submitted_types,
        "submitted_document_names":  submitted_names,
    }


def is_provider_verified(facility):
    """Quick boolean check — used by ensure_provider_membership()."""
    return (
        build_provider_verification_payload(facility)["verification_status"]
        == ProviderVerificationStatus.VERIFIED
    )


# ─── Facility context helpers ─────────────────────────────────────────────────

def get_staff_membership(user):
    if not user.is_authenticated or user.is_superuser:
        return None
    return (
        user.provider_memberships.select_related("facility", "provider")
        .filter(is_active=True)
        .order_by("created_at")
        .first()
    )


def get_patient_link(user):
    try:
        link = user.patient_link
    except Exception:
        return None
    return link if link.is_active else None


def get_rider_link(user):
    try:
        link = user.rider_link
    except Exception:
        return None
    return link if link.is_active else None


def get_patient_active_facility(link, session_facility_id=None):
    access_rows = list(
        PatientFacilityAccess.objects.select_related("facility")
        .filter(patient=link.patient, is_active=True)
    )
    if not access_rows:
        return link.default_facility, []
    facility_map = {format_uuid(item.facility_id): item for item in access_rows}
    if session_facility_id and session_facility_id in facility_map:
        chosen = facility_map[session_facility_id]
    else:
        chosen = next((item for item in access_rows if item.is_default), access_rows[0])
    return chosen.facility, access_rows


def get_rider_active_facility(link, session_facility_id=None):
    access_rows = list(
        RiderFacilityAccess.objects.select_related("facility")
        .filter(rider=link.rider, is_active=True)
    )
    if not access_rows:
        return link.default_facility, []
    facility_map = {format_uuid(item.facility_id): item for item in access_rows}
    if session_facility_id and session_facility_id in facility_map:
        chosen = facility_map[session_facility_id]
    else:
        chosen = next((item for item in access_rows if item.is_default), access_rows[0])
    return chosen.facility, access_rows


def set_patient_active_facility(request, facility):
    request.session[PATIENT_FACILITY_SESSION_KEY] = format_uuid(facility.id) if facility else None


def set_rider_active_facility(request, facility):
    request.session[RIDER_FACILITY_SESSION_KEY] = format_uuid(facility.id) if facility else None


def set_staff_active_facility(request, facility):
    request.session[STAFF_FACILITY_SESSION_KEY] = format_uuid(facility.id) if facility else None


def prime_user_facility_context(request, user):
    staff_membership = get_staff_membership(user)
    if staff_membership:
        set_staff_active_facility(request, staff_membership.facility)

    patient_link = get_patient_link(user)
    if patient_link:
        patient_facility, _ = get_patient_active_facility(
            patient_link, request.session.get(PATIENT_FACILITY_SESSION_KEY)
        )
        set_patient_active_facility(request, patient_facility)

    rider_link = get_rider_link(user)
    if rider_link:
        rider_facility, _ = get_rider_active_facility(
            rider_link, request.session.get(RIDER_FACILITY_SESSION_KEY)
        )
        set_rider_active_facility(request, rider_facility)


# ─── Session / principal payloads ────────────────────────────────────────────

def build_session_payload(user, request=None):
    active_facility      = None
    accessible_facilities = []
    role          = None
    principal_type = "user"
    principal_id  = None

    if user.is_superuser:
        principal_type = "superuser"
    else:
        staff_membership = get_staff_membership(user)
        if staff_membership:
            principal_type = "staff"
            principal_id   = format_uuid(staff_membership.id)
            active_facility = staff_membership.facility
            accessible_facilities = [build_facility_payload(staff_membership.facility)]
            role = staff_membership.role
        else:
            patient_link = get_patient_link(user)
            if patient_link:
                principal_type = "patient"
                principal_id   = format_uuid(patient_link.patient_id)
                session_facility_id = (
                    request.session.get(PATIENT_FACILITY_SESSION_KEY) if request else None
                )
                active_facility, access_rows = get_patient_active_facility(
                    patient_link, session_facility_id
                )
                accessible_facilities = [
                    build_facility_payload(item.facility) for item in access_rows
                ]
            else:
                rider_link = get_rider_link(user)
                if rider_link:
                    principal_type = "rider"
                    principal_id   = format_uuid(rider_link.rider_id)
                    session_facility_id = (
                        request.session.get(RIDER_FACILITY_SESSION_KEY) if request else None
                    )
                    active_facility, access_rows = get_rider_active_facility(
                        rider_link, session_facility_id
                    )
                    accessible_facilities = [
                        build_facility_payload(item.facility) for item in access_rows
                    ]

    payload = {
        "id":                   principal_id,
        "email":                user.email,
        "full_name":            user.get_full_name().strip() or user.get_username(),
        "principal_type":       principal_type,
        "role":                 role,
        "active_facility_id":   format_uuid(active_facility.id) if active_facility else None,
        "active_facility_name": active_facility.name if active_facility else None,
        "accessible_facilities": accessible_facilities,
        "is_superuser":         user.is_superuser,
    }
    # Include verification payload for staff principals
    if principal_type == "staff" and active_facility:
        payload.update(build_provider_verification_payload(active_facility))
    return payload


def build_patient_payload(link, active_facility=None, access_rows=None):
    user    = link.user
    patient = link.patient
    first_name, last_name = split_name(user, patient.full_name)
    facilities    = [build_facility_payload(item.facility) for item in (access_rows or [])]
    active_facility = active_facility or link.default_facility
    return {
        "id":                   format_uuid(patient.id),
        "patient_id":           format_uuid(patient.id),
        "patient_code":         patient.patient_code,
        "email":                user.email,
        "role":                 "patient",
        "first_name":           first_name,
        "last_name":            last_name,
        "phone":                patient.phone,
        "blood_group":          patient.blood_group,
        "age":                  calculate_age(patient.date_of_birth),
        "date_of_birth":        patient.date_of_birth.isoformat() if patient.date_of_birth else "",
        "address":              patient.address,
        "active_facility_id":   format_uuid(active_facility.id) if active_facility else None,
        "active_facility_name": active_facility.name if active_facility else None,
        "accessible_facilities": facilities,
        # Lock flags — needed by frontend profile edit screen
        "name_locked": getattr(patient, "name_locked", False),
        "dob_locked":  getattr(patient, "dob_locked",  False),
    }


def build_provider_payload(membership):
    user     = membership.user
    provider = membership.provider
    first_name, last_name = split_name(user, provider.full_name if provider else "")
    facility_payload      = build_facility_payload(membership.facility)
    verification_payload  = build_provider_verification_payload(membership.facility)
    return {
        "id":                   format_uuid(membership.id),
        "staff_id":             format_uuid(membership.id),
        "email":                user.email,
        "role":                 membership.role,
        "first_name":           first_name,
        "last_name":            last_name,
        "phone":                provider.phone if provider else "",
        "specialty":            provider.specialty if provider and provider.specialty else None,
        "facility":             membership.facility.name,
        "facility_id":          format_uuid(membership.facility_id),
        "facility_code":        membership.facility.facility_code,
        "license":              provider.license_number if provider and provider.license_number else None,
        "provider_id":          format_uuid(provider.id) if provider else None,
        "provider_code":        provider.provider_code if provider else None,
        # UI uses this to disable the name field after first edit
        "name_locked":          bool(getattr(provider, "name_locked", False)) if provider else False,
        "active_facility_id":   format_uuid(membership.facility_id),
        "active_facility_name": membership.facility.name,
        "accessible_facilities": [facility_payload] if facility_payload else [],
        "onboarding_completed": bool(membership.onboarding_completed),
        # facility_status: "pending" | "approved" | "suspended" — used by the
        # frontend to detect admin-applied suspension while the user is active.
        "facility_status":      membership.facility.status,
        **verification_payload,
    }


def build_rider_payload(link, active_facility=None, access_rows=None):
    user  = link.user
    rider = link.rider
    first_name, last_name = split_name(user, rider.full_name)
    vehicle = rider.vehicle_type
    if rider.vehicle_registration:
        vehicle = (
            f"{vehicle} - {rider.vehicle_registration}"
            if vehicle
            else rider.vehicle_registration
        )
    facilities    = [build_facility_payload(item.facility) for item in (access_rows or [])]
    active_facility = active_facility or link.default_facility
    return {
        "id":                   format_uuid(rider.id),
        "rider_id":             format_uuid(rider.id),
        "rider_code":           rider.rider_code,
        "email":                user.email,
        "role":                 "rider",
        "first_name":           first_name,
        "last_name":            last_name,
        "phone":                rider.phone,
        "rating":               float(rider.rating),
        "total_trips":          rider.total_trips,
        "status":               "active" if rider.is_online else "offline",
        "vehicle":              vehicle,
        "joined":               format_joined_label(user.date_joined),
        "zone":                 rider.zone,
        "bank":                 rider.bank_details,
        "active_facility_id":   format_uuid(active_facility.id) if active_facility else None,
        "active_facility_name": active_facility.name if active_facility else None,
        "accessible_facilities": facilities,
    }


# ─── Format helpers ───────────────────────────────────────────────────────────

def format_currency(value):
    amount = Decimal(value or 0)
    return f"KSh {amount:,.0f}"


def format_time_label(value):
    if not value:
        return "TBD"
    local_value = timezone.localtime(value)
    return local_value.strftime("%I:%M %p").lstrip("0")


def format_date_label(value):
    if not value:
        return "TBD"
    local_date = timezone.localtime(value).date()
    today = timezone.localdate()
    if local_date == today:
        return "Today"
    if local_date == today + timedelta(days=1):
        return "Tomorrow"
    # v2 was missing this "Yesterday" case — restored from our version
    if local_date == today - timedelta(days=1):
        return "Yesterday"
    return f"{local_date.strftime('%a')}, {local_date.strftime('%b')} {local_date.day}"


def format_occurred_date(value):
    if not value:
        return "TBD"
    local_date = timezone.localtime(value).date()
    return f"{local_date.strftime('%b')} {local_date.day}, {local_date.year}"


def format_datetime_label(value):
    if not value:
        return "TBD"
    local_value = timezone.localtime(value)
    local_date  = local_value.date()
    today = timezone.localdate()
    if local_date == today:
        day_label = "Today"
    elif local_date == today - timedelta(days=1):
        day_label = "Yesterday"
    else:
        day_label = f"{local_value.strftime('%b')} {local_date.day}, {local_date.year}"
    return f"{day_label} · {format_time_label(value)}"


def format_relative_time(value):
    if not value:
        return "Now"
    local_value  = timezone.localtime(value)
    delta        = timezone.now() - local_value
    total_seconds = int(delta.total_seconds())
    if total_seconds < 60:    return "Just now"
    if total_seconds < 3600:  return f"{max(total_seconds // 60,   1)} min ago"
    if total_seconds < 86400: return f"{max(total_seconds // 3600, 1)} hr ago"
    if total_seconds < 172800: return "Yesterday"
    return format_occurred_date(local_value)


# ─── Booking status helpers ───────────────────────────────────────────────────

def map_patient_booking_status(status_value):
    if status_value in {WorkflowStatus.DRAFT, WorkflowStatus.IDLE}:
        return "pending"
    if status_value == WorkflowStatus.CANCELLED:
        return "cancelled"
    if status_value == WorkflowStatus.REJECTED:
        return "rejected"
    if status_value == WorkflowStatus.COMPLETED:
        return "completed"
    if status_value == WorkflowStatus.IN_PROGRESS:
        return "in_progress"
    return "confirmed"


def parse_patient_booking_status(status_value):
    """
    Maps frontend status strings back to WorkflowStatus values.
    Extended from v2 to include 'in_progress' and 'rejected'.
    """
    if status_value == "pending":      return WorkflowStatus.DRAFT
    if status_value == "in_progress":  return WorkflowStatus.IN_PROGRESS
    if status_value == "cancelled":    return WorkflowStatus.CANCELLED
    if status_value == "rejected":     return WorkflowStatus.REJECTED
    if status_value == "completed":    return WorkflowStatus.COMPLETED
    return WorkflowStatus.CONFIRMED


# ─── Appointment payload ──────────────────────────────────────────────────────

def build_patient_appointment_payload(booking, consultation=None):
    """
    Full appointment payload for the patient frontend.

    Location logic by appointment type:
      Virtual    → no physical address; daily_room_url is provided when available (T-5 min)
      In Facility → facility name + address
      Home Visit  → patient's registered home address
    """
    consultation  = consultation or getattr(booking, "latest_consultation", None)
    scheduled_for = booking.scheduled_for
    now = timezone.now()

    is_cancelled   = booking.status == WorkflowStatus.CANCELLED
    is_completed   = booking.status == WorkflowStatus.COMPLETED
    is_in_progress = (
        booking.status == WorkflowStatus.CONFIRMED
        and scheduled_for is not None
        and scheduled_for <= now < (scheduled_for + timedelta(hours=1))
    )
    status_label = "in_progress" if is_in_progress else map_patient_booking_status(booking.status)

    can_cancel = (
        booking.status in {WorkflowStatus.CONFIRMED, WorkflowStatus.DRAFT}
        and scheduled_for is not None
        and now <= (scheduled_for - timedelta(hours=24))
    )
    attendance_due = (
        booking.status == WorkflowStatus.CONFIRMED
        and scheduled_for is not None
        and scheduled_for <= now < (scheduled_for + timedelta(minutes=20))
    )

    # Parse cancel metadata from notes
    cancelled_by        = ""
    cancellation_reason = ""
    if booking.notes:
        match = re.search(r"CANCEL_META\|by=(.*?)\|reason=(.*)", booking.notes)
        if match:
            cancelled_by        = (match.group(1) or "").strip()
            cancellation_reason = (match.group(2) or "").strip()

    # Appointment type — appointment_type is the canonical field now
    type_detail = booking.appointment_type or booking.service_type or "Consultation"
    appt_type_lower = type_detail.lower().strip()

    # Doctor name — prefer FK, fall back to legacy charfield
    doctor_name = (
        (booking.provider.full_name if booking.provider else None)
        or booking.provider_name
        or (consultation.provider_name if consultation else "")
        or "Gonep Team"
    )

    # ── Location info by appointment type ────────────────────────────────────
    if appt_type_lower == "virtual":
        location_label = "Virtual appointment"
        location_address = None
        location_detail = "Your meeting link will be sent 5 minutes before the appointment."
    elif appt_type_lower == "in facility":
        facility_obj = booking.facility
        location_label = facility_obj.name
        location_address = (
            booking.location_details
            or getattr(facility_obj, "location", None)
            or getattr(facility_obj, "address", None)
            or "See facility details"
        )
        location_detail = f"Attend at: {facility_obj.name}"
    elif appt_type_lower == "home visit":
        patient_obj = booking.patient
        location_label = "Home Visit"
        location_address = (
            booking.location_details
            or getattr(patient_obj, "address", None)
            or "Your registered address"
        )
        location_detail = "Doctor will visit you at home."
    else:
        # Fallback for any other type
        location_label = booking.facility.name
        location_address = booking.location_details or "To be confirmed"
        location_detail = ""

    # Virtual meeting URL — only set after send_virtual_meeting_links runs
    daily_room_url = booking.daily_room_url if appt_type_lower == "virtual" else None

    return {
        "id":                   format_uuid(booking.id),
        "booking_ref":          booking.booking_ref,   # canonical ref used for API calls
        "reference":            booking.booking_ref,   # backwards-compat alias
        "doctor":               doctor_name,
        "provider_code":        booking.provider.provider_code if booking.provider else None,
        "specialty":            booking.provider_specialty or "General Gonep",
        "type":                 type_detail,
        "date":                 format_date_label(scheduled_for),
        "time":                 format_time_label(scheduled_for),
        "status":               status_label,
        "source":               booking.source,
        "source_label":         booking.get_source_display(),
        "fee":                  format_currency(booking.fee_amount),
        "facility":             booking.facility.name,
        "facility_id":          format_uuid(booking.facility_id),
        "reason":               booking.notes or "",
        # Location fields — type-specific
        "location_label":       location_label,
        "location_address":     location_address,
        "location_detail":      location_detail,
        "address":              location_address or "",   # keep compat alias
        # Virtual-only
        "daily_room_url":       daily_room_url,
        "meeting_link_sent":    booking.meeting_link_sent if appt_type_lower == "virtual" else None,
        # Scheduling
        "scheduled_for":        scheduled_for.isoformat() if scheduled_for else None,
        "can_reschedule":       not is_cancelled and not is_completed,
        "can_cancel":           can_cancel,
        "attendance_due":       attendance_due,
        "cancelled_by":         cancelled_by,
        "cancellation_reason":  cancellation_reason,
    }


# ─── Order payload ────────────────────────────────────────────────────────────

def build_order_tracking_steps(order):
    placed_time = format_time_label(order.placed_at)
    packed_time = format_time_label(order.placed_at + timedelta(minutes=10))
    picked_time = format_time_label(order.placed_at + timedelta(minutes=20))
    if order.status == PatientPortalOrderStatus.DELIVERED:
        final_label = "Delivered"
        final_done  = True
    elif order.status == PatientPortalOrderStatus.IN_TRANSIT:
        final_label = f"ETA {order.eta_label or '~15 mins'}"
        final_done  = False
    else:
        final_label = "Awaiting dispatch"
        final_done  = False
    started = order.status in {
        PatientPortalOrderStatus.IN_TRANSIT,
        PatientPortalOrderStatus.DELIVERED,
    }
    return [
        {"label": "Order placed",       "time": placed_time, "done": True},
        {"label": "Packed at pharmacy", "time": packed_time, "done": started},
        {"label": "Rider picked up",    "time": picked_time, "done": started},
        {"label": "On the way",         "time": final_label, "done": final_done},
    ]


def build_patient_order_payload(order, include_tracking=False):
    payload = {
        "id":               format_uuid(order.id),
        "reference":        order.order_number,
        "status":           order.status,
        "eta":              order.eta_label or (
            "Delivered" if order.status == PatientPortalOrderStatus.DELIVERED else "Pending"
        ),
        "items": [
            {"name": item.medication_name, "qty": item.quantity}
            for item in order.items.all()
        ],
        "placedAt":         format_datetime_label(order.placed_at),
        "rider_name":       order.rider.full_name if order.rider else "Dispatch Team",
        "rider_phone":      order.rider.phone     if order.rider else "",
        "rider_rating":     float(order.rider.rating) if order.rider and order.rider.rating else None,
        "delivery_address": order.delivery_address or order.patient.address,
        "facility_id":      format_uuid(order.facility_id),
        "facility":         order.facility.name,
    }
    if include_tracking:
        payload["tracking_steps"] = build_order_tracking_steps(order)
    return payload


# ─── Record payload ───────────────────────────────────────────────────────────

def build_patient_record_payload(event, provider_label):
    style = PATIENT_RECORD_STYLES.get(
        event.event_type,
        {"type": "Record", "icon": "file-document-outline", "color": "#1A6FE8"},
    )
    return {
        "id":               format_uuid(event.id),
        "source_reference": event.source_identifier,
        "event_type":       event.event_type,
        "type":             style["type"],
        "title":            event.title,
        "date":             format_occurred_date(event.occurred_at),
        "provider":         provider_label or "Gonep Team",
        "icon":             style["icon"],
        "color":            style["color"],
    }


def build_patient_records_sections(records):
    """
    Groups records into structured sections for the patient records screen.
    Missing entirely from v2 — needed for the sectioned records view.
    """
    sections = {
        "encounters": {
            "title": "Visit / encounter history",
            "integrated": True,
            "coming_soon": False,
            "items": [r for r in records if r.get("event_type") == "consultation"],
        },
        "diagnoses": {
            "title": "Diagnoses / problems",
            "integrated": False,
            "coming_soon": True,
            "message": "Diagnosis timeline will be available soon.",
            "items": [],
        },
        "medications": {
            "title": "Current and past medications",
            "integrated": True,
            "coming_soon": False,
            "items": [r for r in records if r.get("event_type") == "prescription"],
        },
        "labs": {
            "title": "Lab and test results",
            "integrated": True,
            "coming_soon": False,
            "items": [r for r in records if r.get("event_type") == "diagnostic"],
        },
        "vitals": {
            "title": "Vitals trends",
            "integrated": False,
            "coming_soon": True,
            "message": "Vitals trend charts will be available soon.",
            "items": [],
        },
        "documents": {
            "title": "Uploaded reports and documents",
            "integrated": False,
            "coming_soon": True,
            "message": "Clinical documents viewer will be available soon.",
            "items": [],
        },
    }
    for section in sections.values():
        section["count"] = len(section.get("items") or [])
    return sections


# ─── Notification payload ─────────────────────────────────────────────────────

def build_patient_notification_payload(notification):
    """
    Full notification payload.
    V2 was missing: event_id, created_at fields — both needed for deduplication
    and cross-session read-state persistence.
    """
    return {
        "id":         format_uuid(notification.id),
        "code":       notification.notification_code,
        "event_id":   getattr(notification, "event_id", None) or "",
        "title":      notification.title,
        "body":       notification.body,
        "time":       format_relative_time(notification.created_at),
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "icon": {
            "lib":  notification.icon_lib  or "feather",
            "name": notification.icon_name or "bell",
        },
        "read": notification.read,
    }
