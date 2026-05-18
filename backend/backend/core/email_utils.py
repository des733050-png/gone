"""
core/email_utils.py

Best-effort HTML email helpers for Gonep Healthcare.
Every public function is safe to call even when SMTP is not configured —
it will silently return without raising so callers never need try/except.

Configure via environment variables (see settings.py EMAIL_* block):
  EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS,
  EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

BRAND = "Gonep Healthcare"
PRIMARY = "#2563EB"
BG = "#F8FAFC"
CARD_BG = "#FFFFFF"
MUTED = "#64748B"
BORDER = "#E2E8F0"
SUCCESS = "#16A34A"
DANGER = "#DC2626"
WARNING = "#D97706"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _smtp_ready():
    return bool(getattr(settings, "EMAIL_HOST", None))


def _from_address():
    return getattr(settings, "DEFAULT_FROM_EMAIL", f"{BRAND} <noreply@gonep.health>")


def _base_html(title, body_html):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:{BG};padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:{PRIMARY};border-radius:12px 12px 0 0;padding:24px 32px;">
            <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">{BRAND}</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:{CARD_BG};border-left:1px solid {BORDER};border-right:1px solid {BORDER};padding:32px;">
            {body_html}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:{BG};border:1px solid {BORDER};border-top:none;border-radius:0 0 12px 12px;
                     padding:16px 32px;text-align:center;">
            <span style="color:{MUTED};font-size:12px;">
              &copy; {BRAND} &nbsp;|&nbsp;
              This is an automated message — please do not reply.
            </span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send(subject, text_body, html_body, recipients):
    """Dispatch one email. Never raises."""
    if not _smtp_ready():
        return
    recipients = [r for r in (recipients or []) if r]
    if not recipients:
        return
    try:
        msg = EmailMultiAlternatives(subject, text_body, _from_address(), recipients)
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=True)
    except Exception:
        pass


def _info_row(label, value):
    return (
        f'<tr>'
        f'<td style="padding:6px 0;color:{MUTED};font-size:13px;width:140px;">{label}</td>'
        f'<td style="padding:6px 0;color:#1E293B;font-size:13px;font-weight:600;">{value}</td>'
        f'</tr>'
    )


def _button(href, label, color=PRIMARY):
    return (
        f'<a href="{href}" style="display:inline-block;margin-top:20px;padding:12px 28px;'
        f'background:{color};color:#fff;border-radius:8px;font-weight:700;font-size:14px;'
        f'text-decoration:none;">{label}</a>'
    )


# ── Public email functions ────────────────────────────────────────────────────

def send_staff_welcome_email(user, facility_name, role_label, temp_password):
    """
    Sent to a newly created staff member with their one-time login password.
    """
    portal_url = getattr(settings, "GONEP_PORTAL_LOGIN_URL", "")
    first = user.first_name or user.email

    text = (
        f"Welcome to {BRAND}, {first}!\n\n"
        f"Your account has been created at {facility_name} with the role: {role_label}.\n\n"
        f"Your one-time password: {temp_password}\n\n"
        f"Please sign in and change your password immediately.\n"
        f"{'Portal: ' + portal_url if portal_url else ''}"
    )

    body_html = f"""
        <h2 style="color:#1E293B;font-size:22px;font-weight:800;margin:0 0 4px;">
          Welcome to {BRAND}! 🎉
        </h2>
        <p style="color:{MUTED};font-size:14px;margin:0 0 24px;">
          Your account at <strong>{facility_name}</strong> is ready.
        </p>

        <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">
          {_info_row("Role", role_label)}
          {_info_row("Email", user.email)}
          {_info_row("Facility", facility_name)}
        </table>

        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
          <p style="color:#166534;font-size:13px;font-weight:700;margin:0 0 6px;">
            Your one-time password
          </p>
          <code style="font-size:20px;font-weight:800;color:#15803D;letter-spacing:2px;">
            {temp_password}
          </code>
          <p style="color:#166534;font-size:12px;margin:8px 0 0;">
            Sign in and change your password immediately. This password will not be shown again.
          </p>
        </div>

        {'<p>' + _button(portal_url, "Sign in to the portal") + '</p>' if portal_url else ''}

        <p style="color:{MUTED};font-size:13px;margin-top:24px;">
          If you weren't expecting this email, contact your facility administrator.
        </p>
    """

    _send(
        subject=f"[{BRAND}] Your account at {facility_name} is ready",
        text_body=text,
        html_body=_base_html(f"Welcome to {BRAND}", body_html),
        recipients=[user.email],
    )


def send_staff_password_reset_email(user, facility_name, new_password):
    """
    Sent to a staff member when their password is reset by the facility admin.
    """
    portal_url = getattr(settings, "GONEP_PORTAL_LOGIN_URL", "")
    first = user.first_name or user.email

    text = (
        f"Hello {first},\n\n"
        f"Your password at {facility_name} has been reset by your administrator.\n\n"
        f"New one-time password: {new_password}\n\n"
        f"Please sign in and change your password immediately.\n"
        f"{'Portal: ' + portal_url if portal_url else ''}"
    )

    body_html = f"""
        <h2 style="color:#1E293B;font-size:22px;font-weight:800;margin:0 0 4px;">
          Password reset
        </h2>
        <p style="color:{MUTED};font-size:14px;margin:0 0 24px;">
          Hello <strong>{first}</strong>, your administrator at <strong>{facility_name}</strong>
          has reset your portal password.
        </p>

        <div style="background:#FFF7ED;border:1px solid #FCD34D;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
          <p style="color:#92400E;font-size:13px;font-weight:700;margin:0 0 6px;">
            New one-time password
          </p>
          <code style="font-size:20px;font-weight:800;color:#B45309;letter-spacing:2px;">
            {new_password}
          </code>
          <p style="color:#92400E;font-size:12px;margin:8px 0 0;">
            Sign in and change your password immediately.
          </p>
        </div>

        {'<p>' + _button(portal_url, "Sign in now", WARNING) + '</p>' if portal_url else ''}

        <p style="color:{MUTED};font-size:13px;margin-top:24px;">
          If you did not request this reset, contact your facility admin immediately.
        </p>
    """

    _send(
        subject=f"[{BRAND}] Your password at {facility_name} has been reset",
        text_body=text,
        html_body=_base_html("Password reset", body_html),
        recipients=[user.email],
    )


def send_appointment_confirmation_email(appointment):
    """
    Sent to the patient when their appointment is confirmed.
    Safely handles missing patient / email fields.
    """
    try:
        patient = appointment.patient
        if not patient:
            return
        patient_user = getattr(patient, "user", None)
        patient_email = getattr(patient_user, "email", None) or getattr(patient, "email", None)
        if not patient_email:
            return

        first = (
            getattr(patient_user, "first_name", None)
            or getattr(patient, "full_name", "Patient")
        )
        facility_name = appointment.facility.name if appointment.facility_id else "the clinic"
        doctor_name = (
            appointment.provider.full_name
            if appointment.provider_id and appointment.provider
            else "your assigned doctor"
        )
        appt_type = appointment.appointment_type or "Consultation"
        scheduled = appointment.scheduled_for
        date_str = scheduled.strftime("%A, %d %B %Y at %I:%M %p") if scheduled else "TBD"

        text = (
            f"Hello {first},\n\n"
            f"Your appointment at {facility_name} has been confirmed.\n\n"
            f"Details:\n"
            f"  Doctor:  {doctor_name}\n"
            f"  Type:    {appt_type}\n"
            f"  Date:    {date_str}\n\n"
            f"Please arrive 10 minutes before your scheduled time.\n"
            f"Contact {facility_name} if you need to reschedule."
        )

        body_html = f"""
            <h2 style="color:#1E293B;font-size:22px;font-weight:800;margin:0 0 4px;">
              Appointment confirmed ✓
            </h2>
            <p style="color:{MUTED};font-size:14px;margin:0 0 24px;">
              Hello <strong>{first}</strong>, your appointment at
              <strong>{facility_name}</strong> is confirmed.
            </p>

            <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;
                        padding:16px 20px;margin-bottom:20px;">
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                {_info_row("Doctor", doctor_name)}
                {_info_row("Type", appt_type)}
                {_info_row("Date &amp; time", date_str)}
                {_info_row("Facility", facility_name)}
              </table>
            </div>

            <p style="color:{MUTED};font-size:13px;">
              Please arrive <strong>10 minutes early</strong>.
              Contact {facility_name} if you need to reschedule.
            </p>
        """

        _send(
            subject=f"[{BRAND}] Your appointment on {date_str} is confirmed",
            text_body=text,
            html_body=_base_html("Appointment confirmed", body_html),
            recipients=[patient_email],
        )
    except Exception:
        pass


def send_support_ticket_created_email(ticket):
    """
    Notify the Gonep support inbox and confirm receipt to the ticket raiser.
    """
    try:
        support_inbox = getattr(settings, "SUPPORT_NOTIFY_EMAIL", "")
        raiser_email = getattr(ticket.raised_by, "email", None)

        facility_name = ticket.facility.name if ticket.facility_id else "Unknown"
        priority_color = {
            "critical": DANGER, "high": DANGER, "medium": WARNING,
        }.get(ticket.priority, PRIMARY)

        # ── Notify the support inbox ──
        if support_inbox:
            text = (
                f"New support ticket: {ticket.ticket_code}\n\n"
                f"From: {ticket.raised_by_name} ({ticket.raised_by_role}) @ {facility_name}\n"
                f"Category: {ticket.category}\n"
                f"Priority: {ticket.priority}\n\n"
                f"Title: {ticket.title}\n\n"
                f"{ticket.description}"
            )
            body_html = f"""
                <h2 style="color:#1E293B;font-size:20px;font-weight:800;margin:0 0 4px;">
                  New support ticket
                </h2>
                <p style="color:{MUTED};font-size:13px;margin:0 0 20px;">
                  Ticket <strong>{ticket.ticket_code}</strong> opened
                  by <strong>{ticket.raised_by_name}</strong>
                  ({ticket.raised_by_role}) at <strong>{facility_name}</strong>.
                </p>
                <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
                  {_info_row("Category", ticket.category)}
                  {_info_row("Priority",
                    f'<span style="color:{priority_color};font-weight:700;">'
                    f'{ticket.priority.upper()}</span>')}
                  {_info_row("Status", ticket.status)}
                </table>
                <p style="font-weight:700;color:#1E293B;margin:0 0 8px;">{ticket.title}</p>
                <p style="color:{MUTED};font-size:13px;white-space:pre-wrap;margin:0;">
                  {ticket.description}
                </p>
            """
            _send(
                subject=f"[Support] [{ticket.priority.upper()}] {ticket.title} — {ticket.ticket_code}",
                text_body=text,
                html_body=_base_html("Support ticket", body_html),
                recipients=[support_inbox],
            )

        # ── Confirm receipt to the raiser ──
        if raiser_email:
            text = (
                f"Hello {ticket.raised_by_name},\n\n"
                f"We received your support request ({ticket.ticket_code}).\n\n"
                f"Title: {ticket.title}\n"
                f"Priority: {ticket.priority}\n\n"
                f"Our team will respond as soon as possible. "
                f"You can track progress in the Support section of your portal."
            )
            body_html = f"""
                <h2 style="color:#1E293B;font-size:22px;font-weight:800;margin:0 0 4px;">
                  We received your request
                </h2>
                <p style="color:{MUTED};font-size:14px;margin:0 0 24px;">
                  Hello <strong>{ticket.raised_by_name}</strong>, your support ticket has been
                  logged and our team will look into it shortly.
                </p>
                <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
                  {_info_row("Reference", ticket.ticket_code)}
                  {_info_row("Title", ticket.title)}
                  {_info_row("Priority", ticket.priority)}
                  {_info_row("Status", "Open")}
                </table>
                <p style="color:{MUTED};font-size:13px;">
                  Track progress in the <strong>Support</strong> section of your portal.
                  Do not reply to this email.
                </p>
            """
            _send(
                subject=f"[{BRAND}] Support request received — {ticket.ticket_code}",
                text_body=text,
                html_body=_base_html("Support request received", body_html),
                recipients=[raiser_email],
            )
    except Exception:
        pass


def send_support_ticket_response_email(ticket, response_text, responder_name="Support Team"):
    """
    Sent to the ticket raiser when the facility admin posts a response.
    """
    try:
        raiser_email = getattr(ticket.raised_by, "email", None)
        if not raiser_email:
            return

        text = (
            f"Hello {ticket.raised_by_name},\n\n"
            f"There is a new response on your support ticket {ticket.ticket_code}.\n\n"
            f"From: {responder_name}\n\n"
            f"{response_text}\n\n"
            f"Log in to your portal to view the full conversation."
        )

        body_html = f"""
            <h2 style="color:#1E293B;font-size:22px;font-weight:800;margin:0 0 4px;">
              New response on your ticket
            </h2>
            <p style="color:{MUTED};font-size:14px;margin:0 0 24px;">
              Hello <strong>{ticket.raised_by_name}</strong>, you have a new response on
              ticket <strong>{ticket.ticket_code}</strong>: <em>{ticket.title}</em>.
            </p>

            <div style="border-left:4px solid {PRIMARY};padding:12px 16px;
                        background:#EFF6FF;border-radius:0 8px 8px 0;margin-bottom:20px;">
              <p style="color:{MUTED};font-size:12px;font-weight:700;margin:0 0 6px;">
                {responder_name}
              </p>
              <p style="color:#1E293B;font-size:14px;margin:0;white-space:pre-wrap;">
                {response_text}
              </p>
            </div>

            <p style="color:{MUTED};font-size:13px;">
              Log in to your portal to view the full conversation and reply.
            </p>
        """

        _send(
            subject=f"[{BRAND}] Response on ticket {ticket.ticket_code} — {ticket.title}",
            text_body=text,
            html_body=_base_html("Ticket response", body_html),
            recipients=[raiser_email],
        )
    except Exception:
        pass
