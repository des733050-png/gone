import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class WorkflowStatus(models.TextChoices):
    IDLE = "idle", "Idle"
    DRAFT = "draft", "Draft"
    CONFIRMED = "confirmed", "Confirmed"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class SeverityLevel(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class PayoutState(models.TextChoices):
    DRAFT = "draft", "Draft"
    PENDING_APPROVAL = "pending_approval", "Pending Approval"
    APPROVED = "approved", "Approved"
    PAID = "paid", "Paid"
    REJECTED = "rejected", "Rejected"


class ComplaintSLAState(models.TextChoices):
    ON_TRACK = "on_track", "On Track"
    AT_RISK = "at_risk", "At Risk"
    BREACHED = "breached", "Breached"
    RESOLVED = "resolved", "Resolved"


class InventoryState(models.TextChoices):
    IN_STOCK = "in_stock", "In Stock"
    LOW_STOCK = "low_stock", "Low Stock"
    OUT_OF_STOCK = "out_of_stock", "Out of Stock"
    EXPIRED = "expired", "Expired"


class ReconciliationState(models.TextChoices):
    PENDING = "pending", "Pending"
    RECONCILED = "reconciled", "Reconciled"
    EXCEPTION = "exception", "Exception"


class CollectionStage(models.TextChoices):
    CURRENT = "current", "Current"
    DUE = "due", "Due"
    OVERDUE = "overdue", "Overdue"
    DISPUTED = "disputed", "Disputed"
    PAID = "paid", "Paid"


class AuditReviewState(models.TextChoices):
    PENDING = "pending", "Pending"
    UNDER_REVIEW = "under_review", "Under Review"
    EVIDENCE_REQUESTED = "evidence_requested", "Evidence Requested"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class AttachmentKind(models.TextChoices):
    EVIDENCE = "evidence", "Evidence"
    REPORT = "report", "Report"
    NOTE = "note", "Note"
    PLACEHOLDER = "placeholder", "Placeholder"


class FacilityStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    SUSPENDED = "suspended", "Suspended"


class ProviderSubRole(models.TextChoices):
    FACILITY_ADMIN = "facility_admin", "Facility Admin"
    DOCTOR = "doctor", "Doctor"
    BILLING_MANAGER = "billing_manager", "Billing Manager"
    LAB_MANAGER = "lab_manager", "Lab Manager"
    RECEPTIONIST = "receptionist", "Receptionist"
    POS = "pos", "POS"


class ProviderSupportTicketCategory(models.TextChoices):
    BUG = "Bug", "Bug"
    FEATURE_REQUEST = "Feature Request", "Feature Request"
    ACCESS = "Access", "Access"
    PERFORMANCE = "Performance", "Performance"
    DATA_ISSUE = "Data Issue", "Data Issue"
    OTHER = "Other", "Other"


class ProviderSupportTicketPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class ProviderSupportTicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class PatientPortalOrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_TRANSIT = "in_transit", "In Transit"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class BaseTrackedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Tag(BaseTrackedModel):
    module = models.CharField(max_length=64, default="control_admin")
    name = models.CharField(max_length=64, unique=True)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    color = models.CharField(max_length=7, default="#0EA5A4")

    class Meta:
        ordering = ["module", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class AuditEvent(BaseTrackedModel):
    module = models.CharField(max_length=64, default="control_admin")
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    action = models.CharField(max_length=120)
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.LOW
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    model_label = models.CharField(max_length=120)
    object_identifier = models.CharField(max_length=120)
    metadata = models.JSONField(default=dict, blank=True)
    message = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.model_label}:{self.action}"


class TimelineEvent(BaseTrackedModel):
    module = models.CharField(max_length=64, default="control_admin")
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_events",
    )
    event_type = models.CharField(max_length=80)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.IDLE
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    related_model = models.CharField(max_length=120)
    related_identifier = models.CharField(max_length=120)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timeline_events",
    )
    extra = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Attachment(BaseTrackedModel):
    module = models.CharField(max_length=64, default="control_admin")
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attachments",
    )
    title = models.CharField(max_length=120)
    file_name = models.CharField(max_length=255)
    file_url = models.URLField(max_length=500)
    kind = models.CharField(
        max_length=24, choices=AttachmentKind.choices, default=AttachmentKind.PLACEHOLDER
    )
    content_type = models.CharField(max_length=120, blank=True)
    related_model = models.CharField(max_length=120)
    related_identifier = models.CharField(max_length=120)
    complaint = models.ForeignKey(
        "Complaint",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attachments",
    )
    compliance_audit = models.ForeignKey(
        "ComplianceAudit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attachments",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_attachments",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Note(BaseTrackedModel):
    module = models.CharField(max_length=64, default="control_admin")
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notes",
    )
    title = models.CharField(max_length=120)
    body = models.TextField()
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    related_model = models.CharField(max_length=120, blank=True)
    related_identifier = models.CharField(max_length=120, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notes_created",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notes_assigned",
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="notes")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ActionQueueItem(BaseTrackedModel):
    module = models.CharField(max_length=64, default="control_admin")
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="action_queue_items",
    )
    action_type = models.CharField(max_length=120)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.IDLE
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    priority = models.PositiveSmallIntegerField(default=3)
    payload = models.JSONField(default=dict, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="queue_items",
    )

    class Meta:
        ordering = ["priority", "-created_at"]

    def __str__(self):
        return self.action_type


