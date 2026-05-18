from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from django.db import models

from core.admin_mixins import (
    GroupScopedAdminMixin,
    PayoutActionMixin,
    SafeAdminActionsMixin,
    SuperuserOnlyAdminMixin,
    TimeStampedAdminMixin,
)
from core.models import (
    ActionQueueItem,
    Attachment,
    AuditEvent,
    CommandBooking,
    CommandIncident,
    Specialization,
    SpecializationRequest,
    SpecializationRequestStatus,
    CommandProvider,
    CommandRider,
    Complaint,
    ComplianceAudit,
    ExecutiveKPI,
    Facility,
    FacilitySpecialty,
    InventoryBatch,
    Invoice,
    Note,
    PatientBooking,
    PatientConsultation,
    PatientDiagnosticOrder,
    PatientFacilityAccess,
    PatientMedicationOrder,
    PatientMedicationOrderItem,
    PatientPortalNotification,
    PatientPreference,
    PatientPrescription,
    PatientProfile,
    PatientRecordEvent,
    PatientSupportTicket,
    PatientUserLink,
    PayoutRequest,
    PerformanceFlag,
    ProviderActivityLog,
    ProviderAppointment,
    ProviderAvailability,
    ProviderBillingRecord,
    ProviderClinicalSetting,
    ProviderConsultation,
    ProviderEarningsSnapshot,
    ProviderInventoryItem,
    ProviderLabResult,
    ProviderMembership,
    ProviderPortalNotification,
    ProviderPosTransaction,
    ProviderPrescriptionTask,
    ProviderProfile,
    ProviderProtocol,
    ProviderVerificationDocument,
    ProviderVerificationSubmission,
    ProviderVerificationStatus,
    ProviderSubRole,
    ProviderSupportTicket,
    RevenueEntry,
    RiderChatMessage,
    RiderEarningsSnapshot,
    RiderFacilityAccess,
    RiderHistoryEntry,
    RiderJob,
    RiderPortalNotification,
    RiderPreference,
    RiderProfile,
    RiderRequestDecision,
    RiderUserLink,
    RiskFlag,
    SaleRecord,
    StockItem,
    Supplier,
    Tag,
    TimelineEvent,
    TransactionLog,
)

User = get_user_model()

admin.site.site_header = "GONEP Command Centre"
admin.site.site_title = "GONEP Command Centre"
admin.site.index_title = "Internal operations, data stewardship, and system control"
admin.site.empty_value_display = "-"


FACILITY_ADMIN_ONLY = (ProviderSubRole.FACILITY_ADMIN,)
PATIENT_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.DOCTOR,
    ProviderSubRole.RECEPTIONIST,
)
PROVIDER_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.DOCTOR,
    ProviderSubRole.BILLING_MANAGER,
    ProviderSubRole.LAB_MANAGER,
    ProviderSubRole.RECEPTIONIST,
)
LAB_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.DOCTOR,
    ProviderSubRole.LAB_MANAGER,
)
BILLING_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.BILLING_MANAGER,
)
INVENTORY_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.BILLING_MANAGER,
    ProviderSubRole.LAB_MANAGER,
)
SUPPORT_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.DOCTOR,
    ProviderSubRole.BILLING_MANAGER,
    ProviderSubRole.LAB_MANAGER,
    ProviderSubRole.RECEPTIONIST,
)
POS_OPERATIONS_ROLES = (
    ProviderSubRole.FACILITY_ADMIN,
    ProviderSubRole.POS,
)


def _model_field_map(model):
    return {field.name: field for field in model._meta.fields}


def _model_field_names(model):
    return set(_model_field_map(model))


def _has_field(model, field_name):
    return field_name in _model_field_names(model)


def _build_list_display(model):
    names = _model_field_names(model)
    preferred = [
        "id",
        "name",
        "title",
        "full_name",
        "facility_code",
        "patient_code",
        "provider_code",
        "rider_code",
        "reference",
        "reference_code",
        "booking_ref",
        "appointment_ref",
        "job_ref",
        "order_number",
        "ticket_number",
        "invoice_number",
        "transaction_id",
        "status",
        "role",
        "is_active",
        "created_at",
        "updated_at",
    ]
    display = [field for field in preferred if field in names]
    return tuple(display[:7] or ["id"])


