from datetime import date, timedelta
from decimal import Decimal
import re

from django.utils import timezone

from core.models import (
    PatientFacilityAccess,
    PatientPortalOrderStatus,
    ProviderMembership,
    RiderFacilityAccess,
    WorkflowStatus,
)


PATIENT_RECORD_STYLES = {
    "consultation": {"type": "Consultation", "icon": "stethoscope", "color": "#1A6FE8"},
    "prescription": {"type": "Prescription", "icon": "pill", "color": "#1A6FE8"},
    "diagnostic": {"type": "Lab Result", "icon": "flask-outline", "color": "#06B6D4"},
}

PATIENT_FACILITY_SESSION_KEY = "patient_active_facility_id"
RIDER_FACILITY_SESSION_KEY = "rider_active_facility_id"
STAFF_FACILITY_SESSION_KEY = "staff_active_facility_id"


def calculate_age(date_of_birth):
    if not date_of_birth:
        return None
    today = date.today()
    return today.year - date_of_birth.year - (
        (today.month, today.day) < (date_of_birth.month, date_of_birth.day)
    )


def format_joined_label(joined_at):
    return joined_at.strftime("%b %Y")


def split_name(user, fallback_full_name=""):
    first_name = (user.first_name or "").strip()
    last_name = (user.last_name or "").strip()
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
        "id": format_uuid(facility.id),
        "code": facility.facility_code,
        "name": facility.name,
    }


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
            patient_link,
            request.session.get(PATIENT_FACILITY_SESSION_KEY),
        )
        set_patient_active_facility(request, patient_facility)

    rider_link = get_rider_link(user)
    if rider_link:
        rider_facility, _ = get_rider_active_facility(
            rider_link,
            request.session.get(RIDER_FACILITY_SESSION_KEY),
        )
        set_rider_active_facility(request, rider_facility)


def build_session_payload(user, request=None):
    active_facility = None
    accessible_facilities = []
    role = None
    principal_type = "user"
    principal_id = None

    if user.is_superuser:
        principal_type = "superuser"
    else:
        staff_membership = get_staff_membership(user)
        if staff_membership:
            principal_type = "staff"
            principal_id = format_uuid(staff_membership.id)
            active_facility = staff_membership.facility
            accessible_facilities = [build_facility_payload(staff_membership.facility)]
            role = staff_membership.role
        else:
            patient_link = get_patient_link(user)
            if patient_link:
                principal_type = "patient"
                principal_id = format_uuid(patient_link.patient_id)
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
                    principal_id = format_uuid(rider_link.rider_id)
                    session_facility_id = (
                        request.session.get(RIDER_FACILITY_SESSION_KEY) if request else None
                    )
                    active_facility, access_rows = get_rider_active_facility(
                        rider_link, session_facility_id
                    )
                    accessible_facilities = [
                        build_facility_payload(item.facility) for item in access_rows
                    ]

    return {
        "id": principal_id,
        "email": user.email,
        "full_name": user.get_full_name().strip() or user.get_username(),
        "principal_type": principal_type,
        "role": role,
        "active_facility_id": format_uuid(active_facility.id) if active_facility else None,
        "active_facility_name": active_facility.name if active_facility else None,
        "accessible_facilities": accessible_facilities,
        "is_superuser": user.is_superuser,
    }


def build_patient_payload(link, active_facility=None, access_rows=None):
    user = link.user
    patient = link.patient
    first_name, last_name = split_name(user, patient.full_name)
    facilities = [build_facility_payload(item.facility) for item in (access_rows or [])]
    active_facility = active_facility or link.default_facility
    return {
        "id": format_uuid(patient.id),
        "patient_id": format_uuid(patient.id),
        "patient_code": patient.patient_code,
        "email": user.email,
        "role": "patient",
        "first_name": first_name,
        "last_name": last_name,
        "phone": patient.phone,
        "blood_group": patient.blood_group,
        "age": calculate_age(patient.date_of_birth),
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else "",
        "address": patient.address,
        "active_facility_id": format_uuid(active_facility.id) if active_facility else None,
        "active_facility_name": active_facility.name if active_facility else None,
        "accessible_facilities": facilities,
    }


