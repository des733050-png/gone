import re
import secrets
import string
import uuid
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.contrib.auth import get_user_model, logout
from django.db import transaction
from django.db.models import Q
from django.utils.dateparse import parse_date, parse_datetime
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

from core.models import (
    PatientBooking,
    PatientFacilityAccess,
    PatientPortalNotification,
    PatientProfile,
    PatientUserLink,
    ProviderActivityLog,
    ProviderAppointment,
    ProviderAvailability,
    ProviderBillingRecord,
    ProviderClinicalSetting,
    ProviderConsultation,
    ProviderInventoryItem,
    ProviderLabResult,
    ProviderMembership,
    ProviderPortalNotification,
    ProviderPosTransaction,
    ProviderPrescriptionTask,
    ProviderProfile,
    ProviderSubRole,
    ProviderSupportTicket,
    WorkflowStatus,
)
from portal_api.utils import (
    build_provider_payload,
    calculate_age,
    format_uuid,
    get_staff_membership,
    split_name,
)


CLINICAL_EDIT_WINDOW_OPTIONS = [1, 6, 12, 24, 48, 72]
ROLE_UID_PREFIX = {
    ProviderSubRole.FACILITY_ADMIN: "usr-FA-",
    ProviderSubRole.DOCTOR: "usr-DOC-",
    ProviderSubRole.BILLING_MANAGER: "usr-BM-",
    ProviderSubRole.LAB_MANAGER: "usr-LM-",
    ProviderSubRole.RECEPTIONIST: "usr-REC-",
    ProviderSubRole.POS: "pos-",
}
PAYMENT_METHOD_LABELS = {"cash": "Cash", "mpesa": "M-Pesa", "card": "Card"}


def ensure_provider_membership(user):
    membership = get_staff_membership(user)
    if membership is None:
        raise NotFound("Provider membership not found.")
    return membership


def ensure_roles(membership, allowed_roles):
    if membership.role not in allowed_roles:
        raise PermissionDenied("You do not have permission to perform this action.")


def localize_datetime(value):
    if not value:
        return None
    try:
        if timezone.is_naive(value):
            return timezone.make_aware(value, timezone.get_current_timezone())
        return timezone.localtime(value)
    except Exception:
        return value


def compact_day_label(value):
    if not value:
        return ""
    date_value = value.date() if hasattr(value, "date") else value
    today = timezone.localdate()
    if date_value == today:
        return "Today"
    if date_value == today - timedelta(days=1):
        return "Yesterday"
    if date_value == today + timedelta(days=1):
        return "Tomorrow"
    return date_value.strftime("%a, %b %d").replace(" 0", " ")


def compact_time_label(value):
    if not value:
        return ""
    dt = localize_datetime(value)
    return dt.strftime("%I:%M %p").lstrip("0")


def compact_datetime_label(value):
    if not value:
        return ""
    dt = localize_datetime(value)
    return f"{compact_day_label(dt)} {compact_time_label(dt)}".strip()


def next_identifier(model_class, field_name, prefix, padding=4):
    counter = model_class.objects.count() + 1
    while True:
        candidate = f"{prefix}{counter:0{padding}d}"
        if not model_class.objects.filter(**{field_name: candidate}).exists():
            return candidate
        counter += 1


def _temporary_portal_password():
    """Cryptographically strong one-time password (meets mixed rules for UI validators)."""
    alphabet = string.ascii_letters + string.digits
    core = "".join(secrets.choice(alphabet) for _ in range(14))
    if not re.search(r"\d", core):
        core += "9"
    if not re.search(r"[A-Z]", core):
        core += "A"
    if not re.search(r"[a-z]", core):
        core += "a"
    return core


def _portal_login_url_hint():
    return (getattr(settings, "GONEP_PORTAL_LOGIN_URL", "") or "").strip()


def _patient_login_url_hint():
    return (getattr(settings, "GONEP_PATIENT_LOGIN_URL", "") or _portal_login_url_hint()).strip()


def _notify_clinical_settings_recipients(facility, actor_user, summary_text):
    """In-app notifications for doctors and facility admins when clinical settings change."""
    if not summary_text:
        return
    actor_label = actor_user.get_full_name().strip() or actor_user.email or actor_user.get_username()
    body = f"{actor_label} updated clinical settings: {summary_text}"
    recipients = ProviderMembership.objects.filter(
        facility=facility,
        is_active=True,
        user__is_active=True,
        role__in=(ProviderSubRole.DOCTOR, ProviderSubRole.FACILITY_ADMIN),
    ).select_related("user")
    for membership in recipients:
        ProviderPortalNotification.objects.create(
            notification_code=next_identifier(
                ProviderPortalNotification, "notification_code", "PVN-", 4
            ),
            user=membership.user,
            facility=facility,
            title="Clinical settings updated",
            message=body,
            icon_name="settings",
            icon_lib="feather",
            color="primary",
        )


def build_unique_username(email):
    user_model = get_user_model()
    base = (email.split("@", 1)[0] or "provider").strip().lower().replace(" ", "")
    base = "".join(ch for ch in base if ch.isalnum()) or "provider"
    candidate = base
    counter = 1
    while user_model.objects.filter(username=candidate).exists():
        candidate = f"{base}{counter}"
        counter += 1
    return candidate


def to_decimal(value, field_name):
    try:
        return Decimal(str(value or 0))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValidationError({field_name: "A valid amount is required."}) from exc


def coerce_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    return bool(value)


def normalize_discount_type(value):
    return "fixed" if str(value or "").strip().lower() == "fixed" else "percent"


def calculate_discounted_line_total(unit_price, qty, discount_type, discount_value):
    line_subtotal = (unit_price * qty).quantize(Decimal("0.01"))
    discount_type = normalize_discount_type(discount_type)
    if discount_type == "percent":
        percent_value = min(max(discount_value, Decimal("0")), Decimal("100"))
        discount_amount = (
            line_subtotal * percent_value / Decimal("100")
        ).quantize(Decimal("0.01"))
    else:
        discount_amount = min(
            line_subtotal, max(discount_value, Decimal("0")).quantize(Decimal("0.01"))
        )
    return max(Decimal("0"), line_subtotal - discount_amount)


def derive_inventory_status(stock, reorder):
    if stock <= 0:
        return "out"
    if stock <= reorder:
        return "low"
    return "ok"


def workflow_to_appointment_status(appointment):
    if appointment.provider_id is None:
        return "unassigned"
    if appointment.status == WorkflowStatus.CANCELLED:
        return "cancelled"
    if appointment.status == WorkflowStatus.COMPLETED:
        return "completed"
    if appointment.status == WorkflowStatus.CONFIRMED:
        return "confirmed"
    return "pending"


def workflow_to_prescription_status(task):
    if task.status == WorkflowStatus.CANCELLED:
        return "cancelled"
    if task.sent_at or task.status in {WorkflowStatus.CONFIRMED, WorkflowStatus.COMPLETED}:
        return "dispatched"
    return "pending_dispatch"


def provider_membership_uid_for_profile(provider, facility):
    if provider is None:
        return None
    membership = None
    if facility is not None:
        membership = provider.memberships.filter(facility=facility, is_active=True).first()
    if membership is None:
        membership = provider.memberships.filter(is_active=True).first()
    return format_uuid(membership.id) if membership else None


def resolve_provider_membership_for_portal_id(facility, staff_id, role=ProviderSubRole.DOCTOR):
    queryset = ProviderMembership.objects.select_related("provider", "user", "facility").filter(
        facility=facility, role=role
    )
    try:
        membership = queryset.get(pk=staff_id)
    except Exception:
        try:
            membership = queryset.get(provider__provider_code=staff_id)
        except ProviderMembership.DoesNotExist as exc:
            raise NotFound("Provider staff member not found.") from exc
    return membership


def build_staff_payload(membership):
    provider = membership.provider
    user = membership.user
    first_name, last_name = split_name(user, provider.full_name if provider else "")
    facility_id = format_uuid(membership.facility_id)
    return {
        "id": format_uuid(membership.id),
        "email": user.email,
        "role": membership.role,
        "first_name": first_name,
        "last_name": last_name,
        "phone": provider.phone if provider else "",
        "specialty": provider.specialty if provider and provider.specialty else None,
        "facility": membership.facility.name,
        "facility_id": facility_id,
        "facility_code": membership.facility.facility_code,
        "license": provider.license_number if provider and provider.license_number else None,
        "accessible_facilities": [
            {
                "id": facility_id,
                "code": membership.facility.facility_code,
                "name": membership.facility.name,
            }
        ],
        "suspended": (not membership.is_active) or (not user.is_active),
    }


def build_appointment_payload(appointment):
    patient = appointment.patient
    facility = appointment.facility
    doctor_id = provider_membership_uid_for_profile(appointment.provider, facility)
    return {
        "id": format_uuid(appointment.id),
        "reference": appointment.appointment_ref,
        "patient": patient.full_name if patient else "Walk-in Patient",
        "patient_id": patient.patient_code if patient else None,
        "doctor_id": doctor_id,
        "age": calculate_age(patient.date_of_birth) if patient else None,
        "type": appointment.appointment_type or "In Facility",
        "time": compact_time_label(appointment.scheduled_for),
        "date": compact_day_label(appointment.scheduled_for),
        "status": workflow_to_appointment_status(appointment),
        "reason": appointment.visit_reason,
        "phone": appointment.patient_phone or (patient.phone if patient else ""),
        "scheduled_for": appointment.scheduled_for.isoformat()
        if appointment.scheduled_for
        else None,
    }