class CommandProvider(BaseTrackedModel):
    full_name = models.CharField(max_length=120)
    specialty = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.IDLE
    )
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    availability_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tags = models.ManyToManyField(Tag, blank=True, related_name="providers")

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class CommandRider(BaseTrackedModel):
    full_name = models.CharField(max_length=120)
    vehicle_type = models.CharField(max_length=64, blank=True)
    zone = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.IDLE
    )
    phone = models.CharField(max_length=32, blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="riders")

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name


class CommandBooking(BaseTrackedModel):
    reference = models.CharField(max_length=50, unique=True)
    patient_name = models.CharField(max_length=120)
    service_type = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.LOW
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    provider = models.ForeignKey(
        CommandProvider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    rider = models.ForeignKey(
        CommandRider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="KES")
    notes = models.TextField(blank=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="bookings")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.reference


class CommandIncident(BaseTrackedModel):
    title = models.CharField(max_length=160)
    category = models.CharField(max_length=80, blank=True)
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    booking = models.ForeignKey(
        CommandBooking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="command_incidents",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class PerformanceFlag(BaseTrackedModel):
    subject_type = models.CharField(max_length=40)
    subject_identifier = models.CharField(max_length=120)
    title = models.CharField(max_length=160)
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    score = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="performance_flags",
    )
    summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ComplianceAudit(BaseTrackedModel):
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compliance_audits",
    )
    title = models.CharField(max_length=160)
    audit_type = models.CharField(max_length=80, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compliance_audits",
    )
    review_state = models.CharField(
        max_length=32,
        choices=AuditReviewState.choices,
        default=AuditReviewState.PENDING,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="compliance_reviews",
    )
    due_date = models.DateField(null=True, blank=True)
    evidence_due_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Complaint(BaseTrackedModel):
    ticket_number = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    customer_name = models.CharField(max_length=120)
    channel = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    sla_state = models.CharField(
        max_length=16,
        choices=ComplaintSLAState.choices,
        default=ComplaintSLAState.ON_TRACK,
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="complaints",
    )
    opened_at = models.DateTimeField(default=timezone.now)
    sla_due_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    breach_reason = models.TextField(blank=True)
    resolution_notes = models.TextField(blank=True)
    summary = models.TextField(blank=True)

    class Meta:
        ordering = ["-opened_at"]

    def __str__(self):
        return self.ticket_number


