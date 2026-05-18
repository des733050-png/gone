from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.dateparse import parse_date, parse_datetime, parse_time
from django.utils import timezone
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    BookingSource,
    FacilitySpecialty,
    PatientBooking,
    PatientFacilityAccess,
    PatientProfile,
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
    ProviderVerificationDocument,
    ProviderVerificationDocumentType,
    ProviderVerificationStatus,
    ProviderVerificationSubmission,
    Specialization,
    SpecializationRequest,
    SpecializationRequestStatus,
    WorkflowStatus,
)
from portal_api.utils import (
    ACCESS_RESTRICTED,
    build_provider_payload,
    build_provider_verification_payload,
    calculate_age,
    format_uuid,
    get_staff_membership,
    is_provider_verified,
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


class ProviderVerificationRequired(APIException):
    status_code = 403
    default_code = "VERIFICATION_REQUIRED"

    def __init__(self, verification_payload):
        self.detail = {
            "success": False,
            "error": "Verification required",
            "code": "VERIFICATION_REQUIRED",
            "data": {
                "verification_status": verification_payload["verification_status"],
                "access": ACCESS_RESTRICTED,
            },
        }
        Exception.__init__(self, self.detail)


def ensure_provider_membership(user, enforce_verification=True):
    membership = get_staff_membership(user)
    if membership is None:
        raise NotFound(
            "Provider membership not found. Use a facility staff account (e.g. demo "
            "facility admin from seed_demo_data), not a patient-only login."
        )
    if enforce_verification and not is_provider_verified(membership.facility):
        raise ProviderVerificationRequired(
            build_provider_verification_payload(membership.facility)
        )
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
    """
    Canonical 5-state mapping (matches the patient/provider UI):
      pending  | rejected | cancelled | confirmed | in_progress | completed
    Note: 'rejected' and 'cancelled' are kept distinct on the wire so the
    frontend can show the precise reason, but the UI groups them as one tab.
    """
    if appointment.status == WorkflowStatus.CANCELLED:
        return "cancelled"
    if appointment.status == WorkflowStatus.REJECTED:
        return "rejected"
    if appointment.status == WorkflowStatus.COMPLETED:
        return "completed"
    if appointment.status == WorkflowStatus.IN_PROGRESS:
        return "in_progress"
    if appointment.status == WorkflowStatus.CONFIRMED:
        return "confirmed"
    # DRAFT, IDLE, unassigned (provider_id None) → pending approval
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
        "facility_specialty_id": format_uuid(provider.facility_specialty_id)
        if provider and provider.facility_specialty_id
        else None,
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


def resolve_staff_doctor_specialty(facility, data, *, allow_empty=False):
    """Map API fields to a FacilitySpecialty + display name for doctor profiles."""
    fs_id = str(data.get("facility_specialty_id") or "").strip()
    new_name = str(data.get("new_specialty_name") or "").strip()
    legacy = str(data.get("specialty") or "").strip()
    if not fs_id and not new_name and not legacy:
        if allow_empty:
            return None, ""
        raise ValidationError(
            {
                "specialty": "Specialty is required (choose a catalog entry or enter a new name)."
            }
        )
    if fs_id:
        fs = FacilitySpecialty.objects.filter(pk=fs_id, facility=facility).first()
        if not fs:
            raise ValidationError(
                {"facility_specialty_id": "Unknown specialty for this facility."}
            )
        return fs, fs.name
    if new_name:
        fs = FacilitySpecialty.resolve_for_facility(facility, new_name)
        if not fs:
            raise ValidationError({"new_specialty_name": "Specialty name is required."})
        return fs, fs.name
    fs = FacilitySpecialty.resolve_for_facility(facility, legacy)
    return fs, (fs.name if fs else legacy[:120])


class SpecializationListView(APIView):
    """
    GET /api/v1/specializations/
    Public — returns the platform-wide active specialization catalogue.
    Used by both the provider portal (assign dropdown) and patient portal
    (doctor search filter).
    """
    permission_classes = []  # public

    def get(self, request):
        qs = Specialization.objects.filter(is_active=True).order_by("name")
        return Response([
            {
                "id":          format_uuid(s.id),
                "name":        s.name,
                "slug":        s.slug,
                "description": s.description,
            }
            for s in qs
        ])


class SpecializationRequestView(APIView):
    """
    GET  /api/v1/provider/specialization-requests/  — list this facility's requests
    POST /api/v1/provider/specialization-requests/  — submit a new request
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        qs = SpecializationRequest.objects.filter(
            facility=membership.facility
        ).select_related("specialization")
        return Response([
            {
                "id":             format_uuid(r.id),
                "name":           r.name,
                "reason":         r.reason,
                "status":         r.status,
                "review_note":    r.review_note,
                "specialization": (
                    {
                        "id":   format_uuid(r.specialization.id),
                        "name": r.specialization.name,
                    }
                    if r.specialization else None
                ),
                "created_at": r.created_at.isoformat(),
            }
            for r in qs
        ])

    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})

        name   = str((request.data or {}).get("name")   or "").strip()
        reason = str((request.data or {}).get("reason") or "").strip()

        if len(name) < 2:
            raise ValidationError({"name": "Specialization name must be at least 2 characters."})

        # Reject if the name already exists in the master catalogue (case-insensitive).
        if Specialization.objects.filter(name__iexact=name, is_active=True).exists():
            raise ValidationError({
                "name": (
                    "This specialization already exists in the catalogue. "
                    "Assign it directly from the specialization list."
                )
            })

        # Prevent duplicate pending requests from the same facility.
        existing = SpecializationRequest.objects.filter(
            facility=membership.facility,
            name__iexact=name,
            status=SpecializationRequestStatus.PENDING,
        ).first()
        if existing:
            raise ValidationError({
                "name": "A pending request for this name already exists. Please wait for review."
            })

        req = SpecializationRequest.objects.create(
            facility=membership.facility,
            requested_by=request.user,
            name=name,
            reason=reason,
            status=SpecializationRequestStatus.PENDING,
        )
        return Response(
            {
                "id":         format_uuid(req.id),
                "name":       req.name,
                "reason":     req.reason,
                "status":     req.status,
                "review_note": "",
                "created_at": req.created_at.isoformat(),
            },
            status=201,
        )


class ProviderFacilitySpecialtiesView(APIView):
    """
    GET  /api/v1/provider/specialties/ — list this facility's assigned specializations
    POST /api/v1/provider/specialties/ — assign a specialization from the master list
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        rows = (
            FacilitySpecialty.objects
            .filter(facility=membership.facility)
            .select_related("specialization")
            .order_by("name")
        )
        return Response([
            {
                "id":   format_uuid(s.id),
                "name": s.name,
                "specialization_id": (
                    format_uuid(s.specialization.id) if s.specialization else None
                ),
            }
            for s in rows
        ])

    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})

        specialization_id = str((request.data or {}).get("specialization_id") or "").strip()

        if not specialization_id:
            raise ValidationError({
                "specialization_id": "A specialization_id from the master catalogue is required."
            })

        # Look up the specialization from the master list.
        try:
            spec = Specialization.objects.get(pk=specialization_id, is_active=True)
        except (Specialization.DoesNotExist, Exception):
            raise ValidationError({
                "specialization_id": "Specialization not found or is inactive."
            })

        fs = FacilitySpecialty.assign_from_specialization(membership.facility, spec)
        return Response(
            {
                "id":   format_uuid(fs.id),
                "name": fs.name,
                "specialization_id": format_uuid(spec.id),
            },
            status=201,
        )