def build_consultation_payload(consultation):
    facility = consultation.facility or (consultation.appointment.facility if consultation.appointment else None)
    doctor_id = provider_membership_uid_for_profile(consultation.provider, facility)
    return {
        "id": format_uuid(consultation.id),
        "reference": consultation.consultation_ref,
        "patient_id": consultation.patient.patient_code if consultation.patient else None,
        "doctor_id": doctor_id,
        "doctor_name": consultation.provider.full_name if consultation.provider else "Gonep Team",
        "date": compact_day_label(consultation.consulted_at),
        "created_at": consultation.consulted_at.isoformat() if consultation.consulted_at else consultation.created_at.isoformat(),
        "type": consultation.consultation_type or "In Facility",
        "subjective": consultation.subjective,
        "objective": consultation.objective,
        "assessment": consultation.assessment,
        "plan": consultation.plan,
        "uploaded_files": consultation.uploaded_files or [],
    }


def build_prescription_payload(task):
    doctor_id = provider_membership_uid_for_profile(task.provider, task.facility)
    date_value = task.sent_at or task.signed_off_at or task.created_at
    return {
        "id": format_uuid(task.id),
        "reference": task.task_ref,
        "patient": task.patient.full_name if task.patient else "Unknown patient",
        "patient_id": task.patient.patient_code if task.patient else None,
        "doctor_id": doctor_id,
        "drug": task.medication_name or task.medication_summary or "Medication order",
        "qty": task.quantity,
        "instructions": task.instructions or task.medication_summary or "",
        "date": compact_datetime_label(date_value),
        "created_at": date_value.isoformat() if date_value else task.created_at.isoformat(),
        "status": workflow_to_prescription_status(task),
    }


def build_lab_payload(lab):
    doctor_id = provider_membership_uid_for_profile(lab.provider, lab.facility)
    return {
        "id": format_uuid(lab.id),
        "reference": lab.lab_ref,
        "patient": lab.patient.full_name if lab.patient else "Unknown patient",
        "patient_id": lab.patient.patient_code if lab.patient else None,
        "doctor_id": doctor_id,
        "test": lab.test_name,
        "result": lab.result_value,
        "range": lab.reference_range,
        "date": compact_day_label(lab.reported_at),
        "status": lab.status,
        "critical": lab.critical,
        "acknowledged": lab.acknowledged,
        "acknowledged_at": compact_datetime_label(lab.acknowledged_at)
        if lab.acknowledged_at
        else "",
        "acknowledged_by": (
            (lab.acknowledged_by.get_full_name().strip() or lab.acknowledged_by.username)
            if lab.acknowledged_by
            else ""
        ),
    }


def build_inventory_payload(item):
    return {
        "id": format_uuid(item.id),
        "reference": item.item_code,
        "barcode": item.barcode,
        "supplier_barcode": item.supplier_barcode,
        "name": item.name,
        "category": item.category or "Other",
        "stock": item.stock,
        "unit": item.unit or "units",
        "unit_price": float(item.unit_price),
        "reorder": item.reorder,
        "status": item.status or derive_inventory_status(item.stock, item.reorder),
        "ecommerce": item.ecommerce,
        "active": item.active,
        "saved_discount": item.saved_discount or {"type": "percent", "value": 0},
        "history": item.history or [],
    }


def build_billing_payload(record):
    amount = int(record.amount)
    return {
        "id": format_uuid(record.id),
        "reference": record.billing_code,
        "patient": record.patient_name,
        "amount": f"KSh {amount:,}",
        "amount_raw": amount,
        "service": record.service_name,
        "status": record.status,
        "date": compact_day_label(record.paid_on or record.billed_on),
        "method": record.payment_method or "Invoice",
    }


def build_notification_payload(notification):
    return {
        "id": format_uuid(notification.id),
        "code": notification.notification_code,
        "event_id": notification.event_id or "",
        "icon": notification.icon_name,
        "lib": notification.icon_lib,
        "title": notification.title,
        "msg": notification.message,
        "time": compact_datetime_label(notification.created_at),
        "read": notification.read,
        "color": notification.color,
    }


def _next_patient_notification_code():
    counter = PatientPortalNotification.objects.count() + 1
    while True:
        candidate = f"PT-NOTIF-{counter:04d}"
        if not PatientPortalNotification.objects.filter(notification_code=candidate).exists():
            return candidate
        counter += 1


def _notify_patient_for_provider_appointment(appointment, transition, actor_label):
    if not appointment.patient_id:
        return
    booking = (
        PatientBooking.objects.filter(
            patient=appointment.patient,
            facility=appointment.facility,
            scheduled_for=appointment.scheduled_for,
        )
        .order_by("-updated_at")
        .first()
    )
    if booking is None:
        return
    event_id = f"patient-booking:{booking.booking_ref}:provider-{transition}"
    if transition == "approved":
        title = "Appointment confirmed"
        body = f"{actor_label} confirmed your appointment."
    elif transition == "rejected":
        title = "Appointment request rejected"
        body = f"{actor_label} rejected your appointment request."
    elif transition == "cancelled":
        title = "Appointment cancelled"
        body = f"{actor_label} cancelled your appointment."
    else:
        return
    notification, created = PatientPortalNotification.objects.get_or_create(
        patient=booking.patient,
        facility=booking.facility,
        event_id=event_id,
        defaults={
            "notification_code": _next_patient_notification_code(),
            "kind": f"appointment_{transition}",
            "title": title,
            "body": body,
            "icon_lib": "feather",
            "icon_name": "calendar",
            "read": False,
        },
    )
    if not created:
        notification.title = title
        notification.body = body
        notification.read = False
        notification.save(update_fields=["title", "body", "read", "updated_at"])


def build_support_ticket_payload(ticket):
    staff_id = ""
    if ticket.raised_by_id:
        staff_id = (
            ticket.raised_by.provider_memberships.filter(facility=ticket.facility)
            .values_list("id", flat=True)
            .first()
            or ""
        )
    return {
        "id": format_uuid(ticket.id),
        "reference": ticket.ticket_code,
        "title": ticket.title,
        "description": ticket.description,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": ticket.status,
        "raised_by": staff_id,
        "raised_by_name": ticket.raised_by_name,
        "raised_by_role": ticket.raised_by_role,
        "facility": ticket.facility.name,
        "created_at": ticket.created_at.isoformat(),
        "responses": ticket.responses or [],
    }


def build_activity_log_payload(log):
    return {
        "id": format_uuid(log.id),
        "reference": log.log_code,
        "ts": compact_datetime_label(log.occurred_at),
        "occurred_at": log.occurred_at.isoformat() if log.occurred_at else None,
        "staff": log.staff_name,
        "staff_id": log.staff_membership_id,
        "role": log.role,
        "module": log.module,
        "action": log.action,
        "detail": log.detail,
        "type": log.entry_type,
    }


def build_pos_account_payload(membership):
    first_name, last_name = split_name(membership.user)
    return {
        "id": format_uuid(membership.id),
        "name": f"{first_name} {last_name}".strip() or membership.user.email,
        "email": membership.user.email,
        "password_hint": "Set by admin",
        "facility": membership.facility.name,
        "facility_id": format_uuid(membership.facility_id),
        "facility_code": membership.facility.facility_code,
        "role": membership.role,
        "active": membership.is_active and membership.user.is_active,
        "created_by": "",
        "created_at": membership.created_at.date().isoformat(),
    }


def build_pos_transaction_payload(transaction_entry):
    return {
        "id": format_uuid(transaction_entry.id),
        "reference": transaction_entry.transaction_code,
        "pos_id": transaction_entry.pos_id,
        "cashier": transaction_entry.cashier_name,
        "items": transaction_entry.items or [],
        "subtotal": float(transaction_entry.subtotal),
        "discount_total": float(transaction_entry.discount_total),
        "tax": 0,
        "grand_total": float(transaction_entry.grand_total),
        "payment_method": PAYMENT_METHOD_LABELS.get(transaction_entry.payment_method, transaction_entry.payment_method),
        "payment_ref": transaction_entry.payment_ref or None,
        "status": transaction_entry.status,
        "created_at": transaction_entry.created_at.isoformat(),
        "receipt_no": transaction_entry.receipt_no,
    }


def log_provider_activity(user, membership, payload):
    return ProviderActivityLog.objects.create(
        log_code=next_identifier(ProviderActivityLog, "log_code", "LOG-", 4),
        actor=user,
        facility=membership.facility,
        staff_name=payload.get("staff") or user.get_full_name().strip() or user.email or user.get_username(),
        staff_membership_id=payload.get("staff_id", format_uuid(membership.id)),
        role=payload.get("role", membership.role),
        module=payload.get("module", ""),
        action=payload.get("action", "Update"),
        detail=payload.get("detail", ""),
        entry_type=payload.get("type", ""),
        occurred_at=timezone.now(),
    )