class RiskFlag(BaseTrackedModel):
    facility = models.ForeignKey(
        "Facility",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="risk_flags",
    )
    name = models.CharField(max_length=160)
    flag_type = models.CharField(max_length=80, blank=True)
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    subject_model = models.CharField(max_length=120, blank=True)
    subject_identifier = models.CharField(max_length=120, blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="risk_flags",
    )
    reason = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Facility(BaseTrackedModel):
    facility_code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=160)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    location = models.CharField(max_length=200, blank=True)
    registration_no = models.CharField(max_length=80, blank=True)
    status = models.CharField(
        max_length=16,
        choices=FacilityStatus.choices,
        default=FacilityStatus.APPROVED,
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class PatientProfile(BaseTrackedModel):
    patient_code = models.CharField(max_length=40, unique=True)
    full_name = models.CharField(max_length=120)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    blood_group = models.CharField(max_length=8, blank=True)
    address = models.CharField(max_length=255, blank=True)
    preferred_language = models.CharField(max_length=24, default="en")
    theme_preference = models.CharField(max_length=16, default="system")
    emergency_contact_name = models.CharField(max_length=120, blank=True)
    emergency_contact_phone = models.CharField(max_length=32, blank=True)
    conditions = models.JSONField(default=list, blank=True)
    allergies = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.patient_code} - {self.full_name}"


class PatientUserLink(BaseTrackedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_link",
    )
    patient = models.OneToOneField(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="user_link",
    )
    default_facility = models.ForeignKey(
        Facility,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_links",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["patient__full_name"]

    def __str__(self):
        return f"{self.user.get_username()} - {self.patient.full_name}"


class PatientFacilityAccess(BaseTrackedModel):
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="facility_access",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_access",
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["facility__name", "patient__full_name"]
        unique_together = ("patient", "facility")

    def __str__(self):
        return f"{self.patient.full_name} @ {self.facility.name}"


class PatientPreference(BaseTrackedModel):
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="preferences"
    )
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="patient_preferences"
    )
    appointment_reminders = models.BooleanField(default=True)
    order_updates = models.BooleanField(default=True)
    lab_results_alerts = models.BooleanField(default=True)
    medication_refill_reminders = models.BooleanField(default=True)
    marketing_updates = models.BooleanField(default=False)
    privacy_mode = models.BooleanField(default=False)

    class Meta:
        ordering = ["facility__name", "patient__full_name"]
        unique_together = ("patient", "facility")

    def __str__(self):
        return f"{self.patient.patient_code} preferences @ {self.facility.name}"


class PatientBooking(BaseTrackedModel):
    booking_ref = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="bookings"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_bookings",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    service_type = models.CharField(max_length=120, blank=True)
    channel = models.CharField(max_length=50, blank=True)
    provider_name = models.CharField(max_length=120, blank=True)
    provider_specialty = models.CharField(max_length=120, blank=True)
    location_details = models.CharField(max_length=255, blank=True)
    fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.booking_ref


class PatientConsultation(BaseTrackedModel):
    consultation_ref = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="consultations"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_consultations",
    )
    booking = models.ForeignKey(
        PatientBooking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultations",
    )
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    provider_name = models.CharField(max_length=120, blank=True)
    subjective = models.TextField(blank=True)
    objective = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    consulted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-consulted_at"]

    def __str__(self):
        return self.consultation_ref


class PatientPrescription(BaseTrackedModel):
    rx_number = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="prescriptions"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_prescriptions",
    )
    consultation = models.ForeignKey(
        PatientConsultation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    medication_name = models.CharField(max_length=160)
    dosage = models.CharField(max_length=120, blank=True)
    instructions = models.TextField(blank=True)
    delivery_status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.CONFIRMED,
    )
    issued_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-issued_at"]

    def __str__(self):
        return self.rx_number


class PatientDiagnosticOrder(BaseTrackedModel):
    order_number = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="diagnostic_orders"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_diagnostic_orders",
    )
    consultation = models.ForeignKey(
        PatientConsultation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="diagnostic_orders",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    test_type = models.CharField(max_length=140)
    upload_url = models.URLField(max_length=500, blank=True)
    result_summary = models.TextField(blank=True)
    collected_at = models.DateTimeField(null=True, blank=True)
    result_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number


class PatientRecordEvent(BaseTrackedModel):
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="record_events"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_record_events",
    )
    event_type = models.CharField(max_length=64)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    title = models.CharField(max_length=160)
    source_model = models.CharField(max_length=120)
    source_identifier = models.CharField(max_length=120)
    details = models.TextField(blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.patient.patient_code} - {self.title}"