def _build_search_fields(model):
    search_fields = []
    for field in model._meta.fields:
        if isinstance(
            field,
            (
                models.CharField,
                models.TextField,
                models.EmailField,
                models.SlugField,
                models.URLField,
            ),
        ):
            search_fields.append(field.name)
        elif isinstance(field, models.ForeignKey):
            related_fields = _model_field_names(field.related_model)
            for candidate in (
                "full_name",
                "name",
                "title",
                "username",
                "email",
                "facility_code",
                "patient_code",
                "provider_code",
                "rider_code",
                "booking_ref",
                "appointment_ref",
                "job_ref",
                "reference",
            ):
                if candidate in related_fields:
                    search_fields.append(f"{field.name}__{candidate}")
                    break
    return tuple(dict.fromkeys(search_fields))[:10]


def _build_list_filter(model):
    field_map = _model_field_map(model)
    front = []
    for candidate in (
        "status",
        "role",
        "severity",
        "is_active",
        "review_state",
        "collection_stage",
        "reconciliation_state",
    ):
        if candidate in field_map:
            front.append(candidate)

    tail = []
    for field in model._meta.fields:
        if field.name in front:
            continue
        if isinstance(field, models.BooleanField):
            tail.append(field.name)
        elif isinstance(field, (models.DateField, models.DateTimeField)):
            if field.name not in {"created_at", "updated_at"}:
                tail.append(field.name)
        elif getattr(field, "choices", None):
            tail.append(field.name)

    return tuple((front + tail)[:8])


def _build_list_select_related(model):
    return tuple(
        field.name for field in model._meta.fields if isinstance(field, models.ForeignKey)
    )


def _build_ordering(model):
    if _has_field(model, "updated_at"):
        return ("-updated_at",)
    if _has_field(model, "created_at"):
        return ("-created_at",)
    return ("-id",)


class PatientMedicationOrderItemInline(admin.TabularInline):
    model = PatientMedicationOrderItem
    extra = 0


class CommandCentreModelAdmin(TimeStampedAdminMixin, GroupScopedAdminMixin, admin.ModelAdmin):
    save_on_top = True
    list_per_page = 25

    def __init__(self, model, admin_site):
        super().__init__(model, admin_site)
        self.list_display = _build_list_display(model)
        self.search_fields = _build_search_fields(model)
        self.list_filter = _build_list_filter(model)
        self.ordering = _build_ordering(model)
        if _has_field(model, "created_at"):
            self.date_hierarchy = "created_at"
        related_fields = _build_list_select_related(model)
        if related_fields:
            self.list_select_related = related_fields


class WorkflowModelAdmin(SafeAdminActionsMixin, CommandCentreModelAdmin):
    pass