def active_facility_staff_memberships(facility, include_pos=False, include_inactive=True):
    queryset = ProviderMembership.objects.select_related("user", "provider", "facility").filter(
        facility=facility
    )
    if not include_pos:
        queryset = queryset.exclude(role=ProviderSubRole.POS)
    if not include_inactive:
        queryset = queryset.filter(is_active=True)
    return queryset.order_by("role", "user__first_name", "user__last_name", "user__email")


def get_staff_membership_or_raise(facility, staff_id):
    queryset = ProviderMembership.objects.select_related("user", "provider", "facility").filter(
        facility=facility
    )
    try:
        return queryset.get(pk=staff_id)
    except Exception:
        try:
            return queryset.get(provider__provider_code=staff_id)
        except ProviderMembership.DoesNotExist as exc:
            raise NotFound("Staff member not found.") from exc


def _lookup_by_id_or_code(queryset, identifier, code_field, not_found_message):
    try:
        return queryset.get(pk=identifier)
    except Exception:
        try:
            return queryset.get(**{code_field: identifier})
        except queryset.model.DoesNotExist as exc:
            raise NotFound(not_found_message) from exc


def get_inventory_item_or_raise(facility, item_code):
    return _lookup_by_id_or_code(
        ProviderInventoryItem.objects.filter(facility=facility),
        item_code,
        "item_code",
        "Inventory item not found.",
    )


def get_appointment_or_raise(facility, appointment_ref):
    return _lookup_by_id_or_code(
        ProviderAppointment.objects.select_related("provider", "patient", "facility").filter(
            facility=facility
        ),
        appointment_ref,
        "appointment_ref",
        "Appointment not found.",
    )


def get_consultation_or_raise(facility, consultation_ref):
    return _lookup_by_id_or_code(
        ProviderConsultation.objects.select_related(
            "provider", "patient", "facility", "appointment"
        ).filter(facility=facility),
        consultation_ref,
        "consultation_ref",
        "Consultation not found.",
    )


def get_prescription_task_or_raise(facility, task_ref):
    return _lookup_by_id_or_code(
        ProviderPrescriptionTask.objects.select_related(
            "provider", "patient", "facility"
        ).filter(facility=facility),
        task_ref,
        "task_ref",
        "Prescription not found.",
    )


def get_notification_or_raise(user, notification_code):
    return _lookup_by_id_or_code(
        ProviderPortalNotification.objects.filter(user=user),
        notification_code,
        "notification_code",
        "Notification not found.",
    )


def get_ticket_or_raise(facility, ticket_code):
    return _lookup_by_id_or_code(
        ProviderSupportTicket.objects.filter(facility=facility),
        ticket_code,
        "ticket_code",
        "Support ticket not found.",
    )


def ensure_membership_profile(membership):
    if membership.provider_id:
        return membership.provider
    profile = ProviderProfile.objects.create(
        provider_code=next_identifier(ProviderProfile, "provider_code", "PRV-", 4),
        facility=membership.facility,
        full_name=membership.user.get_full_name().strip() or membership.user.email,
        status=WorkflowStatus.CONFIRMED,
        phone="",
        email=membership.user.email,
    )
    membership.provider = profile
    membership.save(update_fields=["provider", "updated_at"])
    membership.refresh_from_db()
    return membership.provider


class ProviderMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        return Response(build_provider_payload(membership))

    @transaction.atomic
    def patch(self, request):
        membership = ensure_provider_membership(request.user)
        user = membership.user
        provider = membership.provider or ensure_membership_profile(membership)
        data = request.data or {}

        first_name = str(data.get("first_name", user.first_name)).strip()
        last_name = str(data.get("last_name", user.last_name)).strip()
        phone = str(data.get("phone", provider.phone if provider else "")).strip()

        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        if not last_name:
            raise ValidationError({"last_name": "Last name is required."})

        user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=["first_name", "last_name"])

        if provider:
            provider.full_name = f"{first_name} {last_name}".strip()
            provider.phone = phone
            if "specialty" in data:
                provider.specialty = str(data.get("specialty") or "").strip()
            provider.save(update_fields=["full_name", "phone", "specialty"])

        membership.refresh_from_db()
        return Response(build_provider_payload(membership))


class ProviderChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        ensure_provider_membership(request.user)
        data = request.data or {}
        current_password = str(data.get("current_password") or "")
        new_password = str(data.get("new_password") or "")
        if not current_password or not new_password:
            raise ValidationError({"detail": "current_password and new_password are required."})
        if not request.user.check_password(current_password):
            return Response({"error": "Current password is incorrect"}, status=400)
        if new_password == current_password:
            raise ValidationError(
                {"new_password": "New password must be different from your current password."}
            )
        if len(new_password) < 8 or not re.search(r"\d", new_password) or not re.search(r"[A-Z]", new_password):
            raise ValidationError(
                {
                    "new_password": "Password must be at least 8 characters and include one number and one uppercase letter."
                }
            )
        request.user.set_password(new_password)
        request.user.save(update_fields=["password"])
        Token.objects.filter(user=request.user).delete()
        logout(request)
        return Response({"detail": "Password updated. Please sign in again."})


class ProviderAppointmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        queryset = ProviderAppointment.objects.select_related("provider", "patient", "facility").filter(
            facility=membership.facility
        )
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            queryset = queryset.filter(provider=membership.provider)
        queryset = queryset.order_by("scheduled_for", "created_at")
        return Response([build_appointment_payload(item) for item in queryset])

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
            },
        )
        data = request.data or {}
        patient_id = str(data.get("patient_id") or "").strip()
        doctor_id = str(data.get("doctor_id") or "").strip()
        scheduled_for_raw = str(data.get("scheduled_for") or "").strip()
        duration_minutes = int(data.get("duration_minutes") or 0)
        appointment_type = str(data.get("appointment_type") or "In Facility").strip()
        visit_reason = str(data.get("visit_reason") or "").strip()
        notes = str(data.get("notes") or "").strip()
        patient_phone = str(data.get("patient_phone") or "").strip()

        if not patient_id:
            raise ValidationError({"patient_id": "Patient is required."})
        if not doctor_id:
            raise ValidationError({"doctor_id": "Doctor is required."})
        if not scheduled_for_raw:
            raise ValidationError({"scheduled_for": "Scheduled datetime is required."})
        if duration_minutes not in {15, 30, 45, 60}:
            raise ValidationError(
                {"duration_minutes": "Duration must be one of 15, 30, 45, or 60 minutes."}
            )
        if appointment_type not in {"In Facility", "Home Visit"}:
            raise ValidationError(
                {"appointment_type": "Appointment type must be In Facility or Home Visit."}
            )
        if not visit_reason:
            raise ValidationError({"visit_reason": "Visit reason is required."})

        scheduled_for = parse_datetime(scheduled_for_raw)
        if scheduled_for is None:
            raise ValidationError({"scheduled_for": "Invalid datetime format."})
        if timezone.is_naive(scheduled_for):
            scheduled_for = timezone.make_aware(
                scheduled_for, timezone.get_current_timezone()
            )
        if scheduled_for <= timezone.now():
            raise ValidationError(
                {"scheduled_for": "Scheduled datetime must be in the future."}
            )

        patient = PatientProfile.objects.filter(patient_code=patient_id).first()
        if patient is None:
            try:
                patient = PatientProfile.objects.get(pk=patient_id)
            except Exception as exc:
                raise ValidationError({"patient_id": "Patient not found."}) from exc

        doctor_membership = resolve_provider_membership_for_portal_id(
            membership.facility, doctor_id, ProviderSubRole.DOCTOR
        )
        if doctor_membership.provider_id is None:
            raise ValidationError({"doctor_id": "Doctor profile is not configured."})

        appointment = ProviderAppointment.objects.create(
            appointment_ref=next_identifier(
                ProviderAppointment, "appointment_ref", "apt-", 4
            ),
            provider=doctor_membership.provider,
            facility=membership.facility,
            patient=patient,
            status=WorkflowStatus.CONFIRMED,
            scheduled_for=scheduled_for,
            appointment_type=appointment_type,
            patient_phone=patient_phone or patient.phone,
            visit_reason=visit_reason,
            notes=notes,
        )
        return Response(build_appointment_payload(appointment), status=201)


class ProviderAppointmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def patch(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.RECEPTIONIST},
        )
        appointment = get_appointment_or_raise(membership.facility, appointment_ref)
        data = request.data or {}
        previous_status = appointment.status

        if "doctor_id" in data:
            doctor_id = str(data.get("doctor_id") or "").strip()
            if not doctor_id:
                appointment.provider = None
            else:
                doctor_membership = resolve_provider_membership_for_portal_id(
                    membership.facility, doctor_id, ProviderSubRole.DOCTOR
                )
                appointment.provider = doctor_membership.provider

        if "status" in data:
            requested_status = str(data.get("status") or "").strip()
            status_map = {
                "confirmed": WorkflowStatus.CONFIRMED,
                "cancelled": WorkflowStatus.CANCELLED,
                "rejected": WorkflowStatus.CANCELLED,
                "unassigned": WorkflowStatus.DRAFT,
                "pending": WorkflowStatus.DRAFT,
            }
            appointment.status = status_map.get(requested_status, appointment.status)

        appointment.save(update_fields=["provider", "status", "updated_at"])
        if previous_status != appointment.status:
            actor_label = request.user.get_full_name().strip() or request.user.email
            if requested_status == "rejected":
                _notify_patient_for_provider_appointment(appointment, "rejected", actor_label)
            elif appointment.status == WorkflowStatus.CANCELLED:
                _notify_patient_for_provider_appointment(appointment, "cancelled", actor_label)
            elif appointment.status == WorkflowStatus.CONFIRMED:
                _notify_patient_for_provider_appointment(appointment, "approved", actor_label)
        appointment.refresh_from_db()
        return Response(build_appointment_payload(appointment))


class ProviderPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR},
        )

        appointments = ProviderAppointment.objects.select_related("provider", "patient", "facility").filter(
            facility=membership.facility, patient__isnull=False
        )
        consultations = ProviderConsultation.objects.select_related("provider", "patient", "facility").filter(
            facility=membership.facility, patient__isnull=False
        )
        prescriptions = ProviderPrescriptionTask.objects.select_related("patient").filter(
            facility=membership.facility, patient__isnull=False
        )

        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            appointments = appointments.filter(provider=membership.provider)
            consultations = consultations.filter(provider=membership.provider)
            prescriptions = prescriptions.filter(provider=membership.provider)

        patient_index = {}
        for appointment in appointments:
            if not appointment.patient_id:
                continue
            patient_index.setdefault(
                appointment.patient_id,
                {"patient": appointment.patient, "last_visit": None, "doctor_id": None},
            )
            patient_index[appointment.patient_id]["doctor_id"] = provider_membership_uid_for_profile(
                appointment.provider, membership.facility
            )
            if appointment.scheduled_for and (
                patient_index[appointment.patient_id]["last_visit"] is None
                or appointment.scheduled_for > patient_index[appointment.patient_id]["last_visit"]
            ):
                patient_index[appointment.patient_id]["last_visit"] = appointment.scheduled_for

        for consultation in consultations:
            if not consultation.patient_id:
                continue
            patient_index.setdefault(
                consultation.patient_id,
                {"patient": consultation.patient, "last_visit": None, "doctor_id": None},
            )
            patient_index[consultation.patient_id]["doctor_id"] = provider_membership_uid_for_profile(
                consultation.provider, membership.facility
            )
            if consultation.consulted_at and (
                patient_index[consultation.patient_id]["last_visit"] is None
                or consultation.consulted_at > patient_index[consultation.patient_id]["last_visit"]
            ):
                patient_index[consultation.patient_id]["last_visit"] = consultation.consulted_at

        medication_map = {}
        for task in prescriptions.order_by("-created_at"):
            if not task.patient_id:
                continue
            medication_map.setdefault(task.patient_id, [])
            name = task.medication_name or task.medication_summary
            if name and name not in medication_map[task.patient_id]:
                medication_map[task.patient_id].append(name)

        payload = []
        for item in patient_index.values():
            patient = item["patient"]
            gender = (patient.gender or "").strip()
            payload.append(
                {
                    "id": patient.patient_code,
                    "name": patient.full_name,
                    "doctor_id": item["doctor_id"],
                    "age": calculate_age(patient.date_of_birth),
                    "blood_group": patient.blood_group,
                    "gender": gender[:1].upper() if gender else "",
                    "last_visit": compact_day_label(item["last_visit"] or patient.updated_at),
                    "conditions": patient.conditions or [],
                    "allergies": patient.allergies or [],
                    "medications": medication_map.get(patient.pk, []),
                }
            )
        payload.sort(key=lambda row: row["name"])
        return Response(payload)


def _facility_booking_search_patient_ids(membership):
    """Patients linked to this facility (access + clinical records)."""
    facility = membership.facility
    ids = set(
        PatientFacilityAccess.objects.filter(facility=facility, is_active=True).values_list(
            "patient_id", flat=True
        )
    )
    ids.update(
        ProviderAppointment.objects.filter(facility=facility, patient_id__isnull=False).values_list(
            "patient_id", flat=True
        )
    )
    ids.update(
        ProviderConsultation.objects.filter(facility=facility, patient_id__isnull=False).values_list(
            "patient_id", flat=True
        )
    )
    ids.update(
        ProviderPrescriptionTask.objects.filter(facility=facility, patient_id__isnull=False).values_list(
            "patient_id", flat=True
        )
    )
    # EMR parity: doctors only see patients they have touched at this facility.
    if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
        panel = set()
        panel.update(
            ProviderAppointment.objects.filter(
                facility=facility, provider=membership.provider, patient_id__isnull=False
            ).values_list("patient_id", flat=True)
        )
        panel.update(
            ProviderConsultation.objects.filter(
                facility=facility, provider=membership.provider, patient_id__isnull=False
            ).values_list("patient_id", flat=True)
        )
        panel.update(
            ProviderPrescriptionTask.objects.filter(
                facility=facility, provider=membership.provider, patient_id__isnull=False
            ).values_list("patient_id", flat=True)
        )
        ids &= panel
    return ids