class PatientSupportTicket(BaseTrackedModel):
    ticket_number = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="support_tickets"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_support_tickets",
    )
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    channel = models.CharField(max_length=64, blank=True)
    subject = models.CharField(max_length=180)
    message = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.ticket_number


class PatientMedicationOrder(BaseTrackedModel):
    order_number = models.CharField(max_length=50, unique=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="medication_orders"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_medication_orders",
    )
    prescription = models.ForeignKey(
        PatientPrescription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medication_orders",
    )
    rider = models.ForeignKey(
        "RiderProfile",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="medication_orders",
    )
    status = models.CharField(
        max_length=20,
        choices=PatientPortalOrderStatus.choices,
        default=PatientPortalOrderStatus.PENDING,
    )
    placed_at = models.DateTimeField(default=timezone.now)
    eta_label = models.CharField(max_length=64, blank=True)
    delivery_address = models.CharField(max_length=255, blank=True)
    pickup_address = models.CharField(max_length=255, blank=True)
    patient_phone = models.CharField(max_length=32, blank=True)
    rider_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    distance_km = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    estimated_minutes = models.PositiveIntegerField(default=0)
    progress_step = models.PositiveSmallIntegerField(default=0)
    started_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    patient_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-placed_at", "-created_at"]

    def __str__(self):
        return self.order_number


class PatientMedicationOrderItem(BaseTrackedModel):
    order = models.ForeignKey(
        PatientMedicationOrder, on_delete=models.CASCADE, related_name="items"
    )
    medication_name = models.CharField(max_length=160)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.order.order_number} - {self.medication_name}"


class PatientPortalNotification(BaseTrackedModel):
    notification_code = models.CharField(max_length=50, unique=True)
    event_id = models.CharField(max_length=120, blank=True, null=True, db_index=True)
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="portal_notifications"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="patient_notifications",
    )
    kind = models.CharField(max_length=64, blank=True)
    title = models.CharField(max_length=160)
    body = models.TextField()
    icon_lib = models.CharField(max_length=32, default="feather")
    icon_name = models.CharField(max_length=64, default="bell")
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("patient", "facility", "event_id")

    def __str__(self):
        return f"{self.notification_code} - {self.title}"


class ProviderProfile(BaseTrackedModel):
    provider_code = models.CharField(max_length=40, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_profiles",
    )
    full_name = models.CharField(max_length=120)
    specialty = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    phone = models.CharField(max_length=32, blank=True)
    email = models.EmailField(blank=True)
    license_number = models.CharField(max_length=80, blank=True)
    years_experience = models.PositiveSmallIntegerField(default=0)
    payout_account = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.provider_code} - {self.full_name}"