class ProviderFacilitySpecialtyDetailView(APIView):
    """DELETE /api/v1/provider/specialties/<id>/ — remove a specialty assignment if unused."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, specialty_id):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        fs = FacilitySpecialty.objects.filter(
            pk=specialty_id, facility=membership.facility
        ).first()
        if fs is None:
            raise NotFound("Specialty not found.")
        if ProviderProfile.objects.filter(
            facility=membership.facility, facility_specialty=fs
        ).exists():
            raise ValidationError(
                {"detail": "Reassign doctors to another specialty before removing this one."}
            )
        fs.delete()
        return Response(status=204)


def build_appointment_payload(appointment):
    patient = appointment.patient
    facility = appointment.facility
    doctor_id = provider_membership_uid_for_profile(appointment.provider, facility)
    patient_booking_ref = None
    if hasattr(appointment, "patient_booking") and appointment.patient_booking_id:
        patient_booking_ref = appointment.patient_booking.booking_ref
    return {
        "id": format_uuid(appointment.id),
        "reference": appointment.appointment_ref,
        "patient_booking_ref": patient_booking_ref,
        "patient": patient.full_name if patient else "Walk-in Patient",
        "patient_id": patient.patient_code if patient else None,
        "doctor_id": doctor_id,
        "doctor_name": appointment.provider.full_name if appointment.provider else None,
        "provider_code": appointment.provider.provider_code if appointment.provider else None,
        "age": calculate_age(patient.date_of_birth) if patient else None,
        "type": appointment.appointment_type or "In Facility",
        "time": compact_time_label(appointment.scheduled_for),
        "date": compact_day_label(appointment.scheduled_for),
        "scheduled_for": appointment.scheduled_for.isoformat() if appointment.scheduled_for else None,
        "status": workflow_to_appointment_status(appointment),
        "source": appointment.source,
        "source_label": appointment.get_source_display(),
        "reason": appointment.visit_reason,
        "phone": appointment.patient_phone or (patient.phone if patient else ""),
        "email": patient.email if patient else "",
    }


def _patient_booking_status_for_provider(booking):
    """Map PatientBooking WorkflowStatus to one of the 5 canonical states:
    pending | rejected | cancelled | confirmed | in_progress | completed."""
    s = booking.status
    if s == WorkflowStatus.CANCELLED:   return "cancelled"
    if s == WorkflowStatus.REJECTED:    return "rejected"
    if s == WorkflowStatus.COMPLETED:   return "completed"
    if s == WorkflowStatus.IN_PROGRESS: return "in_progress"
    if s == WorkflowStatus.CONFIRMED:   return "confirmed"
    return "pending"  # DRAFT / IDLE / anything else


def _build_patient_booking_as_appointment(booking):
    """Convert a patient-created PatientBooking into the same dict shape as build_appointment_payload."""
    patient = booking.patient
    provider = booking.provider
    return {
        "id": format_uuid(booking.id),
        "reference": booking.booking_ref,
        "appointment_ref": booking.booking_ref,
        "patient_booking_ref": booking.booking_ref,
        "patient": patient.full_name if patient else "Patient",
        "patient_id": patient.patient_code if patient else None,
        "doctor_id": provider_membership_uid_for_profile(provider, booking.facility) if provider else None,
        "doctor_name": provider.full_name if provider else None,
        "provider_code": provider.provider_code if provider else None,
        "age": calculate_age(patient.date_of_birth) if patient else None,
        "type": booking.appointment_type or "In Facility",
        "time": compact_time_label(booking.scheduled_for),
        "date": compact_day_label(booking.scheduled_for),
        "scheduled_for": booking.scheduled_for.isoformat() if booking.scheduled_for else None,
        "status": _patient_booking_status_for_provider(booking),
        "source": booking.source or "patient",
        "source_label": "Patient",
        "reason": booking.notes or "",
        "phone": patient.phone if patient else "",
        "email": patient.email if patient else "",
        "_is_patient_booking": True,  # flag so frontend can use booking_ref for confirm/reject
    }


def build_consultation_payload(consultation):
    facility = consultation.facility or (consultation.appointment.facility if consultation.appointment else None)
    doctor_id = provider_membership_uid_for_profile(consultation.provider, facility)
    # Compute whether the consultation is still within the admin-configured
    # edit window so the UI can disable the Save button when locked.
    edit_window_hours = 24
    if facility is not None:
        edit_window_hours = (
            ProviderClinicalSetting.objects.filter(facility=facility)
            .values_list("edit_window_hours", flat=True)
            .first()
            or 24
        )
    is_editable = False
    if consultation.consulted_at:
        is_editable = consultation.consulted_at >= (
            timezone.now() - timedelta(hours=edit_window_hours)
        )
    return {
        "id": format_uuid(consultation.id),
        "reference": consultation.consultation_ref,
        "patient_id": consultation.patient.patient_code if consultation.patient else None,
        "doctor_id": doctor_id,
        "doctor_name": consultation.provider.full_name if consultation.provider else "Care Team",
        "date": compact_day_label(consultation.consulted_at),
        "created_at": consultation.consulted_at.isoformat() if consultation.consulted_at else consultation.created_at.isoformat(),
        "type": consultation.consultation_type or "In Facility",
        "subjective": consultation.subjective,
        "objective": consultation.objective,
        "assessment": consultation.assessment,
        "plan": consultation.plan,
        "uploaded_files": consultation.uploaded_files or [],
        # UI gating — see ProviderConsultationDetailView.patch
        "is_editable": is_editable,
        "edit_window_hours": edit_window_hours,
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
        "icon": notification.icon_name,
        "lib": notification.icon_lib,
        "title": notification.title,
        "msg": notification.message,
        "time": compact_datetime_label(notification.created_at),
        "read": notification.read,
        "color": notification.color,
    }


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


def parse_scheduled_for(data):
    scheduled_for = data.get("scheduled_for")
    if scheduled_for:
        parsed = parse_datetime(str(scheduled_for))
        if parsed is None:
            raise ValidationError({"scheduled_for": "Use ISO datetime format."})
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed

    date_value = data.get("date")
    time_value = data.get("time")
    if not date_value and not time_value:
        return None
    parsed_date = parse_date(str(date_value or ""))
    parsed_time = parse_time(str(time_value or ""))
    if parsed_date is None or parsed_time is None:
        raise ValidationError({"scheduled_for": "Use YYYY-MM-DD date and HH:MM time."})
    return timezone.make_aware(
        datetime.combine(parsed_date, parsed_time),
        timezone.get_current_timezone(),
    )


def resolve_patient_for_appointment(facility, patient_ref):
    if not patient_ref:
        return None
    patient = _lookup_by_id_or_code(
        PatientProfile.objects.all(),
        str(patient_ref).strip(),
        "patient_code",
        "Patient not found.",
    )
    # Cross-facility booking support: when a provider books an existing patient
    # from another facility, grant active access to the provider's facility so
    # the patient appears in this facility context and linked records are valid.
    access_row, _ = PatientFacilityAccess.objects.get_or_create(
        patient=patient,
        facility=facility,
        defaults={"is_default": False, "is_active": True},
    )
    if not access_row.is_active:
        access_row.is_active = True
        access_row.save(update_fields=["is_active", "updated_at"])
    return patient


def apply_appointment_payload(appointment, membership, data):
    if "doctor_id" in data:
        doctor_id = str(data.get("doctor_id") or "").strip()
        if not doctor_id:
            appointment.provider = None
        else:
            doctor_membership = resolve_provider_membership_for_portal_id(
                membership.facility, doctor_id, ProviderSubRole.DOCTOR
            )
            appointment.provider = doctor_membership.provider

    if "patient_id" in data:
        appointment.patient = resolve_patient_for_appointment(
            membership.facility,
            data.get("patient_id"),
        )

    scheduled_for = parse_scheduled_for(data)
    if scheduled_for is not None:
        appointment.scheduled_for = scheduled_for

    for payload_name, model_field in [
        ("type", "appointment_type"),
        ("appointment_type", "appointment_type"),
        ("phone", "patient_phone"),
        ("patient_phone", "patient_phone"),
        ("reason", "visit_reason"),
        ("visit_reason", "visit_reason"),
        ("notes", "notes"),
    ]:
        if payload_name in data:
            setattr(appointment, model_field, str(data.get(payload_name) or "").strip())

    if "status" in data:
        requested_status = str(data.get("status") or "").strip()
        status_map = {
            "confirmed": WorkflowStatus.CONFIRMED,
            "cancelled": WorkflowStatus.CANCELLED,
            "unassigned": WorkflowStatus.DRAFT,
            "pending": WorkflowStatus.DRAFT,
            "completed": WorkflowStatus.COMPLETED,
        }
        appointment.status = status_map.get(requested_status, appointment.status)


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
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        return Response(build_provider_payload(membership))

    @transaction.atomic
    def patch(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        user = membership.user
        provider = membership.provider or ensure_membership_profile(membership)
        data = request.data or {}

        old_first = user.first_name
        old_last = user.last_name
        first_name = str(data.get("first_name", user.first_name)).strip()
        last_name = str(data.get("last_name", user.last_name)).strip()

        # Provider can edit name ONLY ONCE. After the first change, name_locked
        # is true; further requests must keep the existing name. Specialty +
        # facility are always read-only here (only facility admins can change
        # specialty via dedicated endpoints).
        name_locked = bool(getattr(provider, "name_locked", False)) if provider else False
        if name_locked and ((first_name, last_name) != (old_first, old_last)):
            raise ValidationError({
                "name": "Name has already been changed once. Contact your facility admin to make further changes."
            })

        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        if not last_name:
            raise ValidationError({"last_name": "Last name is required."})

        # Normalize phone to E.164 (Kenya) — accepts 0712…, 254…, +254… inputs.
        from portal_api.utils import normalize_kenya_phone
        raw_phone = str(data.get("phone", provider.phone if provider else "")).strip()
        if raw_phone:
            try:
                phone = normalize_kenya_phone(raw_phone)
            except ValueError as exc:
                raise ValidationError({"phone": str(exc)})
        else:
            phone = ""

        user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=["first_name", "last_name"])

        if provider:
            provider.full_name = f"{first_name} {last_name}".strip()
            provider.phone = phone
            # Specialty is intentionally NOT updatable here — only facility
            # admins set it via the staff/specialty endpoints.
            update_fields = ["full_name", "phone"]
            if not name_locked and (first_name, last_name) != (old_first, old_last):
                provider.name_locked = True
                update_fields.append("name_locked")
            provider.save(update_fields=update_fields)

        membership.refresh_from_db()
        return Response(build_provider_payload(membership))


class ProviderVerificationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        verification = build_provider_verification_payload(membership.facility)
        return Response(
            {
                "success": True,
                "data": verification,
                "message": "Provider verification status retrieved.",
            }
        )


class ProviderOnboardingStateView(APIView):
    """
    GET   /api/v1/provider/onboarding/  → returns { completed: bool, should_show: bool }
    PATCH /api/v1/provider/onboarding/  → mark onboarding completed/dismissed

    `should_show` is true when:
      - the facility's verification status is VERIFIED
      - the membership has not yet completed/dismissed onboarding
    """
    permission_classes = [IsAuthenticated]

    def _payload(self, membership):
        from portal_api.utils import build_provider_verification_payload
        verification = build_provider_verification_payload(membership.facility)
        is_verified = verification.get("verification_status") == ProviderVerificationStatus.VERIFIED
        return {
            "completed": bool(getattr(membership, "onboarding_completed", False)),
            "should_show": is_verified and not getattr(membership, "onboarding_completed", False),
            "verification_status": verification.get("verification_status"),
        }

    def get(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        return Response(self._payload(membership))

    def patch(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        completed = bool((request.data or {}).get("completed", True))
        membership.onboarding_completed = completed
        membership.save(update_fields=["onboarding_completed", "updated_at"])
        return Response(self._payload(membership))


class ProviderVerificationSubmitView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get(self, request):
        """
        Defensive GET handler — returns the current verification status so that
        any client which accidentally GETs this URL receives useful data instead
        of an opaque 405.  The canonical read endpoint is GET /verification/,
        but this alias prevents error banners when the browser or a retry path
        sends a GET here.
        """
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        return Response(
            {
                "success": True,
                "data": build_provider_verification_payload(membership.facility),
                "message": "Provider verification status retrieved.",
            }
        )

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})

        verification = build_provider_verification_payload(membership.facility)
        if not verification["can_upload_verification_documents"]:
            return Response(
                {
                    "success": False,
                    "error": "Verification documents cannot be uploaded right now.",
                    "code": "VERIFICATION_UPLOAD_LOCKED",
                    "data": verification,
                },
                status=409,
            )

        # Accept loose aliases (case-insensitive, dashes/spaces → underscores).
        raw_type = str(request.data.get("document_type") or "").strip()
        normalized = raw_type.upper().replace("-", "_").replace(" ", "_")
        # Friendly aliases used by older clients
        alias = {
            "REG":          "REGISTRATION_CERTIFICATE",
            "REGISTRATION": "REGISTRATION_CERTIFICATE",
            "LICENSE":      "OPERATING_LICENSE",
            "LICENCE":      "OPERATING_LICENSE",
            "TAX":          "TAX_COMPLIANCE",
            "ACCRED":       "ACCREDITATION",
        }
        document_type = alias.get(normalized, normalized)
        valid_types = {choice[0] for choice in ProviderVerificationDocumentType.choices}
        if document_type not in valid_types:
            return Response(
                {
                    "success": False,
                    "error": (
                        f"Invalid document type '{raw_type}'. "
                        f"Allowed: {sorted(valid_types)}."
                    ),
                    "code": "INVALID_DOCUMENT",
                },
                status=400,
            )

        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            return Response(
                {
                    "success": False,
                    "error": "Verification document file is required.",
                    "code": "INVALID_DOCUMENT",
                },
                status=400,
            )

        # ── Find or create the active submission ─────────────────────────────
        # CRITICAL: we must never create a new submission per-file upload.
        # Each file in a batch belongs to the SAME submission so that:
        #   1. Sequential multi-file uploads work without hitting the lock.
        #   2. The admin sees the full document set for one submission.
        #   3. Rollback (delete) targets the right submission.
        #
        # Strategy:
        #   UNVERIFIED (no prior submission) → create new PENDING submission.
        #   PENDING (batch in progress / partial reload) → reuse, replace same doc type.
        #   REJECTED → create a new PENDING submission for the re-submission.
        #   VERIFIED  → blocked above by can_upload_verification_documents check.

        existing_submission = (
            ProviderVerificationSubmission.objects
            .filter(facility=membership.facility)
            .exclude(status=ProviderVerificationStatus.VERIFIED)
            .order_by("-created_at")
            .first()
        )

        if existing_submission is None:
            # First upload ever for this facility.
            submission = ProviderVerificationSubmission.objects.create(
                facility=membership.facility,
                submitted_by=request.user,
                status=ProviderVerificationStatus.PENDING,
            )
        elif existing_submission.status == ProviderVerificationStatus.REJECTED:
            # Provider re-submitting after rejection → new submission record.
            submission = ProviderVerificationSubmission.objects.create(
                facility=membership.facility,
                submitted_by=request.user,
                status=ProviderVerificationStatus.PENDING,
            )
        else:
            # PENDING (batch already started or resumed after reload) → reuse.
            submission = existing_submission
            # Update submitter if a different admin finishes the batch.
            if submission.submitted_by_id != request.user.pk:
                submission.submitted_by = request.user
                submission.save(update_fields=["submitted_by", "updated_at"])

        # ── Add / replace the document for this type ──────────────────────
        # If the provider re-selects the same doc type (Replace button), delete
        # the old record + stored file first so we don't accumulate duplicates.
        old_doc = (
            ProviderVerificationDocument.objects
            .filter(submission=submission, document_type=document_type)
            .first()
        )
        if old_doc:
            try:
                old_doc.file.delete(save=False)
            except Exception:
                pass
            old_doc.delete()

        ProviderVerificationDocument.objects.create(
            submission=submission,
            document_type=document_type,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            content_type=getattr(uploaded_file, "content_type", "") or "",
            file_size=getattr(uploaded_file, "size", 0) or 0,
            locked=True,
        )

        # TODO: send verification submission notifications via email_utils.send_email.
        return Response(
            {
                "success": True,
                "data": build_provider_verification_payload(membership.facility),
                "message": "Verification document uploaded.",
            },
            status=201,
        )


class ProviderVerificationDocumentDeleteView(APIView):
    """
    DELETE /api/v1/provider/verification/document/<doc_type>/

    Removes a single verification document (and its parent submission if it
    becomes empty) so the frontend can roll back a failed batch upload.

    Allowed when the facility has NOT yet been VERIFIED — including PENDING
    (the document was just uploaded and an immediate rollback is needed).
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request, doc_type):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})

        verification = build_provider_verification_payload(membership.facility)
        if verification["verification_status"] == ProviderVerificationStatus.VERIFIED:
            return Response(
                {
                    "success": False,
                    "error": "Cannot remove documents after the facility has been verified.",
                    "code": "VERIFICATION_LOCKED",
                },
                status=409,
            )

        # Normalise doc_type with the same aliases as the submit view.
        normalized = str(doc_type).upper().replace("-", "_").replace(" ", "_")
        alias = {
            "REG":          "REGISTRATION_CERTIFICATE",
            "REGISTRATION": "REGISTRATION_CERTIFICATE",
            "LICENSE":      "OPERATING_LICENSE",
            "LICENCE":      "OPERATING_LICENSE",
            "TAX":          "TAX_COMPLIANCE",
            "ACCRED":       "ACCREDITATION",
        }
        doc_type_key = alias.get(normalized, normalized)

        doc = (
            ProviderVerificationDocument.objects
            .filter(submission__facility=membership.facility, document_type=doc_type_key)
            .order_by("-created_at")
            .select_related("submission")
            .first()
        )
        if doc is None:
            return Response(
                {"success": False, "error": "Document not found.", "code": "NOT_FOUND"},
                status=404,
            )

        submission = doc.submission
        # Delete the stored file from disk/storage before removing the DB row.
        try:
            doc.file.delete(save=False)
        except Exception:
            pass
        doc.delete()

        # Clean up the parent submission if it has no remaining documents.
        if not submission.documents.exists():
            submission.delete()

        return Response(
            {
                "success": True,
                "message": f"Document '{doc_type_key}' removed.",
                "data": build_provider_verification_payload(membership.facility),
            }
        )


class ProviderAppointmentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user)
        # ?bin=1 returns the recycle bin (soft-deleted only). Default excludes soft-deleted.
        show_bin = str(request.query_params.get("bin") or "").lower() in {"1", "true", "yes"}
        queryset = ProviderAppointment.objects.select_related("provider", "patient", "facility").filter(
            facility=membership.facility
        )
        if show_bin:
            queryset = queryset.filter(deleted_at__isnull=False)
        else:
            queryset = queryset.filter(deleted_at__isnull=True)
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            queryset = queryset.filter(provider=membership.provider)
        queryset = queryset.order_by("scheduled_for", "created_at")
        results = [build_appointment_payload(item) for item in queryset]

        # Also include patient-created PatientBookings that have NO linked
        # ProviderAppointment yet — so staff see them across ALL statuses
        # (pending approval, rejected, confirmed, in_progress, completed).
        # Without this, rejecting/confirming a patient-only booking would
        # cause it to vanish from the provider list entirely.
        linked_booking_ids = set(
            queryset.exclude(patient_booking=None).values_list("patient_booking_id", flat=True)
        )
        unlinked_bookings = PatientBooking.objects.select_related(
            "patient", "facility", "provider"
        ).filter(
            facility=membership.facility,
            source="patient",
            deleted_at__isnull=(not show_bin),
        ).exclude(id__in=linked_booking_ids)
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            unlinked_bookings = unlinked_bookings.filter(provider=membership.provider)

        for bk in unlinked_bookings:
            results.append(_build_patient_booking_as_appointment(bk))

        # Sort combined list by scheduled_for ascending (None last)
        results.sort(key=lambda r: (r.get("scheduled_for") or "9999", r.get("reference") or ""))
        return Response(results)

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.RECEPTIONIST, ProviderSubRole.DOCTOR},
        )

        # Doctors are locked to themselves
        data = dict(request.data or {})
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            uid = provider_membership_uid_for_profile(membership.provider, membership.facility)
            if uid:
                data.setdefault("doctor_id", uid)

        source = (
            BookingSource.DOCTOR
            if membership.role == ProviderSubRole.DOCTOR
            else BookingSource.PROVIDER
        )

        appointment = ProviderAppointment(
            appointment_ref=next_identifier(ProviderAppointment, "appointment_ref", "APT-"),
            facility=membership.facility,
            status=WorkflowStatus.CONFIRMED,
            source=source,
        )
        apply_appointment_payload(appointment, membership, data)
        appointment.save()

        # Create a linked PatientBooking so patient can see the appointment
        if appointment.patient_id:
            booking = PatientBooking(
                booking_ref=next_identifier(PatientBooking, "booking_ref", "BKG-"),
                patient=appointment.patient,
                facility=membership.facility,
                provider=appointment.provider,
                status=WorkflowStatus.CONFIRMED,
                source=source,
                service_type="Consultation",
                appointment_type=appointment.appointment_type or "In Facility",
                provider_name=appointment.provider.full_name if appointment.provider else "",
                provider_specialty=(
                    appointment.provider.specialty or appointment.provider.facility_specialty.name
                    if appointment.provider and appointment.provider.facility_specialty
                    else (appointment.provider.specialty if appointment.provider else "")
                ),
                scheduled_for=appointment.scheduled_for,
                notes=appointment.visit_reason or appointment.notes,
            )
            booking.save()
            appointment.patient_booking = booking
            appointment.save(update_fields=["patient_booking", "updated_at"])

            # Notify the patient about this provider-created appointment
            from portal_api.patient_booking_views import _next_notification_code
            from core.models import PatientPortalNotification
            creator_role = "Doctor" if source == BookingSource.DOCTOR else "Clinic staff"
            sched_str = ""
            if appointment.scheduled_for:
                sched_str = appointment.scheduled_for.strftime("%a, %b %d at %I:%M %p")
            PatientPortalNotification.objects.create(
                notification_code=_next_notification_code(),
                patient=appointment.patient,
                facility=membership.facility,
                kind="appointment",
                title="New appointment scheduled",
                body=(
                    f"{creator_role} has booked an appointment for you"
                    + (f" on {sched_str}" if sched_str else "")
                    + f". Reference: {booking.booking_ref}."
                ),
                icon_lib="feather",
                icon_name="calendar",
                read=False,
            )

        appointment.refresh_from_db()
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
        apply_appointment_payload(appointment, membership, data)
        appointment.save()
        appointment.refresh_from_db()
        return Response(build_appointment_payload(appointment))

    @transaction.atomic
    def delete(self, request, appointment_ref):
        # NOTE: this is a SOFT delete. The appointment is moved to the
        # recycle bin (deleted_at = now). Hard delete only happens via the
        # purge_recycle_bin management command after 90 days.
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.RECEPTIONIST},
        )
        now = timezone.now()
        appointment = ProviderAppointment.objects.select_related("patient_booking").filter(
            facility=membership.facility,
            appointment_ref=appointment_ref,
        ).first()
        if appointment is not None:
            appointment.deleted_at = now
            appointment.notes = (appointment.notes or "") + (
                f"\nDELETE|by={request.user.email or request.user.get_username()}|at={now.isoformat()}"
            )
            appointment.save(update_fields=["deleted_at", "notes", "updated_at"])
            # Also soft-delete the linked PatientBooking so the patient stops
            # seeing it (they can ask to restore via support).
            if appointment.patient_booking_id:
                booking = appointment.patient_booking
                booking.deleted_at = now
                booking.save(update_fields=["deleted_at", "updated_at"])
            response_payload = build_appointment_payload(appointment)
            reference_for_log = appointment.appointment_ref
        else:
            booking = PatientBooking.objects.select_related("patient", "facility", "provider").filter(
                facility=membership.facility,
                booking_ref=appointment_ref,
            ).first()
            if booking is None:
                raise NotFound("Appointment not found.")
            booking.deleted_at = now
            booking.notes = (booking.notes or "") + (
                f"\nDELETE|by={request.user.email or request.user.get_username()}|at={now.isoformat()}"
            )
            booking.save(update_fields=["deleted_at", "notes", "updated_at"])
            response_payload = _build_patient_booking_as_appointment(booking)
            reference_for_log = booking.booking_ref
        log_provider_activity(
            request.user,
            membership,
            {
                "module": "Appointments",
                "action": "appointment_soft_deleted",
                "detail": f"reference={reference_for_log}",
                "type": "appointments",
            },
        )
        return Response(response_payload)