class ProviderPatientSearchView(APIView):
    """Minimal patient lookup for booking (not full EMR)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
            },
        )
        q = (request.GET.get("q") or "").strip()
        if len(q) < 2:
            return Response({"results": []})

        patient_ids = _facility_booking_search_patient_ids(membership)
        if not patient_ids:
            return Response({"results": []})

        try:
            uuid.UUID(q)
            uuid_ok = True
        except (ValueError, TypeError):
            uuid_ok = False

        name_or_code = (
            Q(full_name__icontains=q)
            | Q(patient_code__icontains=q)
            | Q(phone__icontains=q)
        )
        filters = name_or_code | Q(pk=q) if uuid_ok else name_or_code

        rows = (
            PatientProfile.objects.filter(pk__in=patient_ids)
            .filter(filters)
            .order_by("full_name")[:25]
        )
        return Response(
            {
                "results": [
                    {
                        "id": p.patient_code,
                        "name": p.full_name,
                        "phone": p.phone or "",
                    }
                    for p in rows
                ]
            }
        )


class ProviderLabResultsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        queryset = ProviderLabResult.objects.select_related("provider", "patient", "facility").filter(
            facility=membership.facility
        )
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            queryset = queryset.filter(provider=membership.provider)
        queryset = queryset.order_by("-reported_at")
        return Response([build_lab_payload(item) for item in queryset])


class ProviderLabResultAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, lab_ref):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.LAB_MANAGER,
            },
        )
        result = _lookup_by_id_or_code(
            ProviderLabResult.objects.select_related(
                "provider", "patient", "facility", "acknowledged_by"
            ).filter(facility=membership.facility),
            lab_ref,
            "lab_ref",
            "Lab result not found.",
        )

        if (
            membership.role == ProviderSubRole.DOCTOR
            and membership.provider_id
            and result.provider_id
            and result.provider_id != membership.provider_id
        ):
            raise PermissionDenied("You can only acknowledge your assigned lab results.")

        if not result.acknowledged:
            result.acknowledged = True
            result.acknowledged_at = timezone.now()
            result.acknowledged_by = request.user
            result.save(
                update_fields=[
                    "acknowledged",
                    "acknowledged_at",
                    "acknowledged_by",
                    "updated_at",
                ]
            )
            result.refresh_from_db()

        return Response(build_lab_payload(result))


class ProviderPrescriptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        queryset = ProviderPrescriptionTask.objects.select_related(
            "provider", "patient", "facility"
        ).filter(facility=membership.facility)
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            queryset = queryset.filter(provider=membership.provider)
        queryset = queryset.order_by("-created_at")
        return Response([build_prescription_payload(item) for item in queryset])


class ProviderPrescriptionDispatchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_ref):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.LAB_MANAGER},
        )
        task = get_prescription_task_or_raise(membership.facility, task_ref)
        task.status = WorkflowStatus.CONFIRMED
        task.sent_at = timezone.now()
        task.save(update_fields=["status", "sent_at", "updated_at"])
        return Response(build_prescription_payload(task))


class ProviderPrescriptionCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_ref):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR})
        task = get_prescription_task_or_raise(membership.facility, task_ref)
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id != task.provider_id:
            raise PermissionDenied("You can only cancel your own prescriptions.")
        task.status = WorkflowStatus.CANCELLED
        task.save(update_fields=["status", "updated_at"])
        return Response(build_prescription_payload(task))


class ProviderInventoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.BILLING_MANAGER,
                ProviderSubRole.LAB_MANAGER,
                ProviderSubRole.POS,
            },
        )
        queryset = ProviderInventoryItem.objects.filter(facility=membership.facility).order_by("name")
        return Response([build_inventory_payload(item) for item in queryset])

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.LAB_MANAGER},
        )
        data = request.data or {}
        name = str(data.get("name") or "").strip()
        if not name:
            raise ValidationError({"name": "Item name is required."})
        stock = int(data.get("stock") or 0)
        reorder = int(data.get("reorder") or 0)
        item = ProviderInventoryItem.objects.create(
            item_code=next_identifier(ProviderInventoryItem, "item_code", "inv-", 3),
            facility=membership.facility,
            name=name,
            category=str(data.get("category") or "Other").strip(),
            stock=max(stock, 0),
            unit=str(data.get("unit") or "units").strip() or "units",
            unit_price=to_decimal(data.get("unit_price"), "unit_price"),
            reorder=max(reorder, 0),
            status=derive_inventory_status(stock, reorder),
            ecommerce=bool(data.get("ecommerce")),
            active=True,
            saved_discount={"type": "percent", "value": 0},
            history=[
                {
                    "date": compact_datetime_label(timezone.now()),
                    "action": "Added to formulary",
                    "qty_change": max(stock, 0),
                    "by": str(data.get("addedBy") or request.user.get_full_name().strip() or request.user.email),
                }
            ],
        )
        return Response(build_inventory_payload(item), status=201)


class ProviderInventoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_code):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.LAB_MANAGER},
        )
        item = get_inventory_item_or_raise(membership.facility, item_code)
        data = request.data or {}
        for field in ["name", "category", "unit", "barcode", "supplier_barcode"]:
            if field in data:
                setattr(item, field, str(data.get(field) or "").strip())
        if "unit_price" in data:
            item.unit_price = to_decimal(data.get("unit_price"), "unit_price")
        if "reorder" in data:
            item.reorder = max(int(data.get("reorder") or 0), 0)
        if "saved_discount" in data:
            discount = data.get("saved_discount") or {}
            item.saved_discount = {
                "type": discount.get("type") or "percent",
                "value": float(discount.get("value") or 0),
            }
        item.status = derive_inventory_status(item.stock, item.reorder)
        item.save()
        return Response(build_inventory_payload(item))


class ProviderInventoryAddStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, item_code):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.LAB_MANAGER},
        )
        item = get_inventory_item_or_raise(membership.facility, item_code)
        qty = int((request.data or {}).get("qty") or 0)
        if qty < 1:
            raise ValidationError({"qty": "Quantity must be at least 1."})
        item.stock += qty
        item.status = derive_inventory_status(item.stock, item.reorder)
        history = item.history or []
        history.insert(
            0,
            {
                "date": compact_datetime_label(timezone.now()),
                "action": str((request.data or {}).get("reason") or "Stock received"),
                "qty_change": qty,
                "by": str((request.data or {}).get("by") or request.user.get_full_name().strip() or request.user.email),
            },
        )
        item.history = history[:50]
        item.save(update_fields=["stock", "status", "history", "updated_at"])
        return Response(build_inventory_payload(item))


class ProviderInventoryReduceStockView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, item_code):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.LAB_MANAGER},
        )
        item = get_inventory_item_or_raise(membership.facility, item_code)
        qty = int((request.data or {}).get("qty") or 0)
        if qty < 1:
            raise ValidationError({"qty": "Quantity must be at least 1."})
        if qty > item.stock:
            raise ValidationError({"qty": "Cannot reduce stock below zero."})
        item.stock -= qty
        item.status = derive_inventory_status(item.stock, item.reorder)
        history = item.history or []
        history.insert(
            0,
            {
                "date": compact_datetime_label(timezone.now()),
                "action": str((request.data or {}).get("reason") or "Stock reduced"),
                "qty_change": -qty,
                "by": str((request.data or {}).get("by") or request.user.get_full_name().strip() or request.user.email),
            },
        )
        item.history = history[:50]
        item.save(update_fields=["stock", "status", "history", "updated_at"])
        return Response(build_inventory_payload(item))


class ProviderInventoryDeactivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, item_code):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        item = get_inventory_item_or_raise(membership.facility, item_code)
        item.active = False
        item.save(update_fields=["active", "updated_at"])
        return Response(build_inventory_payload(item))


class ProviderInventoryToggleEcommerceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, item_code):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.LAB_MANAGER},
        )
        item = get_inventory_item_or_raise(membership.facility, item_code)
        item.ecommerce = not item.ecommerce
        item.save(update_fields=["ecommerce", "updated_at"])
        return Response(build_inventory_payload(item))


class ProviderBillingView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.BILLING_MANAGER},
        )
        queryset = ProviderBillingRecord.objects.filter(facility=membership.facility)
        return Response([build_billing_payload(item) for item in queryset])


class ProviderBillingPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, billing_code):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.BILLING_MANAGER},
        )
        record = _lookup_by_id_or_code(
            ProviderBillingRecord.objects.filter(facility=membership.facility),
            billing_code,
            "billing_code",
            "Billing record not found.",
        )
        record.status = "paid"
        record.paid_on = timezone.localdate()
        record.save(update_fields=["status", "paid_on", "updated_at"])
        return Response(build_billing_payload(record))


class ProviderNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ensure_provider_membership(request.user)
        queryset = ProviderPortalNotification.objects.filter(user=request.user).order_by("-created_at")
        return Response([build_notification_payload(item) for item in queryset])


class ProviderNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_code):
        ensure_provider_membership(request.user)
        notification = get_notification_or_raise(request.user, notification_code)
        notification.read = True
        notification.save(update_fields=["read", "updated_at"])
        return Response(build_notification_payload(notification))


class ProviderNotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ensure_provider_membership(request.user)
        ProviderPortalNotification.objects.filter(user=request.user, read=False).update(
            read=True, updated_at=timezone.now()
        )
        return Response({"detail": "Notifications updated."})


class ProviderAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
            },
        )
        doctors = active_facility_staff_memberships(
            membership.facility, include_pos=False, include_inactive=False
        ).filter(role=ProviderSubRole.DOCTOR, provider__isnull=False)
        availability_index = {
            item.provider_id: item
            for item in ProviderAvailability.objects.filter(
                facility=membership.facility,
                provider_id__in=doctors.values_list("provider_id", flat=True),
            )
        }
        payload = {}
        for doctor in doctors:
            availability = availability_index.get(doctor.provider_id)
            payload[format_uuid(doctor.id)] = {
                "doctor_id": format_uuid(doctor.id),
                "doctor_name": doctor.provider.full_name if doctor.provider else doctor.user.get_full_name().strip(),
                "slots": availability.slots if availability else [],
                "blocked_days": availability.blocked_days if availability else [],
            }
        return Response(payload)

    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
            },
        )
        doctor_id = str((request.data or {}).get("doctorId") or format_uuid(membership.id))
        slot = (request.data or {}).get("slot") or {}
        doctor_membership = resolve_provider_membership_for_portal_id(
            membership.facility, doctor_id, ProviderSubRole.DOCTOR
        )
        availability, _ = ProviderAvailability.objects.get_or_create(
            provider=doctor_membership.provider,
            facility=membership.facility,
            defaults={"slots": [], "blocked_days": []},
        )
        new_slot = {
            "id": f"sl-{timezone.now().strftime('%Y%m%d%H%M%S%f')}",
            "day": slot.get("day") or "",
            "start": slot.get("start") or "",
            "end": slot.get("end") or "",
            "type": slot.get("type") or "In Facility",
            "setBy": slot.get("setBy")
            or ("self" if membership.role == ProviderSubRole.DOCTOR else "receptionist"),
        }
        availability.slots = [*availability.slots, new_slot]
        availability.save(update_fields=["slots", "updated_at"])
        return Response(new_slot, status=201)

    def patch(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
            },
        )
        doctor_id = str((request.data or {}).get("doctorId") or format_uuid(membership.id))
        day = str((request.data or {}).get("day") or "").strip()
        if not day:
            raise ValidationError({"day": "Day is required."})
        doctor_membership = resolve_provider_membership_for_portal_id(
            membership.facility, doctor_id, ProviderSubRole.DOCTOR
        )
        availability, _ = ProviderAvailability.objects.get_or_create(
            provider=doctor_membership.provider,
            facility=membership.facility,
            defaults={"slots": [], "blocked_days": []},
        )
        blocked_days = list(availability.blocked_days or [])
        if day in blocked_days:
            blocked_days = [item for item in blocked_days if item != day]
        else:
            blocked_days.append(day)
            availability.slots = [item for item in (availability.slots or []) if item.get("day") != day]
        availability.blocked_days = blocked_days
        availability.save(update_fields=["slots", "blocked_days", "updated_at"])
        return Response({"detail": "Availability updated."})

    def delete(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
            },
        )
        doctor_id = str((request.data or {}).get("doctorId") or format_uuid(membership.id))
        slot_id = str((request.data or {}).get("slotId") or "").strip()
        if not slot_id:
            raise ValidationError({"slotId": "Slot id is required."})
        doctor_membership = resolve_provider_membership_for_portal_id(
            membership.facility, doctor_id, ProviderSubRole.DOCTOR
        )
        availability, _ = ProviderAvailability.objects.get_or_create(
            provider=doctor_membership.provider,
            facility=membership.facility,
            defaults={"slots": [], "blocked_days": []},
        )
        availability.slots = [item for item in (availability.slots or []) if item.get("id") != slot_id]
        availability.save(update_fields=["slots", "updated_at"])
        return Response({"detail": "Availability updated."})


class ProviderActivityLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        queryset = ProviderActivityLog.objects.filter(facility=membership.facility)
        return Response([build_activity_log_payload(item) for item in queryset])

    def post(self, request):
        membership = ensure_provider_membership(request.user)
        log_entry = log_provider_activity(request.user, membership, request.data or {})
        return Response(build_activity_log_payload(log_entry), status=201)


class ProviderPatientInviteView(APIView):
    """Invite a patient portal user linked to this facility (not provider staff)."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        data = request.data or {}
        email = str(data.get("email") or "").strip().lower()[:254]
        first_name = str(data.get("first_name") or "").strip()[:80]
        last_name = str(data.get("last_name") or "").strip()[:80]
        phone = str(data.get("phone") or "").strip()[:32]
        dob_raw = str(data.get("date_of_birth") or "").strip()
        gender = str(data.get("gender") or "").strip()[:20]
        emergency_phone = str(data.get("emergency_contact_phone") or "").strip()[:32]
        if not email:
            raise ValidationError({"email": "Email is required."})
        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        if not dob_raw:
            raise ValidationError({"date_of_birth": "Date of birth is required for patient accounts."})
        parsed_dob = parse_date(dob_raw)
        if parsed_dob is None:
            raise ValidationError({"date_of_birth": "Use YYYY-MM-DD format."})

        if ProviderMembership.objects.filter(
            user__email__iexact=email, facility=membership.facility, is_active=True
        ).exists():
            raise ValidationError(
                {"email": "This email already belongs to a staff member at your facility."}
            )

        user_model = get_user_model()
        temp_pw = _temporary_portal_password()
        user = user_model.objects.filter(email__iexact=email).first()

        if user and PatientUserLink.objects.filter(user=user).exists():
            link = PatientUserLink.objects.select_related("patient").get(user=user)
            patient = link.patient
            patient.full_name = f"{first_name} {last_name}".strip() or patient.full_name
            patient.phone = phone or patient.phone
            patient.date_of_birth = parsed_dob
            if gender:
                patient.gender = gender
            if emergency_phone:
                patient.emergency_contact_phone = emergency_phone
            patient.save(
                update_fields=[
                    "full_name",
                    "phone",
                    "date_of_birth",
                    "gender",
                    "emergency_contact_phone",
                    "updated_at",
                ]
            )
            user.first_name = first_name
            user.last_name = last_name
            user.set_password(temp_pw)
            user.save(update_fields=["first_name", "last_name", "password"])
        elif user is None:
            user = user_model.objects.create_user(
                username=build_unique_username(email),
                email=email,
                password=temp_pw,
                first_name=first_name,
                last_name=last_name,
                is_staff=False,
                is_active=True,
            )
            patient = PatientProfile.objects.create(
                patient_code=next_identifier(PatientProfile, "patient_code", "PAT-", 4),
                full_name=f"{first_name} {last_name}".strip(),
                status=WorkflowStatus.CONFIRMED,
                phone=phone,
                email=email,
                date_of_birth=parsed_dob,
                gender=gender,
                emergency_contact_phone=emergency_phone,
            )
            PatientUserLink.objects.create(
                user=user,
                patient=patient,
                default_facility=membership.facility,
                is_active=True,
            )
        else:
            raise ValidationError(
                {"email": "This email is already registered to a non-patient account."}
            )

        access, _created_acc = PatientFacilityAccess.objects.get_or_create(
            patient=patient,
            facility=membership.facility,
            defaults={"is_default": True, "is_active": True},
        )
        if not access.is_active:
            access.is_active = True
            access.save(update_fields=["is_active", "updated_at"])

        login_hint = _patient_login_url_hint()
        return Response(
            {
                "patient_invite": True,
                "patient_code": patient.patient_code,
                "email": email,
                "temporary_password": temp_pw,
                "login_url": login_hint,
            },
            status=201,
        )