class ProviderMembership(BaseTrackedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_memberships",
    )
    provider = models.ForeignKey(
        ProviderProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="memberships",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_memberships",
    )
    role = models.CharField(max_length=32, choices=ProviderSubRole.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["facility__name", "user__username", "role"]
        unique_together = ("user", "facility")

    def __str__(self):
        return f"{self.user.get_username()} - {self.role} @ {self.facility.name}"


class ProviderAppointment(BaseTrackedModel):
    appointment_ref = models.CharField(max_length=50, unique=True)
    provider = models.ForeignKey(
        ProviderProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="appointments",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_appointments",
    )
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.SET_NULL, null=True, blank=True
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    appointment_type = models.CharField(max_length=64, blank=True)
    patient_phone = models.CharField(max_length=32, blank=True)
    visit_reason = models.CharField(max_length=160, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.appointment_ref


class ProviderConsultation(BaseTrackedModel):
    consultation_ref = models.CharField(max_length=50, unique=True)
    provider = models.ForeignKey(
        ProviderProfile, on_delete=models.CASCADE, related_name="consultations"
    )
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_consultations",
    )
    appointment = models.ForeignKey(
        ProviderAppointment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultations",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_consultations",
    )
    status = models.CharField(
        max_length=16,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.IN_PROGRESS,
    )
    consultation_type = models.CharField(max_length=64, blank=True)
    subjective = models.TextField(blank=True)
    objective = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    vitals = models.TextField(blank=True)
    soap_notes = models.TextField(blank=True)
    next_action = models.CharField(max_length=160, blank=True)
    uploaded_files = models.JSONField(default=list, blank=True)
    consulted_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-consulted_at"]

    def __str__(self):
        return self.consultation_ref


class ProviderPrescriptionTask(BaseTrackedModel):
    task_ref = models.CharField(max_length=50, unique=True)
    provider = models.ForeignKey(
        ProviderProfile, on_delete=models.CASCADE, related_name="prescription_tasks"
    )
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_prescription_tasks",
    )
    consultation = models.ForeignKey(
        ProviderConsultation,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescription_tasks",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_prescription_tasks",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    medication_name = models.CharField(max_length=160, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    instructions = models.TextField(blank=True)
    medication_summary = models.TextField(blank=True)
    signed_off_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.task_ref


class ProviderEarningsSnapshot(BaseTrackedModel):
    provider = models.ForeignKey(
        ProviderProfile, on_delete=models.CASCADE, related_name="earnings_snapshots"
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_earnings_snapshots",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    period_start = models.DateField()
    period_end = models.DateField()
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payout_state = models.CharField(
        max_length=24, choices=PayoutState.choices, default=PayoutState.DRAFT
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-period_end"]

    def __str__(self):
        return f"{self.provider.provider_code} {self.period_start} - {self.period_end}"


class ProviderProtocol(BaseTrackedModel):
    protocol_code = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="provider_protocols",
    )
    title = models.CharField(max_length=180)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    version = models.CharField(max_length=20, default="v1")
    category = models.CharField(max_length=100, blank=True)
    content = models.TextField(blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.protocol_code


class ProviderLabResult(BaseTrackedModel):
    lab_ref = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="provider_lab_results"
    )
    provider = models.ForeignKey(
        ProviderProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lab_results",
    )
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_lab_results",
    )
    test_name = models.CharField(max_length=160)
    result_value = models.CharField(max_length=160)
    reference_range = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=24, default="normal")
    critical = models.BooleanField(default=False)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_provider_lab_results",
    )
    reported_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-reported_at"]

    def __str__(self):
        return self.lab_ref


class ProviderAvailability(BaseTrackedModel):
    provider = models.ForeignKey(
        ProviderProfile, on_delete=models.CASCADE, related_name="availability_rules"
    )
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="provider_availability"
    )
    slots = models.JSONField(default=list, blank=True)
    blocked_days = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["facility__name", "provider__full_name"]
        unique_together = ("provider", "facility")

    def __str__(self):
        return f"{self.provider.full_name} @ {self.facility.name}"


class ProviderClinicalSetting(BaseTrackedModel):
    facility = models.OneToOneField(
        Facility, on_delete=models.CASCADE, related_name="provider_clinical_settings"
    )
    edit_window_hours = models.PositiveIntegerField(default=24)
    push_notifications = models.BooleanField(default=True)
    critical_lab_alerts = models.BooleanField(default=True)
    email_reports = models.BooleanField(default=True)
    two_factor_enabled = models.BooleanField(default=False)

    class Meta:
        ordering = ["facility__name"]

    def __str__(self):
        return f"{self.facility.name} clinical settings"


class ProviderInventoryItem(BaseTrackedModel):
    item_code = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="provider_inventory_items"
    )
    name = models.CharField(max_length=160)
    category = models.CharField(max_length=120, blank=True)
    stock = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=24, default="units")
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, default="ok")
    ecommerce = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    barcode = models.CharField(max_length=64, blank=True)
    supplier_barcode = models.CharField(max_length=64, blank=True)
    saved_discount = models.JSONField(default=dict, blank=True)
    history = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.item_code