class ReadOnlyAuditAdmin(CommandCentreModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


class ProviderVerificationDocumentInline(admin.TabularInline):
    model = ProviderVerificationDocument
    extra = 0
    readonly_fields = (
        "document_type",
        "file",
        "original_filename",
        "content_type",
        "file_size",
        "locked",
        "created_at",
        "updated_at",
    )
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class FacilityVerificationSubmissionInline(admin.TabularInline):
    """
    Shows every verification submission for a facility directly on the
    Facility change page so admins can jump from a facility record straight
    to its submitted documents without having to navigate to a separate model.
    """
    model = ProviderVerificationSubmission
    extra = 0
    can_delete = False
    show_change_link = True          # link to the full ProviderVerificationSubmission page
    verbose_name        = "Verification submission"
    verbose_name_plural = "Verification submissions"
    ordering = ("-created_at",)
    readonly_fields = (
        "status",
        "submitted_by",
        "reviewed_by",
        "reviewed_at",
        "rejection_reason",
        "created_at",
        "updated_at",
    )
    fields = (
        "status",
        "submitted_by",
        "reviewed_by",
        "reviewed_at",
        "rejection_reason",
        "created_at",
    )

    def has_add_permission(self, request, obj=None):
        return False


for auth_model in (User, Group):
    try:
        admin.site.unregister(auth_model)
    except admin.sites.NotRegistered:
        pass


@admin.register(User)
class UserAdmin(SuperuserOnlyAdminMixin, BaseUserAdmin):
    pass


@admin.register(Group)
class GroupAdmin(SuperuserOnlyAdminMixin, BaseGroupAdmin):
    pass


@admin.register(Specialization)
class SpecializationAdmin(SuperuserOnlyAdminMixin, TimeStampedAdminMixin, admin.ModelAdmin):
    """
    Platform-wide specialization catalogue.
    Only superadmins can create, edit, or deactivate specializations.
    Facility admins can only assign from this list.
    """
    list_display  = ("name", "slug", "is_active", "facility_count", "created_at")
    list_filter   = ("is_active",)
    search_fields = ("name", "slug")
    ordering      = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    actions = ("activate_specializations", "deactivate_specializations")

    def facility_count(self, obj):
        return obj.facility_specialties.values("facility").distinct().count()
    facility_count.short_description = "Facilities using"

    @admin.action(description="Mark selected specializations as active")
    def activate_specializations(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} specialization(s) activated.", messages.SUCCESS)

    @admin.action(description="Deactivate selected specializations")
    def deactivate_specializations(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} specialization(s) deactivated.", messages.WARNING)


@admin.register(SpecializationRequest)
class SpecializationRequestAdmin(SuperuserOnlyAdminMixin, TimeStampedAdminMixin, admin.ModelAdmin):
    """
    Facility admin requests for new specializations.
    Superadmin can approve (creates the Specialization) or reject.
    """
    list_display  = ("name", "facility", "requested_by", "status", "specialization", "created_at")
    list_filter   = ("status",)
    search_fields = ("name", "facility__name", "requested_by__email")
    ordering      = ("-created_at",)
    readonly_fields = (
        "facility", "requested_by", "name", "reason",
        "reviewed_by", "specialization", "created_at", "updated_at",
    )
    fields = (
        "facility", "requested_by", "name", "reason",
        "status", "review_note",
        "reviewed_by", "specialization",
        "created_at", "updated_at",
    )
    actions = ("approve_requests", "reject_requests")

    @admin.action(description="Approve selected requests (creates Specialization if new)")
    def approve_requests(self, request, queryset):
        approved = 0
        skipped  = 0
        for req in queryset.filter(status=SpecializationRequestStatus.PENDING):
            # Find or create the canonical Specialization.
            spec, _ = Specialization.objects.get_or_create(
                name=" ".join(req.name.split()).title(),
                defaults={
                    "slug": __import__("django.utils.text", fromlist=["slugify"]).slugify(req.name),
                    "is_active": True,
                },
            )
            req.specialization = spec
            req.status      = SpecializationRequestStatus.APPROVED
            req.reviewed_by = request.user
            req.save(update_fields=["specialization", "status", "reviewed_by", "updated_at"])
            approved += 1
        if skipped:
            self.message_user(request, f"{skipped} request(s) skipped (not PENDING).", messages.WARNING)
        if approved:
            self.message_user(request, f"{approved} request(s) approved.", messages.SUCCESS)

    @admin.action(description="Reject selected requests (review_note required)")
    def reject_requests(self, request, queryset):
        rejected = 0
        missing  = 0
        for req in queryset.filter(status=SpecializationRequestStatus.PENDING):
            if not req.review_note.strip():
                missing += 1
                continue
            req.status      = SpecializationRequestStatus.REJECTED
            req.reviewed_by = request.user
            req.save(update_fields=["status", "reviewed_by", "updated_at"])
            rejected += 1
        if missing:
            self.message_user(
                request,
                f"{missing} request(s) not rejected — fill in review_note first.",
                messages.ERROR,
            )
        if rejected:
            self.message_user(request, f"{rejected} request(s) rejected.", messages.SUCCESS)


@admin.register(Facility)
class FacilityAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    facility_lookup = "pk"
    inlines = (FacilityVerificationSubmissionInline,)


@admin.register(FacilitySpecialty)
class FacilitySpecialtyAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    facility_lookup = "facility"
    list_display = ("name", "facility", "created_at")


@admin.register(PatientUserLink)
class PatientUserLinkAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES
    facility_lookup = "default_facility"


@admin.register(PatientFacilityAccess)
class PatientFacilityAccessAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(ProviderMembership)
class ProviderMembershipAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderUserLink)
class RiderUserLinkAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    facility_lookup = "default_facility"