class ProviderStaffView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.RECEPTIONIST},
        )
        memberships = active_facility_staff_memberships(
            membership.facility, include_pos=False, include_inactive=True
        )
        if membership.role == ProviderSubRole.RECEPTIONIST:
            memberships = memberships.filter(role=ProviderSubRole.DOCTOR, is_active=True)
        return Response([build_staff_payload(item) for item in memberships])

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        data = request.data or {}
        role = str(data.get("role") or "").strip()
        if role not in {
            ProviderSubRole.DOCTOR,
            ProviderSubRole.BILLING_MANAGER,
            ProviderSubRole.LAB_MANAGER,
            ProviderSubRole.RECEPTIONIST,
        }:
            raise ValidationError({"role": "A valid staff role is required."})
        email = str(data.get("email") or "").strip().lower()[:254]
        if not email:
            raise ValidationError({"email": "Email is required."})
        first_name = str(data.get("first_name") or "").strip()[:80]
        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        last_name = str(data.get("last_name") or "").strip()[:80]
        phone = str(data.get("phone") or "").strip()[:32]
        specialty = str(data.get("specialty") or "").strip()[:120]
        license_number = str(data.get("license") or "").strip()[:80]
        professional_notes = str(data.get("professional_notes") or "").strip()[:500]

        if role == ProviderSubRole.DOCTOR:
            if len(specialty) < 2:
                raise ValidationError({"specialty": "Specialty is required for doctors."})
            if len(license_number) < 3:
                raise ValidationError({"license": "A valid professional licence number is required for doctors."})

        if PatientUserLink.objects.filter(user__email__iexact=email).exists():
            raise ValidationError(
                {"email": "This email is already a patient portal account. Use patient invite instead."}
            )

        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        created_fresh_user = user is None
        invitation_password = None
        if user is None:
            invitation_password = _temporary_portal_password()
            user = user_model.objects.create_user(
                username=build_unique_username(email),
                email=email,
                password=invitation_password,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_active=True,
            )
        else:
            if PatientUserLink.objects.filter(user=user).exists():
                raise ValidationError({"email": "This email belongs to a patient account."})
            user.first_name = first_name
            user.last_name = last_name
            user.is_staff = True
            user.is_active = True
            user.save(update_fields=["first_name", "last_name", "is_staff", "is_active"])

        provider_id = (
            ProviderMembership.objects.filter(user=user, provider__isnull=False)
            .values_list("provider_id", flat=True)
            .first()
        )
        if provider_id:
            provider = ProviderProfile.objects.get(pk=provider_id)
            provider.full_name = f"{first_name} {last_name}".strip()
            provider.status = WorkflowStatus.CONFIRMED
            provider.phone = phone
            provider.email = email
            update_fields = [
                "full_name",
                "status",
                "phone",
                "email",
                "updated_at",
            ]
            if role == ProviderSubRole.DOCTOR:
                provider.specialty = specialty
                provider.license_number = license_number
                update_fields.extend(["specialty", "license_number"])
            if professional_notes:
                provider.bio = professional_notes
                update_fields.append("bio")
            provider.save(update_fields=update_fields)
        else:
            provider = ProviderProfile.objects.create(
                provider_code=next_identifier(ProviderProfile, "provider_code", "PRV-", 4),
                facility=membership.facility,
                full_name=f"{first_name} {last_name}".strip(),
                specialty=specialty if role == ProviderSubRole.DOCTOR else "",
                status=WorkflowStatus.CONFIRMED,
                phone=phone,
                email=email,
                license_number=license_number if role == ProviderSubRole.DOCTOR else "",
                bio=professional_notes if professional_notes else "",
            )

        new_membership, created = ProviderMembership.objects.get_or_create(
            user=user,
            facility=membership.facility,
            defaults={
                "provider": provider,
                "role": role,
                "is_active": True,
            },
        )
        if not created:
            new_membership.provider = provider
            new_membership.role = role
            new_membership.is_active = True
            new_membership.save(
                update_fields=["provider", "role", "is_active", "updated_at"]
            )
        user.is_active = True
        user.is_staff = True
        user.save(update_fields=["is_active", "is_staff"])
        payload = build_staff_payload(new_membership)
        if created_fresh_user and invitation_password:
            payload["invitation"] = {
                "temporary_password": invitation_password,
                "login_url": _portal_login_url_hint(),
            }
        return Response(payload, status=201)


class ProviderStaffDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, staff_id):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        staff_membership = get_staff_membership_or_raise(membership.facility, staff_id)
        data = request.data or {}

        if "first_name" in data:
            staff_membership.user.first_name = str(data.get("first_name") or "").strip()
        if "last_name" in data:
            staff_membership.user.last_name = str(data.get("last_name") or "").strip()
        if ("phone" in data or "specialty" in data) and not staff_membership.provider_id:
            staff_membership = ProviderMembership.objects.select_related(
                "user", "provider", "facility"
            ).get(pk=staff_membership.pk)
            ensure_membership_profile(staff_membership)
        if "phone" in data and staff_membership.provider:
            staff_membership.provider.phone = str(data.get("phone") or "").strip()
        if "specialty" in data and staff_membership.provider:
            staff_membership.provider.specialty = str(data.get("specialty") or "").strip()

        staff_membership.user.save(update_fields=["first_name", "last_name"])
        if staff_membership.provider:
            staff_membership.provider.full_name = staff_membership.user.get_full_name().strip()
            staff_membership.provider.save(update_fields=["full_name", "phone", "specialty"])
        staff_membership.refresh_from_db()
        return Response(build_staff_payload(staff_membership))


class ProviderStaffSuspendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, staff_id):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        staff_membership = get_staff_membership_or_raise(membership.facility, staff_id)
        staff_membership.is_active = False
        staff_membership.save(update_fields=["is_active", "updated_at"])
        if not staff_membership.user.provider_memberships.filter(is_active=True).exists():
            staff_membership.user.is_active = False
            staff_membership.user.save(update_fields=["is_active"])
        return Response(build_staff_payload(staff_membership))


class ProviderStaffReactivateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, staff_id):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        staff_membership = get_staff_membership_or_raise(membership.facility, staff_id)
        staff_membership.is_active = True
        staff_membership.save(update_fields=["is_active", "updated_at"])
        staff_membership.user.is_active = True
        staff_membership.user.save(update_fields=["is_active"])
        return Response(build_staff_payload(staff_membership))


class ProviderConsultationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR},
        )
        queryset = ProviderConsultation.objects.select_related(
            "provider", "patient", "facility", "appointment"
        ).filter(facility=membership.facility)
        patient_id = str(request.query_params.get("patient_id") or "").strip()
        if patient_id:
            queryset = queryset.filter(patient__patient_code=patient_id)
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            queryset = queryset.filter(provider=membership.provider)
        queryset = queryset.order_by("-consulted_at")
        return Response([build_consultation_payload(item) for item in queryset])

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR},
        )
        data = request.data or {}
        patient_id = str(data.get("patient_id") or "").strip()
        patient_name = str(data.get("patient_name") or "").strip()
        patient = None
        if patient_id:
            patient = PatientProfile.objects.filter(patient_code=patient_id).first()
        elif patient_name:
            patient = PatientProfile.objects.filter(full_name__iexact=patient_name).first()
        if patient is None:
            raise ValidationError({"patient_id": "Patient not found."})
        consultation = ProviderConsultation.objects.create(
            consultation_ref=next_identifier(ProviderConsultation, "consultation_ref", "con-", 4),
            provider=membership.provider,
            patient=patient,
            facility=membership.facility,
            status=WorkflowStatus.CONFIRMED,
            consultation_type=str(data.get("type") or "In Facility").strip(),
            subjective=str(data.get("subjective") or "").strip(),
            objective=str(data.get("objective") or "").strip(),
            assessment=str(data.get("assessment") or "").strip(),
            plan=str(data.get("plan") or "").strip(),
            uploaded_files=data.get("uploaded_files") or [],
            consulted_at=timezone.now(),
        )
        return Response(build_consultation_payload(consultation), status=201)


class ProviderConsultationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, consultation_ref):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR},
        )
        consultation = get_consultation_or_raise(membership.facility, consultation_ref)
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id != consultation.provider_id:
            raise PermissionDenied("You can only edit your own consultation notes.")
        edit_window = (
            ProviderClinicalSetting.objects.filter(facility=membership.facility)
            .values_list("edit_window_hours", flat=True)
            .first()
            or 24
        )
        if consultation.consulted_at < timezone.now() - timedelta(hours=edit_window):
            raise ValidationError({"detail": f"Edit window expired ({edit_window} hrs)."})
        data = request.data or {}
        for field_name, attr in [
            ("type", "consultation_type"),
            ("subjective", "subjective"),
            ("objective", "objective"),
            ("assessment", "assessment"),
            ("plan", "plan"),
        ]:
            if field_name in data:
                setattr(consultation, attr, str(data.get(field_name) or "").strip())
        consultation.save()
        return Response(build_consultation_payload(consultation))


class ProviderClinicalSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR})
        settings_obj, _ = ProviderClinicalSetting.objects.get_or_create(
            facility=membership.facility, defaults={"edit_window_hours": 24}
        )
        return Response(
            {
                "edit_window_hours": settings_obj.edit_window_hours,
                "allowed_values": CLINICAL_EDIT_WINDOW_OPTIONS,
                "push_notifications": settings_obj.push_notifications,
                "critical_lab_alerts": settings_obj.critical_lab_alerts,
                "email_reports": settings_obj.email_reports,
                "two_factor_enabled": settings_obj.two_factor_enabled,
            }
        )

    def patch(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        settings_obj, _ = ProviderClinicalSetting.objects.get_or_create(
            facility=membership.facility, defaults={"edit_window_hours": 24}
        )
        data = request.data or {}
        before = {
            "edit_window_hours": settings_obj.edit_window_hours,
            "push_notifications": settings_obj.push_notifications,
            "critical_lab_alerts": settings_obj.critical_lab_alerts,
            "email_reports": settings_obj.email_reports,
            "two_factor_enabled": settings_obj.two_factor_enabled,
        }
        updated_fields = ["updated_at"]
        if "edit_window_hours" in data:
            value = int(data.get("edit_window_hours") or 0)
            if value not in CLINICAL_EDIT_WINDOW_OPTIONS:
                raise ValidationError({"edit_window_hours": "Unsupported edit window."})
            settings_obj.edit_window_hours = value
            updated_fields.append("edit_window_hours")
        for field_name in [
            "push_notifications",
            "critical_lab_alerts",
            "email_reports",
            "two_factor_enabled",
        ]:
            if field_name in data:
                setattr(settings_obj, field_name, coerce_bool(data.get(field_name)))
                updated_fields.append(field_name)
        settings_obj.save(update_fields=updated_fields)
        change_bits = []
        if before["edit_window_hours"] != settings_obj.edit_window_hours:
            change_bits.append(f"edit window {before['edit_window_hours']}→{settings_obj.edit_window_hours}h")
        for key in ("push_notifications", "critical_lab_alerts", "email_reports", "two_factor_enabled"):
            if before[key] != getattr(settings_obj, key):
                change_bits.append(f"{key} {before[key]}→{getattr(settings_obj, key)}")
        if change_bits:
            _notify_clinical_settings_recipients(
                membership.facility, request.user, "; ".join(change_bits)
            )
        return Response(
            {
                "edit_window_hours": settings_obj.edit_window_hours,
                "allowed_values": CLINICAL_EDIT_WINDOW_OPTIONS,
                "push_notifications": settings_obj.push_notifications,
                "critical_lab_alerts": settings_obj.critical_lab_alerts,
                "email_reports": settings_obj.email_reports,
                "two_factor_enabled": settings_obj.two_factor_enabled,
            }
        )


class ProviderSupportTicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        queryset = ProviderSupportTicket.objects.select_related("facility", "raised_by").filter(
            facility=membership.facility
        )
        if membership.role != ProviderSubRole.FACILITY_ADMIN:
            queryset = queryset.filter(raised_by=request.user)
        return Response([build_support_ticket_payload(item) for item in queryset])

    def post(self, request):
        membership = ensure_provider_membership(request.user)
        data = request.data or {}
        title = str(data.get("title") or "").strip()
        description = str(data.get("description") or "").strip()
        if not title or not description:
            raise ValidationError({"detail": "Title and description are required."})
        ticket = ProviderSupportTicket.objects.create(
            ticket_code=next_identifier(ProviderSupportTicket, "ticket_code", "tkt-", 3),
            facility=membership.facility,
            raised_by=request.user,
            raised_by_name=request.user.get_full_name().strip() or request.user.email,
            raised_by_role=membership.role,
            title=title,
            description=description,
            category=str(data.get("category") or "Other").strip(),
            priority=str(data.get("priority") or "medium").strip(),
            status=str(data.get("status") or "open").strip(),
            responses=data.get("responses") or [],
        )
        return Response(build_support_ticket_payload(ticket), status=201)


class ProviderSupportTicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, ticket_code):
        membership = ensure_provider_membership(request.user)
        ticket = get_ticket_or_raise(membership.facility, ticket_code)
        data = request.data or {}
        is_admin = membership.role == ProviderSubRole.FACILITY_ADMIN
        if not is_admin and ticket.raised_by_id != request.user.id:
            raise PermissionDenied("You can only view your own support tickets.")
        if ("responses" in data or "status" in data) and not is_admin:
            raise PermissionDenied("Only facility admins can respond to tickets.")
        if "responses" in data:
            ticket.responses = data.get("responses") or []
        if "status" in data:
            ticket.status = str(data.get("status") or ticket.status).strip()
        ticket.save()
        return Response(build_support_ticket_payload(ticket))


class ProviderPosAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        queryset = active_facility_staff_memberships(
            membership.facility, include_pos=True, include_inactive=True
        ).filter(role=ProviderSubRole.POS)
        return Response([build_pos_account_payload(item) for item in queryset])

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        data = request.data or {}
        name = str(data.get("name") or "").strip()
        email = str(data.get("email") or "").strip().lower()
        if not name or not email:
            raise ValidationError({"detail": "Name and email are required."})
        first_name, _, last_name = name.partition(" ")
        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        if user is None:
            user = user_model.objects.create_user(
                username=build_unique_username(email),
                email=email,
                password="Demo@12345",
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_active=True,
            )
        pos_membership, created = ProviderMembership.objects.get_or_create(
            user=user,
            facility=membership.facility,
            defaults={
                "provider": None,
                "role": ProviderSubRole.POS,
                "is_active": True,
            },
        )
        if not created:
            pos_membership.role = ProviderSubRole.POS
            pos_membership.is_active = True
            pos_membership.save(update_fields=["role", "is_active", "updated_at"])
        user.is_active = True
        user.is_staff = True
        user.save(update_fields=["is_active", "is_staff"])
        return Response(build_pos_account_payload(pos_membership), status=201)


class ProviderPosAccountResetPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, staff_id):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        pos_membership = resolve_provider_membership_for_portal_id(
            membership.facility, staff_id, ProviderSubRole.POS
        )
        pos_membership.user.set_password("Demo@12345")
        pos_membership.user.save(update_fields=["password"])
        return Response(build_pos_account_payload(pos_membership))


class ProviderPosTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.POS})
        queryset = ProviderPosTransaction.objects.filter(facility=membership.facility)
        pos_id = str(request.query_params.get("pos_id") or "").strip()
        if membership.role == ProviderSubRole.POS:
            queryset = queryset.filter(pos_id=format_uuid(membership.id))
        elif pos_id:
            queryset = queryset.filter(pos_id=pos_id)
        return Response([build_pos_transaction_payload(item) for item in queryset])

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.POS})
        data = request.data or {}
        raw_items = data.get("items") or []
        if not raw_items:
            raise ValidationError({"items": "At least one item is required."})
        normalized_items = []
        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        stock_updates = []
        for index, item_payload in enumerate(raw_items, start=1):
            item_code = str(item_payload.get("id") or "").strip()
            if not item_code:
                raise ValidationError({"items": f"Item {index} is missing an id."})
            inventory_item = _lookup_by_id_or_code(
                ProviderInventoryItem.objects.select_for_update().filter(
                    facility=membership.facility, active=True
                ),
                item_code,
                "item_code",
                f"Inventory item {item_code} was not found.",
            )
            qty = int(item_payload.get("qty") or 0)
            if qty < 1:
                raise ValidationError(
                    {"items": f"{inventory_item.name} must have quantity 1 or more."}
                )
            if qty > inventory_item.stock:
                raise ValidationError(
                    {
                        "items": (
                            f"Insufficient stock for {inventory_item.name}. "
                            f"Available: {inventory_item.stock}, requested: {qty}."
                        )
                    }
                )
            unit_price = Decimal(inventory_item.unit_price)
            line_subtotal = (unit_price * qty).quantize(Decimal("0.01"))
            discount_type = normalize_discount_type(item_payload.get("disc_type"))
            discount_value = to_decimal(item_payload.get("disc_value"), "disc_value")
            line_total = calculate_discounted_line_total(
                unit_price, Decimal(qty), discount_type, discount_value
            )
            subtotal += line_subtotal
            discount_total += line_subtotal - line_total
            normalized_items.append(
                {
                    "id": format_uuid(inventory_item.id),
                    "reference": inventory_item.item_code,
                    "name": inventory_item.name,
                    "qty": qty,
                    "unit_price": float(unit_price),
                    "disc_type": discount_type,
                    "disc_value": float(discount_value),
                    "line_total": float(line_total),
                }
            )
            stock_updates.append((inventory_item, qty))
        grand_total = subtotal - discount_total
        transaction_entry = ProviderPosTransaction.objects.create(
            transaction_code=next_identifier(ProviderPosTransaction, "transaction_code", "pos-tx-", 3),
            facility=membership.facility,
            pos_id=str(data.get("pos_id") or format_uuid(membership.id)),
            cashier_name=str(data.get("cashier") or request.user.get_full_name().strip() or request.user.email),
            items=normalized_items,
            subtotal=subtotal,
            discount_total=discount_total,
            grand_total=grand_total,
            payment_method=str(data.get("payment_method") or "cash").strip() or "cash",
            payment_ref=str(data.get("payment_ref") or "").strip(),
            status=str(data.get("status") or "completed").strip(),
            receipt_no=str(data.get("receipt_no") or next_identifier(ProviderPosTransaction, "receipt_no", "RCP-", 4)),
        )
        for inventory_item, qty in stock_updates:
            inventory_item.stock = max(0, inventory_item.stock - qty)
            inventory_item.status = derive_inventory_status(inventory_item.stock, inventory_item.reorder)
            history = inventory_item.history or []
            history.insert(
                0,
                {
                    "date": compact_datetime_label(timezone.now()),
                    "action": "POS sale",
                    "qty_change": -qty,
                    "by": transaction_entry.cashier_name,
                },
            )
            inventory_item.history = history[:50]
            inventory_item.save(update_fields=["stock", "status", "history", "updated_at"])
        return Response(build_pos_transaction_payload(transaction_entry), status=201)


class ProviderAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.BILLING_MANAGER},
        )
        billing = list(ProviderBillingRecord.objects.filter(facility=membership.facility).order_by("billed_on"))
        inventory = list(ProviderInventoryItem.objects.filter(facility=membership.facility, active=True))
        appointments = list(ProviderAppointment.objects.filter(facility=membership.facility).order_by("scheduled_for"))
        pos_transactions = list(ProviderPosTransaction.objects.filter(facility=membership.facility).order_by("created_at"))

        today = timezone.localdate()
        month_start = today.replace(day=1)
        revenue_over_time = []
        for offset in range(5, -1, -1):
            anchor = (month_start - timedelta(days=offset * 31)).replace(day=1)
            next_month = (anchor + timedelta(days=32)).replace(day=1)
            clinic_total = sum(float(item.amount) for item in billing if item.status == "paid" and anchor <= item.billed_on < next_month)
            website_total = sum(float(item.grand_total) for item in pos_transactions if anchor <= item.created_at.date() < next_month)
            revenue_over_time.append({"label": anchor.strftime("%b"), "clinic": round(clinic_total), "website": round(website_total)})

        service_totals = {}
        for record in billing:
            service_totals.setdefault(record.service_name or "Other", 0)
            service_totals[record.service_name or "Other"] += float(record.amount)
        if pos_transactions:
            service_totals["POS Sales"] = sum(float(item.grand_total) for item in pos_transactions)
        revenue_by_service = [{"label": key, "value": round(value)} for key, value in service_totals.items()]

        billing_status = {
            "paid": sum(1 for item in billing if item.status == "paid"),
            "pending": sum(1 for item in billing if item.status == "pending"),
            "overdue": sum(1 for item in billing if item.status == "overdue"),
        }

        inventory_value = {}
        for item in inventory:
            inventory_value.setdefault(item.category or "Other", 0)
            inventory_value[item.category or "Other"] += float(item.unit_price) * item.stock
        inventory_value_payload = [{"label": key, "value": round(value)} for key, value in inventory_value.items()]

        top_drugs_map = {}
        for transaction_entry in pos_transactions:
            for line in transaction_entry.items or []:
                name = line.get("name") or "Unknown"
                top_drugs_map.setdefault(name, {"name": name, "dispensed": 0, "revenue": 0})
                top_drugs_map[name]["dispensed"] += int(line.get("qty") or 0)
                top_drugs_map[name]["revenue"] += float(line.get("line_total") or line.get("total") or 0)
        top_drugs = sorted(top_drugs_map.values(), key=lambda item: (-item["dispensed"], -item["revenue"], item["name"]))[:5]

        appointment_volume = []
        start_day = today - timedelta(days=5)
        for offset in range(6):
            day = start_day + timedelta(days=offset)
            appointment_volume.append(
                {
                    "label": day.strftime("%a"),
                    "count": sum(1 for item in appointments if item.scheduled_for and item.scheduled_for.date() == day),
                }
            )

        website_total = sum(float(item.grand_total) for item in pos_transactions)
        website_month_total = sum(
            float(item.grand_total)
            for item in pos_transactions
            if item.created_at.date().year == today.year and item.created_at.date().month == today.month
        )
        top_products = [{"name": item["name"], "orders": item["dispensed"], "revenue": round(item["revenue"])} for item in top_drugs[:3]]

        return Response(
            {
                "revenue_over_time": revenue_over_time,
                "revenue_by_service": revenue_by_service,
                "billing_status": billing_status,
                "inventory_value": inventory_value_payload,
                "top_drugs": [{"name": item["name"], "dispensed": item["dispensed"], "revenue": round(item["revenue"])} for item in top_drugs],
                "appointment_volume": appointment_volume,
                "website_earnings": {
                    "total": round(website_total),
                    "this_month": round(website_month_total),
                    "orders": len(pos_transactions),
                    "avg_order": round(website_total / len(pos_transactions)) if pos_transactions else 0,
                    "top_products": top_products,
                },
            }
        )