class ProviderBillingRecord(BaseTrackedModel):
    billing_code = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="provider_billing_records"
    )
    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_billing_records",
    )
    patient_name = models.CharField(max_length=120)
    service_name = models.CharField(max_length=160, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=16, default="pending")
    payment_method = models.CharField(max_length=64, blank=True)
    billed_on = models.DateField(default=timezone.now)
    paid_on = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-billed_on", "-created_at"]

    def __str__(self):
        return self.billing_code


class ProviderPortalNotification(BaseTrackedModel):
    notification_code = models.CharField(max_length=50, unique=True)
    event_id = models.CharField(max_length=120, blank=True, null=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="provider_notifications",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_notifications",
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    icon_lib = models.CharField(max_length=32, default="feather")
    icon_name = models.CharField(max_length=64, default="bell")
    color = models.CharField(max_length=24, default="primary")
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("user", "facility", "event_id")

    def __str__(self):
        return self.notification_code


class ProviderSupportTicket(BaseTrackedModel):
    ticket_code = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="provider_support_tickets"
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="raised_provider_support_tickets",
    )
    raised_by_name = models.CharField(max_length=120)
    raised_by_role = models.CharField(max_length=32, choices=ProviderSubRole.choices)
    title = models.CharField(max_length=180)
    description = models.TextField()
    category = models.CharField(
        max_length=64,
        choices=ProviderSupportTicketCategory.choices,
        blank=True,
        default=ProviderSupportTicketCategory.OTHER,
    )
    priority = models.CharField(
        max_length=16,
        choices=ProviderSupportTicketPriority.choices,
        default=ProviderSupportTicketPriority.MEDIUM,
    )
    status = models.CharField(
        max_length=24,
        choices=ProviderSupportTicketStatus.choices,
        default=ProviderSupportTicketStatus.OPEN,
    )
    responses = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.ticket_code