class ProviderAppointmentRestoreView(APIView):
    """POST /api/v1/provider/appointments/<ref>/restore/ — bring back from recycle bin."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, appointment_ref):
        membership = ensure_provider_membership(request.user)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.RECEPTIONIST},
        )
        appointment = ProviderAppointment.objects.select_related("patient_booking").filter(
            facility=membership.facility, appointment_ref=appointment_ref,
        ).first()
        if appointment is not None:
            if appointment.deleted_at is None:
                raise NotFound("Appointment is not in the recycle bin.")
            appointment.deleted_at = None
            appointment.notes = (appointment.notes or "") + (
                f"\nRESTORE|by={request.user.email or request.user.get_username()}"
                f"|at={timezone.now().isoformat()}"
            )
            appointment.save(update_fields=["deleted_at", "notes", "updated_at"])
            if appointment.patient_booking_id:
                booking = appointment.patient_booking
                booking.deleted_at = None
                booking.save(update_fields=["deleted_at", "updated_at"])
            response_payload = build_appointment_payload(appointment)
            reference_for_log = appointment.appointment_ref
        else:
            booking = PatientBooking.objects.select_related("patient", "facility", "provider").filter(
                facility=membership.facility,
                booking_ref=appointment_ref,
            ).first()
            if booking is None or booking.deleted_at is None:
                raise NotFound("Appointment is not in the recycle bin.")
            booking.deleted_at = None
            booking.notes = (booking.notes or "") + (
                f"\nRESTORE|by={request.user.email or request.user.get_username()}"
                f"|at={timezone.now().isoformat()}"
            )
            booking.save(update_fields=["deleted_at", "notes", "updated_at"])
            response_payload = _build_patient_booking_as_appointment(booking)
            reference_for_log = booking.booking_ref
        log_provider_activity(
            request.user,
            membership,
            {
                "module": "Appointments",
                "action": "appointment_restored",
                "detail": f"reference={reference_for_log}",
                "type": "appointments",
            },
        )
        return Response(response_payload)


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
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        ensure_roles(
            membership,
            {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.BILLING_MANAGER},
        )
        queryset = ProviderBillingRecord.objects.filter(facility=membership.facility)
        return Response([build_billing_payload(item) for item in queryset])


class ProviderBillingPayView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, billing_code):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
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
        ensure_provider_membership(request.user, enforce_verification=False)
        queryset = ProviderPortalNotification.objects.filter(user=request.user).order_by("-created_at")
        return Response([build_notification_payload(item) for item in queryset])


class ProviderNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_code):
        ensure_provider_membership(request.user, enforce_verification=False)
        notification = get_notification_or_raise(request.user, notification_code)
        notification.read = True
        notification.save(update_fields=["read", "updated_at"])
        return Response(build_notification_payload(notification))


class ProviderNotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ensure_provider_membership(request.user, enforce_verification=False)
        ProviderPortalNotification.objects.filter(user=request.user, read=False).update(
            read=True, updated_at=timezone.now()
        )
        return Response({"detail": "Notifications updated."})


class ProviderAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
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
        membership = ensure_provider_membership(request.user, enforce_verification=False)
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

        from portal_api.patient_booking_views import _normalize_type
        day = (slot.get("day") or "").strip()
        start = (slot.get("start") or "").strip()
        end = (slot.get("end") or "").strip()
        # Always store the normalized type so filters always match.
        slot_type = _normalize_type(slot.get("type") or "in_facility") or "in_facility"

        if not day:
            raise ValidationError({"day": "Day is required."})
        if not start or not end:
            raise ValidationError({"time": "Both start and end times are required."})

        # 1. Block on blocked-day — must unblock first
        if day in (availability.blocked_days or []):
            raise ValidationError({"day": f"{day} is currently blocked. Unblock the day before adding slots."})

        # 2. Validate HH:MM format and 30-min boundaries
        def _to_minutes(s):
            try:
                h, m = [int(x) for x in s.split(":")[:2]]
                if 0 <= h <= 23 and 0 <= m <= 59:
                    return h * 60 + m
            except (ValueError, IndexError):
                pass
            return None

        s_min = _to_minutes(start)
        e_min = _to_minutes(end)
        if s_min is None or e_min is None:
            raise ValidationError({"time": "Use HH:MM format, e.g. 09:00."})
        if e_min - s_min < 30:
            raise ValidationError({"time": "Slot must be at least 30 minutes long."})
        if (s_min % 30) != 0 or (e_min % 30) != 0:
            raise ValidationError({"time": "Use 30-minute boundaries (e.g. 09:00, 09:30)."})

        # 3. Overlap check — slots on the same day cannot overlap, even if types differ.
        for existing in (availability.slots or []):
            if (existing.get("day") or "") != day:
                continue
            ex_s = _to_minutes(existing.get("start") or "")
            ex_e = _to_minutes(existing.get("end") or "")
            if ex_s is None or ex_e is None:
                continue
            # Overlap if [s_min, e_min) intersects [ex_s, ex_e)
            if s_min < ex_e and ex_s < e_min:
                raise ValidationError({
                    "time": (
                        f"Overlaps an existing {existing.get('type','slot')} slot "
                        f"({existing.get('start','?')}–{existing.get('end','?')}) on {day}."
                    )
                })

        new_slot = {
            "id": f"sl-{timezone.now().strftime('%Y%m%d%H%M%S%f')}",
            "day": day,
            "start": start,
            "end": end,
            "type": slot_type,
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
        email = str(data.get("email") or "").strip().lower()
        if not email:
            raise ValidationError({"email": "Email is required."})
        first_name = str(data.get("first_name") or "").strip()
        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        last_name = str(data.get("last_name") or "").strip()
        user_model = get_user_model()
        user = user_model.objects.filter(email__iexact=email).first()
        # Generate a one-time password for new accounts. Returned in the
        # response so the facility admin can copy it / share with the staff
        # member. The user can reset it later via the dedicated endpoint.
        from django.utils.crypto import get_random_string
        generated_password = None
        if user is None:
            # Mix upper, lower, digits, and a stable trailing symbol so the
            # password meets typical complexity rules without being painful.
            base = get_random_string(10, allowed_chars="ABCDEFGHJKLMNPQRSTUVWXYZ"
                                                       "abcdefghijkmnopqrstuvwxyz"
                                                       "23456789")
            generated_password = f"{base}@1"
            user = user_model.objects.create_user(
                username=build_unique_username(email),
                email=email,
                password=generated_password,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_active=True,
            )
        else:
            user.first_name = first_name
            user.last_name = last_name
            user.is_staff = True
            user.is_active = True
            user.save(update_fields=["first_name", "last_name", "is_staff", "is_active"])

        license_val = (
            str(data.get("license") or "").strip()
            if role == ProviderSubRole.DOCTOR
            else ""
        )
        doctor_fs, doctor_spec = None, ""
        if role == ProviderSubRole.DOCTOR:
            doctor_fs, doctor_spec = resolve_staff_doctor_specialty(
                membership.facility, data, allow_empty=False
            )

        provider_id = (
            ProviderMembership.objects.filter(user=user, provider__isnull=False)
            .values_list("provider_id", flat=True)
            .first()
        )
        if provider_id:
            provider = ProviderProfile.objects.get(pk=provider_id)
            provider.full_name = f"{first_name} {last_name}".strip()
            provider.status = WorkflowStatus.CONFIRMED
            provider.phone = str(data.get("phone") or "").strip()
            provider.email = email
            if role == ProviderSubRole.DOCTOR:
                provider.facility_specialty = doctor_fs
                provider.specialty = doctor_spec
            elif "specialty" in data:
                provider.specialty = str(data.get("specialty") or "").strip()
                provider.facility_specialty = None
            if role == ProviderSubRole.DOCTOR or "license" in data:
                provider.license_number = license_val or str(
                    data.get("license") or ""
                ).strip()
            provider.save(
                update_fields=[
                    "full_name",
                    "specialty",
                    "facility_specialty",
                    "status",
                    "phone",
                    "email",
                    "license_number",
                    "updated_at",
                ]
            )
        else:
            provider = ProviderProfile.objects.create(
                provider_code=next_identifier(ProviderProfile, "provider_code", "PRV-", 4),
                facility=membership.facility,
                full_name=f"{first_name} {last_name}".strip(),
                facility_specialty=doctor_fs if role == ProviderSubRole.DOCTOR else None,
                specialty=doctor_spec if role == ProviderSubRole.DOCTOR else "",
                status=WorkflowStatus.CONFIRMED,
                phone=str(data.get("phone") or "").strip(),
                email=email,
                license_number=license_val,
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
        # Surface the one-time password ONLY when we just created the user.
        # The caller (facility admin) is expected to copy it and hand it to
        # the new staff member; it is never re-served on subsequent reads.
        if generated_password:
            payload["temporary_password"] = generated_password
            payload["password_note"] = (
                "Copy this temporary password now — it will not be shown again. "
                "Ask the staff member to sign in and change it from their profile."
            )
            # Send welcome email with one-time password
            from core.email_utils import send_staff_welcome_email
            from core.models import ProviderSubRole as _PSR
            _role_labels = {
                _PSR.FACILITY_ADMIN: "Facility Admin",
                _PSR.DOCTOR:         "Doctor",
                _PSR.RECEPTIONIST:   "Receptionist",
                _PSR.LAB_MANAGER:    "Lab Manager",
                _PSR.BILLING_MANAGER:"Billing Manager",
                _PSR.POS:            "POS Operator",
            }
            send_staff_welcome_email(
                user=user,
                facility_name=membership.facility.name,
                role_label=_role_labels.get(role, role),
                temp_password=generated_password,
            )
        return Response(payload, status=201)


class ProviderStaffResetPasswordView(APIView):
    """
    POST /api/v1/provider/staff/<staff_id>/reset-password/
    Facility admin generates a new one-time password for a staff member.
    Returns the new password ONCE — admin must copy it.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, staff_id):
        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})
        staff_membership = get_staff_membership_or_raise(membership.facility, staff_id)

        from django.utils.crypto import get_random_string
        base = get_random_string(10, allowed_chars="ABCDEFGHJKLMNPQRSTUVWXYZ"
                                                   "abcdefghijkmnopqrstuvwxyz"
                                                   "23456789")
        new_password = f"{base}@1"
        staff_membership.user.set_password(new_password)
        staff_membership.user.is_active = True
        staff_membership.user.save(update_fields=["password", "is_active"])

        payload = build_staff_payload(staff_membership)
        payload["temporary_password"] = new_password
        payload["password_note"] = (
            "Copy this password now — it will not be shown again. The staff "
            "member should sign in and change it from their profile."
        )
        # Email the new password to the staff member
        from core.email_utils import send_staff_password_reset_email
        send_staff_password_reset_email(
            user=staff_membership.user,
            facility_name=membership.facility.name,
            new_password=new_password,
        )
        return Response(payload, status=200)


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
        if (
            "phone" in data
            or "specialty" in data
            or "facility_specialty_id" in data
            or "new_specialty_name" in data
        ) and not staff_membership.provider_id:
            staff_membership = ProviderMembership.objects.select_related(
                "user", "provider", "facility"
            ).get(pk=staff_membership.pk)
            ensure_membership_profile(staff_membership)
        if "phone" in data and staff_membership.provider:
            staff_membership.provider.phone = str(data.get("phone") or "").strip()
        if staff_membership.provider and staff_membership.role == ProviderSubRole.DOCTOR:
            if (
                "facility_specialty_id" in data
                or "new_specialty_name" in data
                or "specialty" in data
            ):
                fs, nm = resolve_staff_doctor_specialty(
                    membership.facility, data, allow_empty=True
                )
                staff_membership.provider.facility_specialty = fs
                staff_membership.provider.specialty = nm
        elif "specialty" in data and staff_membership.provider:
            staff_membership.provider.specialty = str(data.get("specialty") or "").strip()
            staff_membership.provider.facility_specialty = None

        staff_membership.user.save(update_fields=["first_name", "last_name"])
        if staff_membership.provider:
            staff_membership.provider.full_name = staff_membership.user.get_full_name().strip()
            staff_membership.provider.save(
                update_fields=[
                    "full_name",
                    "phone",
                    "specialty",
                    "facility_specialty",
                ]
            )
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

        # ── EMR edit gate ──────────────────────────────────────────────────────
        # A consultation can only be created when:
        #   (a) the patient has an IN_PROGRESS appointment at this facility, OR
        #   (b) this is the patient's FIRST consultation here (no prior records),
        # AND the doctor calling this endpoint is the one assigned to the
        # in-progress appointment (or a facility admin override).
        # The allowed grace window after scheduled_for is the admin-configured
        # ProviderClinicalSetting.edit_window_hours (default 24).
        edit_window_hours = (
            ProviderClinicalSetting.objects.filter(facility=membership.facility)
            .values_list("edit_window_hours", flat=True)
            .first()
            or 24
        )
        now = timezone.now()
        edit_window_start = now - timedelta(hours=edit_window_hours)

        has_prior_consultation = ProviderConsultation.objects.filter(
            patient=patient, facility=membership.facility
        ).exists()

        appt_qs = ProviderAppointment.objects.filter(
            facility=membership.facility,
            patient=patient,
        )
        if membership.role == ProviderSubRole.DOCTOR and membership.provider_id:
            appt_qs = appt_qs.filter(provider_id=membership.provider_id)

        active_appt = appt_qs.filter(
            status=WorkflowStatus.IN_PROGRESS,
        ).first()
        recent_appt = appt_qs.filter(
            status__in=[WorkflowStatus.IN_PROGRESS, WorkflowStatus.COMPLETED],
            scheduled_for__gte=edit_window_start,
        ).order_by("-scheduled_for").first()

        if not active_appt and not recent_appt:
            # First-consult exception — only when patient has zero records
            # and the booker is a facility admin who can override.
            is_admin = membership.role == ProviderSubRole.FACILITY_ADMIN
            if not (is_admin and not has_prior_consultation):
                raise ValidationError({
                    "detail": (
                        "EMR can only be edited during an active consultation "
                        f"or within {edit_window_hours} hours of one. Start a "
                        "consultation from the Appointments tab first."
                    ),
                    "code": "EMR_EDIT_LOCKED",
                })

        consultation = ProviderConsultation.objects.create(
            consultation_ref=next_identifier(ProviderConsultation, "consultation_ref", "con-", 4),
            provider=membership.provider,
            patient=patient,
            facility=membership.facility,
            appointment=active_appt or recent_appt,
            status=WorkflowStatus.CONFIRMED,
            consultation_type=str(data.get("type") or "In Facility").strip(),
            subjective=str(data.get("subjective") or "").strip(),
            objective=str(data.get("objective") or "").strip(),
            assessment=str(data.get("assessment") or "").strip(),
            plan=str(data.get("plan") or "").strip(),
            uploaded_files=data.get("uploaded_files") or [],
            consulted_at=now,
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
        from core.email_utils import send_support_ticket_created_email
        send_support_ticket_created_email(ticket)
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
        prev_response_count = len(ticket.responses or [])
        if "responses" in data:
            ticket.responses = data.get("responses") or []
        if "status" in data:
            ticket.status = str(data.get("status") or ticket.status).strip()
        ticket.save()
        # Email the raiser when a new response is added
        new_responses = ticket.responses or []
        if is_admin and len(new_responses) > prev_response_count:
            latest = new_responses[-1]
            response_text = latest.get("text") or latest.get("message") or str(latest)
            responder = request.user.get_full_name().strip() or request.user.email
            from core.email_utils import send_support_ticket_response_email
            send_support_ticket_response_email(ticket, response_text, responder)
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
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        ensure_roles(
            membership,
            {
                ProviderSubRole.FACILITY_ADMIN,
                ProviderSubRole.BILLING_MANAGER,
                ProviderSubRole.DOCTOR,
                ProviderSubRole.RECEPTIONIST,
                ProviderSubRole.LAB_MANAGER,
                ProviderSubRole.POS,
            },
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


# ─── Views added back from our patched version (missing from v2) ──────────────


class ProviderChangePasswordView(APIView):
    """Allow a provider to change their own password."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        membership = ensure_provider_membership(request.user, enforce_verification=False)
        data = request.data or {}
        current_password = str(data.get("current_password") or "").strip()
        new_password = str(data.get("new_password") or "").strip()

        if not current_password or not new_password:
            raise ValidationError({"detail": "current_password and new_password are required."})
        if len(new_password) < 6:
            raise ValidationError({"new_password": "Password must be at least 6 characters."})

        user = membership.user
        if not user.check_password(current_password):
            raise ValidationError({"current_password": "Current password is incorrect."})

        user.set_password(new_password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated successfully."})


class ProviderPatientInviteView(APIView):
    """
    Invite a patient to the portal by creating a PatientProfile + PatientUserLink
    for an existing patient record, then sending them a registration link.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        from django.contrib.auth import get_user_model
        from core.models import (
            PatientFacilityAccess, PatientProfile,
            PatientUserLink, WorkflowStatus,
        )
        from portal_api.utils import build_patient_payload

        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.RECEPTIONIST})

        data = request.data or {}
        email = str(data.get("email") or "").strip().lower()
        first_name = str(data.get("first_name") or "").strip()
        last_name = str(data.get("last_name") or "").strip()
        phone = str(data.get("phone") or "").strip()
        patient_code = str(data.get("patient_code") or "").strip()

        if not email:
            raise ValidationError({"email": "Email is required."})
        if not first_name:
            raise ValidationError({"first_name": "First name is required."})
        if not last_name:
            raise ValidationError({"last_name": "Last name is required."})

        user_model = get_user_model()

        # Find or create the Django user
        user = user_model.objects.filter(email__iexact=email).first()
        if user is None:
            temp_password = next_identifier(PatientProfile, "patient_code", "tmp-", 6)
            user = user_model.objects.create_user(
                username=build_unique_username(email),
                email=email,
                password=temp_password,
                first_name=first_name,
                last_name=last_name,
                is_staff=False,
                is_active=True,
            )

        # Find or create the PatientProfile
        if patient_code:
            patient = PatientProfile.objects.filter(patient_code=patient_code).first()
        else:
            patient = PatientProfile.objects.filter(email__iexact=email).first()

        if patient is None:
            patient = PatientProfile.objects.create(
                patient_code=next_identifier(PatientProfile, "patient_code", "PAT-", 4),
                full_name=f"{first_name} {last_name}".strip(),
                status=WorkflowStatus.CONFIRMED,
                phone=phone,
                email=email,
                preferred_language="en",
            )

        # Link user to patient
        link, _ = PatientUserLink.objects.get_or_create(
            user=user,
            defaults={"patient": patient, "default_facility": membership.facility, "is_active": True},
        )

        # Grant facility access
        PatientFacilityAccess.objects.get_or_create(
            patient=patient,
            facility=membership.facility,
            defaults={"is_default": True, "is_active": True},
        )

        from django.conf import settings
        login_url = getattr(settings, "GONEP_PATIENT_LOGIN_URL", "")
        return Response({
            "detail": f"Patient {email} has been invited.",
            "login_url": login_url,
            "patient_code": patient.patient_code,
        }, status=201)


class ProviderPatientSearchView(APIView):
    """
    Quick patient search within the provider's facility.
    Query param: ?q=<name or code or phone>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q
        from core.models import PatientProfile

        membership = ensure_provider_membership(request.user)
        ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN, ProviderSubRole.DOCTOR, ProviderSubRole.RECEPTIONIST})

        q = str(request.query_params.get("q") or "").strip()
        if not q:
            return Response([])

        queryset = PatientProfile.objects.filter(
            facility_access__facility=membership.facility,
            facility_access__is_active=True,
        ).filter(
            Q(full_name__icontains=q)
            | Q(patient_code__icontains=q)
            | Q(phone__icontains=q)
            | Q(email__icontains=q)
        ).distinct()[:20]

        return Response([
            {
                "patient_code": p.patient_code,
                "full_name": p.full_name,
                "phone": p.phone,
                "email": p.email,
                "blood_group": p.blood_group,
                "age": calculate_age(p.date_of_birth) if p.date_of_birth else None,
            }
            for p in queryset
        ])
