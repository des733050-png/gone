import json
import os
import uuid

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import transaction
from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    Attachment,
    AttachmentKind,
    Facility,
    FacilityStatus,
    PatientFacilityAccess,
    PatientProfile,
    PatientUserLink,
    ProviderProfile,
    ProviderSubRole,
    WorkflowStatus,
)
from portal_api.utils import (
    PATIENT_FACILITY_SESSION_KEY,
    RIDER_FACILITY_SESSION_KEY,
    build_patient_payload,
    build_provider_payload,
    build_rider_payload,
    build_session_payload,
    get_patient_active_facility,
    get_patient_link,
    get_rider_active_facility,
    get_rider_link,
    get_staff_membership,
    prime_user_facility_context,
    set_patient_active_facility,
    set_rider_active_facility,
)


def _parse_request_json(request):
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except (TypeError, ValueError):
        return {}


ALLOWED_APPLICATION_MIME_TYPES = {"application/pdf"}
ALLOWED_APPLICATION_EXTENSIONS = {".pdf"}
MAX_APPLICATION_FILE_SIZE_BYTES = 8 * 1024 * 1024


def _build_application_file_url(storage_path):
    media_url = "/media/"
    if storage_path.startswith("/"):
        return storage_path
    return f"{media_url}{storage_path}"


def _is_valid_file_signature(upload):
    try:
        upload.seek(0)
        header = upload.read(8)
        upload.seek(0)
    except Exception:
        return False
    return header.startswith(b"%PDF-")


def _sanitize_and_store_application_file(upload, facility_code, doc_key):
    if upload is None:
        return None

    original_name = os.path.basename(getattr(upload, "name", "") or "")
    safe_name = get_valid_filename(original_name)
    if not safe_name:
        raise ValueError("Uploaded file name is invalid.")

    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in ALLOWED_APPLICATION_EXTENSIONS:
        raise ValueError("Unsupported file extension. Only PDF is allowed.")

    content_type = str(getattr(upload, "content_type", "") or "").lower()
    if content_type not in ALLOWED_APPLICATION_MIME_TYPES:
        raise ValueError("Unsupported file type. Only PDF is allowed.")

    size = int(getattr(upload, "size", 0) or 0)
    if size < 1:
        raise ValueError("Uploaded file is empty.")
    if size > MAX_APPLICATION_FILE_SIZE_BYTES:
        raise ValueError("File exceeds 8MB limit.")

    if not _is_valid_file_signature(upload):
        raise ValueError("Invalid PDF signature.")

    storage_name = f"provider_applications/{facility_code}/{doc_key}_{uuid.uuid4().hex}{ext}"
    saved_path = default_storage.save(storage_name, upload)
    return {
        "saved_path": saved_path,
        "file_url": _build_application_file_url(saved_path),
        "file_name": safe_name,
        "content_type": content_type,
    }


def _json_error(detail, status_code=400, **extra):
    payload = {"detail": detail}
    payload.update(extra)
    return JsonResponse(payload, status=status_code)


def _build_unique_username(email):
    user_model = get_user_model()
    base = slugify(email.split("@", 1)[0]) or "user"
    candidate = base
    counter = 1
    while user_model.objects.filter(username=candidate).exists():
        candidate = f"{base}{counter}"
        counter += 1
    return candidate


def _next_identifier(model_class, field_name, prefix, padding):
    counter = model_class.objects.count() + 1
    while True:
        candidate = f"{prefix}{counter:0{padding}d}"
        if not model_class.objects.filter(**{field_name: candidate}).exists():
            return candidate
        counter += 1


def _default_registration_facility():
    facility = (
        Facility.objects.filter(status=FacilityStatus.APPROVED)
        .order_by("name")
        .first()
    )
    if facility is None:
        facility = Facility.objects.order_by("name").first()
    return facility


@ensure_csrf_cookie
@require_GET
def csrf_cookie_view(request):
    return JsonResponse(
        {
            "detail": "CSRF cookie set.",
            "csrfToken": get_token(request),
        }
    )


@require_GET
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False, "user": None})
    return JsonResponse(
        {
            "authenticated": True,
            "user": build_session_payload(request.user, request),
        }
    )


@csrf_protect
@require_POST
def login_view(request):
    payload = _parse_request_json(request)
    email = str(payload.get("email", "")).strip().lower()
    password = payload.get("password", "")
    if not email or not password:
        return _json_error("Email and password are required.")

    user_model = get_user_model()
    matched_user = user_model.objects.filter(email__iexact=email).first()
    if matched_user is None:
        return _json_error("Invalid email or password.", status_code=401)

    user = authenticate(
        request, username=matched_user.get_username(), password=password
    )
    if user is None or not user.is_active:
        return _json_error("Invalid email or password.", status_code=401)

    login(request, user)
    prime_user_facility_context(request, user)
    return JsonResponse(
        {
            "authenticated": True,
            "user": build_session_payload(user, request),
            "csrfToken": get_token(request),
        }
    )