class ProviderActivityLog(BaseTrackedModel):
    log_code = models.CharField(max_length=50, unique=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_activity_logs",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_activity_logs",
    )
    staff_name = models.CharField(max_length=120)
    staff_membership_id = models.CharField(max_length=40, blank=True)
    role = models.CharField(max_length=32, choices=ProviderSubRole.choices, blank=True)
    module = models.CharField(max_length=64, blank=True)
    action = models.CharField(max_length=120)
    detail = models.TextField(blank=True)
    entry_type = models.CharField(max_length=32, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-occurred_at", "-created_at"]

    def __str__(self):
        return self.log_code


class ProviderPosTransaction(BaseTrackedModel):
    transaction_code = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="provider_pos_transactions"
    )
    pos_id = models.CharField(max_length=40, blank=True)
    cashier_name = models.CharField(max_length=120)
    items = models.JSONField(default=list, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=32, blank=True)
    payment_ref = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=24, default="completed")
    receipt_no = models.CharField(max_length=64, unique=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.transaction_code


class RiderProfile(BaseTrackedModel):
    rider_code = models.CharField(max_length=40, unique=True)
    full_name = models.CharField(max_length=120)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    vehicle_type = models.CharField(max_length=64, blank=True)
    vehicle_registration = models.CharField(max_length=32, blank=True)
    zone = models.CharField(max_length=64, blank=True)
    phone = models.CharField(max_length=32, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    total_trips = models.PositiveIntegerField(default=0)
    bank_details = models.CharField(max_length=120, blank=True)
    is_online = models.BooleanField(default=False)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return f"{self.rider_code} - {self.full_name}"


class RiderUserLink(BaseTrackedModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rider_link",
    )
    rider = models.OneToOneField(
        RiderProfile,
        on_delete=models.CASCADE,
        related_name="user_link",
    )
    default_facility = models.ForeignKey(
        Facility,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rider_links",
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["rider__full_name"]

    def __str__(self):
        return f"{self.user.get_username()} - {self.rider.full_name}"


class RiderFacilityAccess(BaseTrackedModel):
    rider = models.ForeignKey(
        RiderProfile,
        on_delete=models.CASCADE,
        related_name="facility_access",
    )
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_access",
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["facility__name", "rider__full_name"]
        unique_together = ("rider", "facility")

    def __str__(self):
        return f"{self.rider.full_name} @ {self.facility.name}"


class RiderJob(BaseTrackedModel):
    job_ref = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_jobs",
    )
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="jobs"
    )
    booking = models.ForeignKey(
        CommandBooking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rider_jobs",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    severity = models.CharField(
        max_length=16, choices=SeverityLevel.choices, default=SeverityLevel.MEDIUM
    )
    pickup_location = models.CharField(max_length=200, blank=True)
    dropoff_location = models.CharField(max_length=200, blank=True)
    delivery_proof_url = models.URLField(max_length=500, blank=True)
    sample_collected = models.BooleanField(default=False)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.job_ref


class RiderHistoryEntry(BaseTrackedModel):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_history_entries",
    )
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="history_entries"
    )
    job = models.ForeignKey(
        RiderJob, on_delete=models.SET_NULL, null=True, blank=True, related_name="history_entries"
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    title = models.CharField(max_length=160)
    details = models.TextField(blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self):
        return f"{self.rider.rider_code} - {self.title}"


class RiderEarningsSnapshot(BaseTrackedModel):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_earnings_snapshots",
    )
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="earnings_snapshots"
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    period_start = models.DateField()
    period_end = models.DateField()
    gross_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payout_state = models.CharField(
        max_length=24, choices=PayoutState.choices, default=PayoutState.DRAFT
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-period_end"]

    def __str__(self):
        return f"{self.rider.rider_code} {self.period_start} - {self.period_end}"


class RiderRequestDecision(BaseTrackedModel):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_request_decisions",
    )
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="request_decisions"
    )
    order = models.ForeignKey(
        PatientMedicationOrder,
        on_delete=models.CASCADE,
        related_name="rider_request_decisions",
    )
    decision = models.CharField(max_length=16, default="declined")

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        unique_together = ("rider", "order")

    def __str__(self):
        return f"{self.rider.rider_code} {self.order.order_number} {self.decision}"


class RiderPortalNotification(BaseTrackedModel):
    notification_code = models.CharField(max_length=50, unique=True)
    event_id = models.CharField(max_length=120, blank=True, null=True, db_index=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_notifications",
    )
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="portal_notifications"
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    icon_lib = models.CharField(max_length=32, default="feather")
    icon_name = models.CharField(max_length=64, default="bell")
    color = models.CharField(max_length=24, default="primary")
    read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ("rider", "facility", "event_id")

    def __str__(self):
        return f"{self.notification_code} - {self.title}"


class RiderChatMessage(BaseTrackedModel):
    message_code = models.CharField(max_length=50, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="rider_chat_messages",
    )
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="chat_messages"
    )
    order = models.ForeignKey(
        PatientMedicationOrder, on_delete=models.CASCADE, related_name="rider_chat_messages"
    )
    sender_role = models.CharField(max_length=24)
    sender_name = models.CharField(max_length=120)
    message = models.TextField()
    sent_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["sent_at", "created_at", "id"]

    def __str__(self):
        return f"{self.message_code} - {self.sender_role}"


class RiderPreference(BaseTrackedModel):
    rider = models.ForeignKey(
        RiderProfile, on_delete=models.CASCADE, related_name="preferences"
    )
    facility = models.ForeignKey(
        Facility, on_delete=models.CASCADE, related_name="rider_preferences"
    )
    push_notifications = models.BooleanField(default=True)
    sound_alerts = models.BooleanField(default=True)
    location_share = models.BooleanField(default=True)
    auto_accept = models.BooleanField(default=False)

    class Meta:
        ordering = ["facility__name", "rider__full_name"]
        unique_together = ("rider", "facility")

    def __str__(self):
        return f"{self.rider.rider_code} preferences"


