"""
Management command: send_virtual_meeting_links
===============================================
Finds Virtual appointments whose scheduled_for is within the next 5–10 minutes,
creates a Daily.co meeting room (or a fallback URL), saves it to
PatientBooking.daily_room_url, and fires a PatientPortalNotification with the link.

Run via cron / Windows Task Scheduler every minute:
    python manage.py send_virtual_meeting_links

Or for testing:
    python manage.py send_virtual_meeting_links --window 60  (look 60 minutes ahead)
    python manage.py send_virtual_meeting_links --dry-run
"""

import json
import urllib.request
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import PatientBooking, PatientPortalNotification, WorkflowStatus


VIRTUAL_TYPE = "virtual"
WINDOW_MINUTES_AHEAD = 10   # look up to this many minutes into the future
WINDOW_MINUTES_BACK  = 1    # still send if we missed by up to 1 minute


def _create_daily_room(booking_ref: str) -> str:
    """
    Call Daily.co REST API to create a private room and return its URL.
    Falls back to a deterministic Jitsi Meet URL if Daily is not configured —
    Jitsi is open-source, requires no API key, and works in any browser.
    """
    daily_api_key = getattr(settings, "DAILY_API_KEY", "").strip()
    if daily_api_key:
        try:
            payload = json.dumps({"name": booking_ref, "privacy": "private"}).encode()
            req = urllib.request.Request(
                "https://api.daily.co/v1/rooms",
                data=payload,
                headers={
                    "Authorization": f"Bearer {daily_api_key}",
                    "Content-Type": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read())
                url = data.get("url", "")
                if url:
                    return url
        except Exception as exc:
            # Log but fall through to Jitsi fallback
            print(f"[send_virtual_meeting_links] Daily.co error for {booking_ref}: {exc}")

    # Fallback: Jitsi Meet (free, no key, open-source video conferencing)
    return f"https://meet.jit.si/gonep-{booking_ref}"


class Command(BaseCommand):
    help = (
        "Send Daily.co meeting links for Virtual appointments starting within "
        f"{WINDOW_MINUTES_AHEAD} minutes. Run every 1 minute via cron."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--window",
            type=int,
            default=WINDOW_MINUTES_AHEAD,
            help="Look-ahead window in minutes (default: %(default)s).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would happen without writing to the DB or sending notifications.",
        )

    def handle(self, *args, **options):
        window = options["window"]
        dry_run = options["dry_run"]
        now = timezone.now()

        # Find confirmed virtual bookings in the time window that haven't been sent yet
        window_start = now - timedelta(minutes=WINDOW_MINUTES_BACK)
        window_end   = now + timedelta(minutes=window)

        bookings = PatientBooking.objects.select_related("patient", "facility").filter(
            appointment_type__iexact=VIRTUAL_TYPE,
            status=WorkflowStatus.CONFIRMED,
            meeting_link_sent=False,
            scheduled_for__gte=window_start,
            scheduled_for__lte=window_end,
        )

        if not bookings.exists():
            self.stdout.write("No virtual meetings to process.")
            return

        sent = 0
        for booking in bookings:
            self.stdout.write(
                f"Processing {booking.booking_ref} | "
                f"scheduled={booking.scheduled_for} | "
                f"patient={booking.patient.full_name if booking.patient else '?'}"
            )

            room_url = _create_daily_room(booking.booking_ref)

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(f"  [DRY RUN] Would send: {room_url}")
                )
                continue

            # Store URL and mark sent
            booking.daily_room_url = room_url
            booking.meeting_link_sent = True
            booking.save(update_fields=["daily_room_url", "meeting_link_sent", "updated_at"])

            # Notify the patient
            if booking.patient:
                scheduled_local = timezone.localtime(booking.scheduled_for)
                time_str = scheduled_local.strftime("%I:%M %p").lstrip("0") if hasattr(scheduled_local, "strftime") else str(booking.scheduled_for)
                PatientPortalNotification.objects.create(
                    notification_code=f"pn-meet-{booking.booking_ref}",
                    patient=booking.patient,
                    facility=booking.facility,
                    kind="appointment",
                    title="Your virtual meeting is starting soon",
                    body=(
                        f"Your appointment with {booking.provider_name or 'your doctor'} "
                        f"starts at {time_str}. Tap to join: {room_url}"
                    ),
                    icon_lib="feather",
                    icon_name="video",
                    read=False,
                )

            sent += 1
            self.stdout.write(self.style.SUCCESS(f"  Sent: {room_url}"))

        self.stdout.write(self.style.SUCCESS(f"Done — {sent} meeting link(s) sent."))