@csrf_exempt
@require_POST
def mobile_token_login_view(request):
    payload = _parse_request_json(request)
    email = str(payload.get("email", "")).strip().lower()
    password = payload.get("password", "")
    if not email or not password:
        return _json_error("Email and password are required.")

    user_model = get_user_model()
    matched_user = user_model.objects.filter(email__iexact=email).first()
    if matched_user is None:
        return _json_error("Invalid email or password.", status_code=401)

    user = authenticate(
        request, username=matched_user.get_username(), password=password
    )
    if user is None or not user.is_active:
        return _json_error("Invalid email or password.", status_code=401)

    token, _ = Token.objects.get_or_create(user=user)
    return JsonResponse(
        {
            "authenticated": True,
            "token": token.key,
            "user": build_session_payload(user, request),
        }
    )


@csrf_protect
@require_POST
def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
    return JsonResponse(
        {
            "authenticated": False,
            "detail": "Signed out.",
            "csrfToken": get_token(request),
        }
    )


@csrf_protect
@require_POST
@transaction.atomic
def register_patient_view(request):
    payload = _parse_request_json(request)
    email = str(payload.get("email", "")).strip().lower()
    password = payload.get("password", "")
    first_name = str(payload.get("first_name", "")).strip()
    last_name = str(payload.get("last_name", "")).strip()
    phone = str(payload.get("phone", "")).strip()
    address = str(payload.get("address", "")).strip()
    blood_group = str(payload.get("blood_group", "")).strip()
    date_of_birth = str(payload.get("date_of_birth", "")).strip()

    if not email:
        return _json_error("Email is required.")
    if len(password) < 6:
        return _json_error("Password must be at least 6 characters.")
    if not first_name:
        return _json_error("First name is required.")
    if not last_name:
        return _json_error("Last name is required.")
    if not phone:
        return _json_error("Phone number is required.")

    user_model = get_user_model()
    if user_model.objects.filter(email__iexact=email).exists():
        return _json_error("An account with that email already exists.")

    facility = _default_registration_facility()
    if facility is None:
        return _json_error("No facility is available for registration.", status_code=503)

    parsed_dob = None
    if date_of_birth:
        try:
            parsed_dob = PatientProfile._meta.get_field("date_of_birth").to_python(
                date_of_birth
            )
        except Exception:
            return _json_error("Date of birth must use YYYY-MM-DD format.")

    user = user_model.objects.create_user(
        username=_build_unique_username(email),
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        is_staff=False,
    )

    patient = PatientProfile.objects.create(
        patient_code=_next_identifier(PatientProfile, "patient_code", "PAT-", 4),
        full_name=f"{first_name} {last_name}".strip(),
        status=WorkflowStatus.CONFIRMED,
        phone=phone,
        email=email,
        date_of_birth=parsed_dob,
        blood_group=blood_group,
        address=address,
        preferred_language="en",
    )
    link = PatientUserLink.objects.create(
        user=user,
        patient=patient,
        default_facility=facility,
        is_active=True,
    )
    access = PatientFacilityAccess.objects.create(
        patient=patient,
        facility=facility,
        is_default=True,
        is_active=True,
    )

    login(request, user)
    set_patient_active_facility(request, facility)
    return JsonResponse(
        {
            "authenticated": True,
            "user": build_patient_payload(link, facility, [access]),
            "csrfToken": get_token(request),
        },
        status=201,
    )