class Supplier(BaseTrackedModel):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="suppliers",
    )
    name = models.CharField(max_length=120)
    contact_person = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.IDLE
    )
    rating = models.DecimalField(max_digits=4, decimal_places=2, default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class StockItem(BaseTrackedModel):
    sku = models.CharField(max_length=64, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="stock_items",
    )
    name = models.CharField(max_length=120)
    status = models.CharField(
        max_length=16, choices=InventoryState.choices, default=InventoryState.IN_STOCK
    )
    quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_items",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class InventoryBatch(BaseTrackedModel):
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="inventory_batches",
    )
    stock_item = models.ForeignKey(
        StockItem, on_delete=models.CASCADE, related_name="batches"
    )
    batch_code = models.CharField(max_length=64, unique=True)
    status = models.CharField(
        max_length=16, choices=InventoryState.choices, default=InventoryState.IN_STOCK
    )
    quantity = models.PositiveIntegerField(default=0)
    received_on = models.DateField(null=True, blank=True)
    expires_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.batch_code


class SaleRecord(BaseTrackedModel):
    sale_number = models.CharField(max_length=64, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="sale_records",
    )
    item = models.ForeignKey(
        StockItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="sales"
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    quantity = models.PositiveIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sold_at = models.DateTimeField(default=timezone.now)
    channel = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-sold_at"]

    def __str__(self):
        return self.sale_number


class RevenueEntry(BaseTrackedModel):
    reference = models.CharField(max_length=64, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="revenue_entries",
    )
    source = models.CharField(max_length=120, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    reconciliation_state = models.CharField(
        max_length=24,
        choices=ReconciliationState.choices,
        default=ReconciliationState.PENDING,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="KES")
    booked_at = models.DateTimeField(default=timezone.now)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciled_revenue_entries",
    )

    class Meta:
        ordering = ["-booked_at"]

    def __str__(self):
        return self.reference


class PayoutRequest(BaseTrackedModel):
    reference = models.CharField(max_length=64, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="payout_requests",
    )
    beneficiary_name = models.CharField(max_length=120)
    status = models.CharField(
        max_length=24, choices=PayoutState.choices, default=PayoutState.DRAFT
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="KES")
    requested_at = models.DateTimeField(default=timezone.now)
    review_note = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_payouts",
    )

    class Meta:
        ordering = ["-requested_at"]

    def __str__(self):
        return self.reference


class Invoice(BaseTrackedModel):
    invoice_number = models.CharField(max_length=64, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    customer_name = models.CharField(max_length=120)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.DRAFT
    )
    collection_stage = models.CharField(
        max_length=16, choices=CollectionStage.choices, default=CollectionStage.CURRENT
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="KES")
    issued_on = models.DateField(default=timezone.now)
    due_on = models.DateField(null=True, blank=True)
    paid_on = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ["-issued_on"]

    def __str__(self):
        return self.invoice_number


class TransactionLog(BaseTrackedModel):
    transaction_id = models.CharField(max_length=80, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="transaction_logs",
    )
    transaction_type = models.CharField(max_length=64, blank=True)
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.CONFIRMED
    )
    reconciliation_state = models.CharField(
        max_length=24,
        choices=ReconciliationState.choices,
        default=ReconciliationState.PENDING,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="KES")
    processed_at = models.DateTimeField(default=timezone.now)
    reconciled_at = models.DateTimeField(null=True, blank=True)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reconciled_transactions",
    )
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-processed_at"]

    def __str__(self):
        return self.transaction_id


class ExecutiveKPI(BaseTrackedModel):
    metric_name = models.CharField(max_length=120)
    metric_code = models.CharField(max_length=40, unique=True)
    facility = models.ForeignKey(
        Facility,
        on_delete=models.CASCADE,
        related_name="executive_kpis",
    )
    status = models.CharField(
        max_length=16, choices=WorkflowStatus.choices, default=WorkflowStatus.IDLE
    )
    value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    trend_delta = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    period_start = models.DateField()
    period_end = models.DateField()
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="executive_kpis",
    )

    class Meta:
        ordering = ["-period_end", "metric_name"]

    def __str__(self):
        return self.metric_name
