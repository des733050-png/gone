"""
core/signals.py

Reactive side-effects for state transitions on core models.

Currently fires:
  - In-app provider notification when a ProviderVerificationSubmission
    transitions to VERIFIED or REJECTED, so facility admins see the result
    in the portal without polling.
  - Best-effort email notification (uses django.core.mail.send_mail; if
    SMTP isn't configured it falls back silently).
"""
from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import (
    Facility,
    FacilityStatus,
    ProviderAppointment,
    ProviderMembership,
    ProviderPortalNotification,
    ProviderSubRole,
    ProviderVerificationStatus,
    ProviderVerificationSubmission,
)


def _next_provider_notification_code():
    """Counter-based unique code with collision guard."""
    counter = ProviderPortalNotification.objects.count() + 1
    while True:
        candidate = f"pvn-{counter:04d}"
        if not ProviderPortalNotification.objects.filter(
            notification_code=candidate
        ).exists():
            return candidate
        counter += 1


def _email_admins(facility, subject, body):
    """Best-effort email to facility admins; never raises."""
    try:
        if not getattr(settings, "EMAIL_HOST", None):
            return
        recipients = list(
            ProviderMembership.objects.filter(
                facility=facility,
                role=ProviderSubRole.FACILITY_ADMIN,
                is_active=True,
                user__email__gt="",
            ).values_list("user__email", flat=True)
        )
        if facility.email and facility.email not in recipients:
            recipients.append(facility.email)
        if not recipients:
            return
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or recipients[0]
        send_mail(subject, body, from_email, recipients, fail_silently=True)
    except Exception:
        pass


# ─── Track previous statuses so we can detect transitions ────────────────────

@receiver(pre_save, sender=Facility)
def _capture_prev_facility_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._prev_facility_status = None
        return
    try:
        prev = sender.objects.only("status").get(pk=instance.pk)
        instance._prev_facility_status = prev.status
    except sender.DoesNotExist:
        instance._prev_facility_status = None


@receiver(post_save, sender=Facility)
def _sync_facility_approval_to_verification(sender, instance, created, **kwargs):
    """
    When a facility is manually set to APPROVED (e.g. via Django admin), find its
    most-recent PENDING verification submission and mark it VERIFIED.

    This mirrors the reverse of the existing forward signal: submission VERIFIED
    → facility APPROVED.  Without this, approving the facility in the admin
    leaves the submission in PENDING and the portal stays locked.

    The downstream _notify_on_verification_decision signal already guards against
    re-saving the facility (checks facility.status != APPROVED), so there is no loop.
    """
    if created:
        return
    prev = getattr(instance, "_prev_facility_status", None)
    if prev == instance.status:
        return
    if instance.status != FacilityStatus.APPROVED:
        return

    submission = (
        ProviderVerificationSubmission.objects
        .filter(facility=instance, status=ProviderVerificationStatus.PENDING)
        .order_by("-created_at")
        .first()
    )
    if submission is None:
        return

    # approve() sets status = VERIFIED and saves, which fires notifications/email.
    submission.approve(reviewed_by=None)


@receiver(pre_save, sender=ProviderVerificationSubmission)
def _capture_prev_verification_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._prev_status = None
        return
    try:
        prev = sender.objects.only("status").get(pk=instance.pk)
        instance._prev_status = prev.status
    except sender.DoesNotExist:
        instance._prev_status = None


@receiver(post_save, sender=ProviderVerificationSubmission)
def _notify_on_verification_decision(sender, instance, created, **kwargs):
    """Fire when the super admin transitions a submission to VERIFIED/REJECTED."""
    if created:
        return
    prev_status = getattr(instance, "_prev_status", None)
    if prev_status == instance.status:
        return

    facility = instance.facility
    admins = list(
        ProviderMembership.objects.filter(
            facility=facility,
            role=ProviderSubRole.FACILITY_ADMIN,
            is_active=True,
        ).select_related("user")
    )

    if instance.status == ProviderVerificationStatus.VERIFIED:
        title = "Facility verified"
        message = (
            f"Your facility ({facility.name}) has been verified. "
            "Full portal access is now unlocked."
        )
        icon_name = "check-circle"
        color = "success"
        # Auto-promote the facility itself to APPROVED so verification
        # gates lift consistently across the platform.
        if facility.status != FacilityStatus.APPROVED:
            facility.status = FacilityStatus.APPROVED
            facility.save(update_fields=["status"])

        _email_admins(
            facility,
            "GONEP — your facility has been verified",
            (
                f"Hi,\n\n{facility.name} has been verified by GONEP. "
                "You now have full access to the provider portal.\n\n"
                "Sign in and complete the short Getting Started flow to "
                "begin adding your team and offering services.\n\n"
                "— GONEP"
            ),
        )

    elif instance.status == ProviderVerificationStatus.REJECTED:
        reason = (instance.rejection_reason or "").strip() or "No reason provided."
        title = "Verification rejected"
        message = (
            f"Your verification was rejected: {reason} "
            "Please review the documents and re-submit from the portal."
        )
        icon_name = "x-circle"
        color = "danger"
        _email_admins(
            facility,
            "GONEP — additional verification information required",
            (
                f"Hi,\n\nYour facility verification was rejected with this "
                f"reason: {reason}\n\n"
                "Please sign in and re-upload the requested documents.\n\n"
                "— GONEP"
            ),
        )

    else:
        # Other transitions (e.g. PENDING) don't fire notifications.
        return

    # In-app notification per facility admin
    for membership in admins:
        ProviderPortalNotification.objects.create(
            notification_code=_next_provider_notification_code(),
            user=membership.user,
            facility=facility,
            title=title,
            message=message,
            icon_lib="feather",
            icon_name=icon_name,
            color=color,
            read=False,
        )


# ─── Appointment confirmation email ──────────────────────────────────────────

@receiver(pre_save, sender=ProviderAppointment)
def _capture_prev_appointment_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._prev_appointment_status = None
        return
    try:
        prev = sender.objects.only("status").get(pk=instance.pk)
        instance._prev_appointment_status = prev.status
    except sender.DoesNotExist:
        instance._prev_appointment_status = None


@receiver(post_save, sender=ProviderAppointment)
def _email_on_appointment_confirmed(sender, instance, created, **kwargs):
    """Send confirmation email to the patient when appointment is confirmed."""
    if created:
        return
    prev = getattr(instance, "_prev_appointment_status", None)
    if prev == instance.status:
        return
    if instance.status != "confirmed":
        return
    from .email_utils import send_appointment_confirmation_email
    send_appointment_confirmation_email(instance)