def build_provider_payload(membership):
    user = membership.user
    provider = membership.provider
    first_name, last_name = split_name(user, provider.full_name if provider else "")
    facility_payload = build_facility_payload(membership.facility)
    return {
        "id": format_uuid(membership.id),
        "staff_id": format_uuid(membership.id),
        "email": user.email,
        "role": membership.role,
        "first_name": first_name,
        "last_name": last_name,
        "phone": provider.phone if provider else "",
        "specialty": provider.specialty if provider and provider.specialty else None,
        "facility": membership.facility.name,
        "facility_id": format_uuid(membership.facility_id),
        "facility_code": membership.facility.facility_code,
        "license": provider.license_number if provider and provider.license_number else None,
        "provider_id": format_uuid(provider.id) if provider else None,
        "provider_code": provider.provider_code if provider else None,
        "active_facility_id": format_uuid(membership.facility_id),
        "active_facility_name": membership.facility.name,
        "accessible_facilities": [facility_payload] if facility_payload else [],
    }


def build_rider_payload(link, active_facility=None, access_rows=None):
    user = link.user
    rider = link.rider
    first_name, last_name = split_name(user, rider.full_name)
    vehicle = rider.vehicle_type
    if rider.vehicle_registration:
        vehicle = (
            f"{vehicle} - {rider.vehicle_registration}"
            if vehicle
            else rider.vehicle_registration
        )
    facilities = [build_facility_payload(item.facility) for item in (access_rows or [])]
    active_facility = active_facility or link.default_facility
    return {
        "id": format_uuid(rider.id),
        "rider_id": format_uuid(rider.id),
        "rider_code": rider.rider_code,
        "email": user.email,
        "role": "rider",
        "first_name": first_name,
        "last_name": last_name,
        "phone": rider.phone,
        "rating": float(rider.rating),
        "total_trips": rider.total_trips,
        "status": "active" if rider.is_online else "offline",
        "vehicle": vehicle,
        "joined": format_joined_label(user.date_joined),
        "zone": rider.zone,
        "bank": rider.bank_details,
        "active_facility_id": format_uuid(active_facility.id) if active_facility else None,
        "active_facility_name": active_facility.name if active_facility else None,
        "accessible_facilities": facilities,
    }


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
    local_date = local_value.date()
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
    local_value = timezone.localtime(value)
    delta = timezone.now() - local_value
    total_seconds = int(delta.total_seconds())
    if total_seconds < 60:
        return "Just now"
    if total_seconds < 3600:
        minutes = max(total_seconds // 60, 1)
        return f"{minutes} min ago"
    if total_seconds < 86400:
        hours = max(total_seconds // 3600, 1)
        return f"{hours} hr ago"
    if total_seconds < 172800:
        return "Yesterday"
    return format_occurred_date(local_value)


def map_patient_booking_status(status_value):
    if status_value in {WorkflowStatus.DRAFT, WorkflowStatus.IDLE}:
        return "pending"
    if status_value == WorkflowStatus.CANCELLED:
        return "cancelled"
    if status_value == WorkflowStatus.COMPLETED:
        return "completed"
    return "confirmed"


def parse_patient_booking_status(status_value):
    if status_value == "pending":
        return WorkflowStatus.DRAFT
    if status_value == "in_progress":
        return WorkflowStatus.IN_PROGRESS
    if status_value == "cancelled":
        return WorkflowStatus.CANCELLED
    if status_value == "rejected":
        return WorkflowStatus.CANCELLED
    if status_value == "completed":
        return WorkflowStatus.COMPLETED
    return WorkflowStatus.CONFIRMED


def build_patient_appointment_payload(booking, consultation=None):
    consultation = consultation or getattr(booking, "latest_consultation", None)
    scheduled_for = booking.scheduled_for
    now = timezone.now()
    is_cancelled = booking.status == WorkflowStatus.CANCELLED
    is_completed = booking.status == WorkflowStatus.COMPLETED
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
        and scheduled_for <= now
        and now < (scheduled_for + timedelta(minutes=20))
    )
    cancelled_by = ""
    cancellation_reason = ""
    if booking.notes:
        match = re.search(r"CANCEL_META\|by=(.*?)\|reason=(.*)", booking.notes)
        if match:
            cancelled_by = (match.group(1) or "").strip()
            cancellation_reason = (match.group(2) or "").strip()

    return {
        "id": format_uuid(booking.id),
        "reference": booking.booking_ref,
        "doctor": booking.provider_name
        or (consultation.provider_name if consultation else "")
        or "Gonep Team",
        "specialty": booking.provider_specialty or "General Gonep",
        "type": booking.service_type or "Consultation",
        "date": format_date_label(scheduled_for),
        "time": format_time_label(scheduled_for),
        "status": status_label,
        "fee": format_currency(booking.fee_amount),
        "facility": booking.facility.name,
        "facility_id": format_uuid(booking.facility_id),
        "reason": booking.notes or "Follow-up review.",
        "address": booking.location_details or booking.patient.address or "To be confirmed",
        "scheduled_for": scheduled_for.isoformat() if scheduled_for else None,
        "can_reschedule": not is_cancelled and not is_completed,
        "can_cancel": can_cancel,
        "attendance_due": attendance_due,
        "cancelled_by": cancelled_by,
        "cancellation_reason": cancellation_reason,
    }


def build_order_tracking_steps(order):
    placed_time = format_time_label(order.placed_at)
    packed_time = format_time_label(order.placed_at + timedelta(minutes=10))
    picked_time = format_time_label(order.placed_at + timedelta(minutes=20))
    if order.status == PatientPortalOrderStatus.DELIVERED:
        final_label = "Delivered"
        final_done = True
    elif order.status == PatientPortalOrderStatus.IN_TRANSIT:
        final_label = f"ETA {order.eta_label or '~15 mins'}"
        final_done = False
    else:
        final_label = "Awaiting dispatch"
        final_done = False
    started = order.status in {
        PatientPortalOrderStatus.IN_TRANSIT,
        PatientPortalOrderStatus.DELIVERED,
    }
    return [
        {"label": "Order placed", "time": placed_time, "done": True},
        {"label": "Packed at pharmacy", "time": packed_time, "done": started},
        {"label": "Rider picked up", "time": picked_time, "done": started},
        {"label": "On the way", "time": final_label, "done": final_done},
    ]


def build_patient_order_payload(order, include_tracking=False):
    payload = {
        "id": format_uuid(order.id),
        "reference": order.order_number,
        "status": order.status,
        "eta": order.eta_label
        or ("Delivered" if order.status == PatientPortalOrderStatus.DELIVERED else "Pending"),
        "items": [
            {"name": item.medication_name, "qty": item.quantity}
            for item in order.items.all()
        ],
        "placedAt": format_datetime_label(order.placed_at),
        "rider_name": order.rider.full_name if order.rider else "Dispatch Team",
        "rider_phone": order.rider.phone if order.rider else "",
        "rider_rating": float(order.rider.rating) if order.rider and order.rider.rating else None,
        "delivery_address": order.delivery_address or order.patient.address,
        "facility_id": format_uuid(order.facility_id),
        "facility": order.facility.name,
    }
    if include_tracking:
        payload["tracking_steps"] = build_order_tracking_steps(order)
    return payload


def build_patient_record_payload(event, provider_label):
    style = PATIENT_RECORD_STYLES.get(
        event.event_type,
        {"type": "Record", "icon": "file-document-outline", "color": "#1A6FE8"},
    )
    return {
        "id": format_uuid(event.id),
        "source_reference": event.source_identifier,
        "event_type": event.event_type,
        "type": style["type"],
        "title": event.title,
        "date": format_occurred_date(event.occurred_at),
        "provider": provider_label or "Gonep Team",
        "icon": style["icon"],
        "color": style["color"],
    }


def build_patient_records_sections(records):
    sections = {
        "encounters": {
            "title": "Visit / encounter history",
            "integrated": True,
            "coming_soon": False,
            "items": [item for item in records if item.get("event_type") == "consultation"],
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
            "items": [item for item in records if item.get("event_type") == "prescription"],
        },
        "labs": {
            "title": "Lab and test results",
            "integrated": True,
            "coming_soon": False,
            "items": [item for item in records if item.get("event_type") == "diagnostic"],
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


def build_patient_notification_payload(notification):
    return {
        "id": format_uuid(notification.id),
        "code": notification.notification_code,
        "event_id": notification.event_id or "",
        "title": notification.title,
        "body": notification.body,
        "time": format_relative_time(notification.created_at),
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "icon": {
            "lib": notification.icon_lib or "feather",
            "name": notification.icon_name or "bell",
        },
        "read": notification.read,
    }