@admin.register(RiderFacilityAccess)
class RiderFacilityAccessAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(Tag)
class TagAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(AuditEvent)
class AuditEventAdmin(ReadOnlyAuditAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(TimelineEvent)
class TimelineEventAdmin(ReadOnlyAuditAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(Attachment)
class AttachmentAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(Note)
class NoteAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(ActionQueueItem)
class ActionQueueItemAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(CommandProvider)
class CommandProviderAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(CommandRider)
class CommandRiderAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(CommandBooking)
class CommandBookingAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(CommandIncident)
class CommandIncidentAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(PerformanceFlag)
class PerformanceFlagAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(ComplianceAudit)
class ComplianceAuditAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(Complaint)
class ComplaintAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(RiskFlag)
class RiskFlagAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    ownership_field = "owner"


@admin.register(PatientProfile)
class PatientProfileAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES
    facility_lookup = "facility_access__facility"


@admin.register(PatientPreference)
class PatientPreferenceAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientBooking)
class PatientBookingAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientConsultation)
class PatientConsultationAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientPrescription)
class PatientPrescriptionAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientDiagnosticOrder)
class PatientDiagnosticOrderAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientRecordEvent)
class PatientRecordEventAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientSupportTicket)
class PatientSupportTicketAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES
    ownership_field = "owner"


@admin.register(PatientMedicationOrder)
class PatientMedicationOrderAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES
    inlines = (PatientMedicationOrderItemInline,)


@admin.register(PatientMedicationOrderItem)
class PatientMedicationOrderItemAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(PatientPortalNotification)
class PatientPortalNotificationAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(ProviderProfile)
class ProviderProfileAdmin(WorkflowModelAdmin):
    required_roles = PROVIDER_OPERATIONS_ROLES


@admin.register(ProviderVerificationSubmission)
class ProviderVerificationSubmissionAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    facility_lookup = "facility"
    inlines = (ProviderVerificationDocumentInline,)
    actions = ("approve_pending_submissions", "reject_pending_submissions")
    readonly_fields = (
        "facility",
        "submitted_by",
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    )

    @admin.action(description="Approve pending provider verification submissions")
    def approve_pending_submissions(self, request, queryset):
        approved = 0
        for submission in queryset.filter(status=ProviderVerificationStatus.PENDING):
            submission.approve(reviewed_by=request.user)
            approved += 1
        self.message_user(
            request,
            f"Approved {approved} pending provider verification submission(s).",
            messages.SUCCESS,
        )

    @admin.action(description="Reject pending provider verification submissions")
    def reject_pending_submissions(self, request, queryset):
        rejected = 0
        missing_reason = 0
        for submission in queryset.filter(status=ProviderVerificationStatus.PENDING):
            if not submission.rejection_reason.strip():
                missing_reason += 1
                continue
            submission.reject(
                reviewed_by=request.user,
                reason=submission.rejection_reason.strip(),
            )
            rejected += 1
        if missing_reason:
            self.message_user(
                request,
                (
                    f"{missing_reason} submission(s) were not rejected because "
                    "rejection_reason was empty."
                ),
                messages.ERROR,
            )
        if rejected:
            self.message_user(
                request,
                f"Rejected {rejected} pending provider verification submission(s).",
                messages.SUCCESS,
            )