@csrf_protect
@require_POST
@transaction.atomic
def register_provider_facility_view(request):
    is_multipart = "multipart/form-data" in str(request.content_type or "").lower()
    payload = request.POST if is_multipart else _parse_request_json(request)
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    phone = str(payload.get("phone", "")).strip()
    location = str(payload.get("location", "")).strip()
    registration_no = str(payload.get("registration_no", "")).strip()
    admin_name = str(payload.get("admin_name", "")).strip()
    admin_email = str(payload.get("admin_email", "")).strip().lower()

    if not name:
        return _json_error("Hospital name is required.")
    if not email:
        return _json_error("Hospital email is required.")
    if not registration_no:
        return _json_error("Registration number is required.")
    if not admin_name:
        return _json_error("Administrator name is required.")
    if not admin_email:
        admin_email = email

    if Facility.objects.filter(registration_no__iexact=registration_no).exists():
        return _json_error(
            "A hospital application with this registration number already exists."
        )
    if Facility.objects.filter(email__iexact=email, status=FacilityStatus.PENDING).exists():
        return _json_error("A pending application already exists for this hospital email.")

    facility_code = _next_identifier(Facility, "facility_code", "FAC-", 4)

    uploaded_documents = {}
    expected_docs = {
        "reg": "Registration certificate",
        "license": "Facility operating licence",
        "tax": "Tax compliance certificate",
        "accred": "Accreditation certificate",
    }
    required_docs = {"reg", "license", "tax"}
    missing_required_docs = []

    if is_multipart:
        for required_key in required_docs:
            if request.FILES.get(f"doc_{required_key}") is None:
                missing_required_docs.append(expected_docs[required_key])
        if missing_required_docs:
            return _json_error(
                f"Missing required documents: {', '.join(missing_required_docs)}"
            )

        for doc_key, doc_title in expected_docs.items():
            uploaded_file = request.FILES.get(f"doc_{doc_key}")
            if uploaded_file is None:
                continue
            try:
                stored = _sanitize_and_store_application_file(
                    uploaded_file, facility_code, doc_key
                )
            except ValueError as exc:
                return _json_error(str(exc))
            uploaded_documents[doc_key] = {
                "name": stored["file_name"],
                "url": stored["file_url"],
                "content_type": stored["content_type"],
            }
        if missing_required_docs:
            return _json_error(
                f"Missing required documents: {', '.join(missing_required_docs)}"
            )

    # Persist files locally first. Only after all required files are safely stored
    # do we create DB records (facility/profile/attachments) atomically.
    facility = Facility.objects.create(
        facility_code=facility_code,
        name=name,
        email=email,
        phone=phone,
        location=location,
        registration_no=registration_no,
        status=FacilityStatus.PENDING,
    )

    for doc_key, doc_title in expected_docs.items():
        document_payload = uploaded_documents.get(doc_key)
        if not document_payload:
            continue
        Attachment.objects.create(
            module="provider_onboarding",
            facility=facility,
            title=doc_title,
            file_name=document_payload["name"],
            file_url=document_payload["url"],
            kind=AttachmentKind.EVIDENCE,
            content_type=document_payload["content_type"],
            related_model="facility_application",
            related_identifier=facility.facility_code,
            uploaded_by=None,
        )

    ProviderProfile.objects.create(
        provider_code=_next_identifier(ProviderProfile, "provider_code", "PRV-", 4),
        facility=facility,
        full_name=admin_name,
        status=WorkflowStatus.DRAFT,
        phone=phone,
        email=admin_email,
        specialty="Facility Admin",
        license_number=str(payload.get("admin_license") or "").strip(),
    )

    return JsonResponse(
        {
            "application_id": str(facility.id),
            "facility_code": facility.facility_code,
            "status": "under_review",
            "detail": "Application submitted successfully. Await super admin approval.",
            "hospital": {
                "name": facility.name,
                "email": facility.email,
                "registration_no": facility.registration_no,
            },
            "admin_contact": {
                "name": admin_name,
                "email": admin_email,
            },
            "submitted_documents": uploaded_documents,
        },
        status=201,
    )


@csrf_protect
@require_POST
def switch_facility_context_view(request):
    if not request.user.is_authenticated:
        return _json_error("Authentication required.", status_code=401)

    payload = _parse_request_json(request)
    facility_id = str(payload.get("facility_id", "")).strip()
    principal = str(payload.get("principal", "")).strip().lower()
    if not facility_id:
        return _json_error("facility_id is required.")

    if principal == "patient" or not principal:
        link = get_patient_link(request.user)
        if link:
            facility, access_rows = get_patient_active_facility(link, facility_id)
            if facility and str(facility.id) == facility_id:
                set_patient_active_facility(request, facility)
                return JsonResponse(
                    {
                        "detail": "Patient facility context updated.",
                        "user": build_patient_payload(link, facility, access_rows),
                    }
                )

    if principal == "rider" or not principal:
        link = get_rider_link(request.user)
        if link:
            facility, access_rows = get_rider_active_facility(link, facility_id)
            if facility and str(facility.id) == facility_id:
                set_rider_active_facility(request, facility)
                return JsonResponse(
                    {
                        "detail": "Rider facility context updated.",
                        "user": build_rider_payload(link, facility, access_rows),
                    }
                )

    membership = get_staff_membership(request.user)
    if membership and str(membership.facility_id) == facility_id:
        return JsonResponse(
            {
                "detail": "Staff accounts are fixed to their assigned facility.",
                "user": build_provider_payload(membership),
            }
        )

    return _json_error("Facility context not available for this account.", status_code=403)


class ProviderMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        membership = get_staff_membership(request.user)
        if membership is None:
            return Response(
                {"detail": "This account does not have provider portal access."},
                status=403,
            )
        return Response(build_provider_payload(membership))


class RiderMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link = get_rider_link(request.user)
        if link is None:
            return Response(
                {"detail": "Rider profile link not found."},
                status=404,
            )
        active_facility, access_rows = get_rider_active_facility(
            link,
            request.session.get(RIDER_FACILITY_SESSION_KEY),
        )
        return Response(build_rider_payload(link, active_facility, access_rows))