@admin.register(ProviderVerificationDocument)
class ProviderVerificationDocumentAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    readonly_fields = (
        "submission",
        "document_type",
        "file",
        "original_filename",
        "content_type",
        "file_size",
        "locked",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ProviderAppointment)
class ProviderAppointmentAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(ProviderConsultation)
class ProviderConsultationAdmin(WorkflowModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(ProviderPrescriptionTask)
class ProviderPrescriptionTaskAdmin(WorkflowModelAdmin):
    required_roles = LAB_OPERATIONS_ROLES


@admin.register(ProviderEarningsSnapshot)
class ProviderEarningsSnapshotAdmin(CommandCentreModelAdmin):
    required_roles = BILLING_OPERATIONS_ROLES


@admin.register(ProviderProtocol)
class ProviderProtocolAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(ProviderLabResult)
class ProviderLabResultAdmin(WorkflowModelAdmin):
    required_roles = LAB_OPERATIONS_ROLES


@admin.register(ProviderAvailability)
class ProviderAvailabilityAdmin(CommandCentreModelAdmin):
    required_roles = PATIENT_OPERATIONS_ROLES


@admin.register(ProviderClinicalSetting)
class ProviderClinicalSettingAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(ProviderInventoryItem)
class ProviderInventoryItemAdmin(WorkflowModelAdmin):
    required_roles = INVENTORY_OPERATIONS_ROLES


@admin.register(ProviderBillingRecord)
class ProviderBillingRecordAdmin(WorkflowModelAdmin):
    required_roles = BILLING_OPERATIONS_ROLES


@admin.register(ProviderPortalNotification)
class ProviderPortalNotificationAdmin(CommandCentreModelAdmin):
    required_roles = SUPPORT_OPERATIONS_ROLES


@admin.register(ProviderSupportTicket)
class ProviderSupportTicketAdmin(WorkflowModelAdmin):
    required_roles = SUPPORT_OPERATIONS_ROLES
    ownership_field = "owner"


@admin.register(ProviderActivityLog)
class ProviderActivityLogAdmin(ReadOnlyAuditAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(ProviderPosTransaction)
class ProviderPosTransactionAdmin(CommandCentreModelAdmin):
    required_roles = POS_OPERATIONS_ROLES


@admin.register(RiderProfile)
class RiderProfileAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
    facility_lookup = "facility_access__facility"


@admin.register(RiderJob)
class RiderJobAdmin(WorkflowModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderHistoryEntry)
class RiderHistoryEntryAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderEarningsSnapshot)
class RiderEarningsSnapshotAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderRequestDecision)
class RiderRequestDecisionAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderPortalNotification)
class RiderPortalNotificationAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderChatMessage)
class RiderChatMessageAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(RiderPreference)
class RiderPreferenceAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(Supplier)
class SupplierAdmin(CommandCentreModelAdmin):
    required_roles = INVENTORY_OPERATIONS_ROLES


@admin.register(StockItem)
class StockItemAdmin(WorkflowModelAdmin):
    required_roles = INVENTORY_OPERATIONS_ROLES


@admin.register(InventoryBatch)
class InventoryBatchAdmin(WorkflowModelAdmin):
    required_roles = INVENTORY_OPERATIONS_ROLES


@admin.register(SaleRecord)
class SaleRecordAdmin(CommandCentreModelAdmin):
    required_roles = BILLING_OPERATIONS_ROLES


@admin.register(RevenueEntry)
class RevenueEntryAdmin(WorkflowModelAdmin):
    required_roles = BILLING_OPERATIONS_ROLES


@admin.register(PayoutRequest)
class PayoutRequestAdmin(PayoutActionMixin, CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY


@admin.register(Invoice)
class InvoiceAdmin(WorkflowModelAdmin):
    required_roles = BILLING_OPERATIONS_ROLES


@admin.register(TransactionLog)
class TransactionLogAdmin(CommandCentreModelAdmin):
    required_roles = BILLING_OPERATIONS_ROLES


@admin.register(ExecutiveKPI)
class ExecutiveKPIAdmin(CommandCentreModelAdmin):
    required_roles = FACILITY_ADMIN_ONLY
