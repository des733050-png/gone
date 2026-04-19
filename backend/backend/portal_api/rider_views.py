from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import (
    PatientMedicationOrder,
    PatientPortalOrderStatus,
    RiderChatMessage,
    RiderHistoryEntry,
    RiderPortalNotification,
    RiderPreference,
    RiderRequestDecision,
)
from portal_api.utils import (
    RIDER_FACILITY_SESSION_KEY,
    build_rider_payload,
    format_currency,
    format_datetime_label,
    format_relative_time,
    format_time_label,
    get_rider_active_facility,
    get_rider_link,
)


def get_active_rider_context_or_raise(request):
    link = get_rider_link(request.user)
    if link is None:
        raise NotFound("Rider profile link not found.")
    facility, access_rows = get_rider_active_facility(
        link,
        request.session.get(RIDER_FACILITY_SESSION_KEY),
    )
    if facility is None:
        raise PermissionDenied("No facility context is available for this rider.")
    return link, facility, access_rows


def _lookup_by_id_or_code(queryset, identifier, code_field, not_found_message):
    try:
        return queryset.get(pk=identifier)
    except Exception:
        try:
            return queryset.get(**{code_field: identifier})
        except queryset.model.DoesNotExist as exc:
            raise NotFound(not_found_message) from exc


def _next_code(model_class, field_name, prefix, padding=4):
    counter = model_class.objects.count() + 1
    while True:
        candidate = f"{prefix}{counter:0{padding}d}"
        if not model_class.objects.filter(**{field_name: candidate}).exists():
            return candidate
        counter += 1


def _distance_label(order):
    if order.distance_km:
        return f"{order.distance_km:.1f} km"
    return "TBD"


def _eta_label(order):
    if order.eta_label:
        return order.eta_label
    if order.estimated_minutes:
        return f"~{order.estimated_minutes} min"
    return "TBD"


def _order_items_payload(order):
    return [
        f"{item.medication_name} x{item.quantity}"
        for item in order.items.all()
    ]


def build_rider_request_payload(order):
    return {
        "id": str(order.id),
        "reference": order.order_number,
        "patient": order.patient.full_name,
        "address": order.delivery_address or order.patient.address or "Address pending",
        "distance": _distance_label(order),
        "eta": _eta_label(order),
        "items": _order_items_payload(order),
        "pharmacy": order.pharmacy_name or "GONEP Pharmacy",
        "payout": format_currency(order.rider_payout_amount),
        "status": "pending",
        "placed_at": format_relative_time(order.placed_at),
    }


def build_active_delivery_payload(order):
    return {
        "id": str(order.id),
        "reference": order.order_number,
        "order_id": order.order_number,
        "patient": order.patient.full_name,
        "phone": order.patient_phone or order.patient.phone or "",
        "address": order.delivery_address or order.patient.address or "Address pending",
        "items": _order_items_payload(order),
        "payout": format_currency(order.rider_payout_amount),
        "pharmacy": order.pharmacy_name or "GONEP Pharmacy",
        "pickup_address": order.pickup_address or "Pickup address pending",
        "step": int(order.progress_step or 0),
        "started_at": format_time_label(order.started_at or order.placed_at),
        "distance": _distance_label(order),
        "eta": _eta_label(order),
    }


def build_rider_trip_payload(order):
    duration_minutes = 0
    if order.started_at and order.delivered_at:
        duration_minutes = max(
            int((order.delivered_at - order.started_at).total_seconds() // 60),
            1,
        )
    elif order.estimated_minutes:
        duration_minutes = order.estimated_minutes

    return {
        "id": str(order.id),
        "reference": order.order_number,
        "patient": order.patient.full_name,
        "address": order.delivery_address or order.patient.address or "Address pending",
        "date": format_datetime_label(order.delivered_at or order.placed_at),
        "distance": _distance_label(order),
        "duration": f"{duration_minutes} min" if duration_minutes else "TBD",
        "payout": format_currency(order.rider_payout_amount),
        "rating": order.patient_rating or 5,
        "status": "completed",
    }


def build_rider_notification_payload(notification):
    return {
        "id": str(notification.id),
        "code": notification.notification_code,
        "title": notification.title,
        "msg": notification.message,
        "time": format_relative_time(notification.created_at),
        "icon": notification.icon_name,
        "lib": notification.icon_lib,
        "color": notification.color,
        "read": notification.read,
    }


def build_rider_message_payload(message):
    return {
        "id": str(message.id),
        "code": message.message_code,
        "from": message.sender_role,
        "name": message.sender_name,
        "text": message.message,
        "time": format_time_label(message.sent_at),
    }


def build_rider_settings_payload(preferences):
    return {
        "push_notifications": preferences.push_notifications,
        "sound_alerts": preferences.sound_alerts,
        "location_share": preferences.location_share,
        "auto_accept": preferences.auto_accept,
    }


def build_rider_dashboard_payload(link, facility):
    rider = link.rider
    pending_requests = PatientMedicationOrder.objects.filter(
        facility=facility,
        status=PatientPortalOrderStatus.PENDING,
        rider__isnull=True,
    ).exclude(
        rider_request_decisions__rider=rider,
        rider_request_decisions__decision="declined",
    )
    active_delivery = (
        rider.medication_orders.select_related("patient")
        .prefetch_related("items")
        .filter(facility=facility, status=PatientPortalOrderStatus.IN_TRANSIT)
        .order_by("-started_at", "-placed_at")
        .first()
    )
    earnings = build_rider_earnings_payload(rider, facility)
    return {
        "rider": build_rider_payload(link, facility),
        "pending_requests": pending_requests.count(),
        "active_delivery": build_active_delivery_payload(active_delivery)
        if active_delivery
        else None,
        "earnings": earnings,
    }


def _get_or_create_preferences(rider, facility):
    preferences, _ = RiderPreference.objects.get_or_create(rider=rider, facility=facility)
    return preferences


def _create_rider_notification(
    rider,
    facility,
    title,
    message,
    *,
    icon_lib="feather",
    icon_name="bell",
    color="primary",
    read=False,
):
    return RiderPortalNotification.objects.create(
        notification_code=_next_code(
            RiderPortalNotification, "notification_code", "rn-", 4
        ),
        rider=rider,
        facility=facility,
        title=title,
        message=message,
        icon_lib=icon_lib,
        icon_name=icon_name,
        color=color,
        read=read,
    )


def _get_rider_order_or_raise(rider, facility, order_number):
    return _lookup_by_id_or_code(
        rider.medication_orders.select_related("patient")
        .prefetch_related("items")
        .filter(facility=facility),
        order_number,
        "order_number",
        "Delivery not found.",
    )


def _serialize_vehicle_parts(vehicle_input, current_registration):
    value = str(vehicle_input or "").strip()
    if not value:
        return "", ""
    if " - " in value:
        vehicle_type, registration = value.split(" - ", 1)
        return vehicle_type.strip(), registration.strip()
    if " · " in value:
        vehicle_type, registration = value.split(" · ", 1)
        return vehicle_type.strip(), registration.strip()
    return value, current_registration


def build_rider_profile_update_payload(link, payload):
    user = link.user
    rider = link.rider

    email = str(payload.get("email", user.email)).strip().lower()
    if not email:
        raise ValidationError({"email": "Email is required."})
    duplicate = (
        user.__class__.objects.filter(email__iexact=email).exclude(pk=user.pk).exists()
    )
    if duplicate:
        raise ValidationError({"email": "Another account already uses that email."})

    first_name = str(payload.get("first_name", user.first_name)).strip()
    last_name = str(payload.get("last_name", user.last_name)).strip()
    if not first_name:
        raise ValidationError({"first_name": "First name is required."})
    if not last_name:
        raise ValidationError({"last_name": "Last name is required."})

    phone = str(payload.get("phone", rider.phone)).strip()
    if not phone:
        raise ValidationError({"phone": "Phone number is required."})

    vehicle_type, vehicle_registration = _serialize_vehicle_parts(
        payload.get(
            "vehicle",
            build_rider_payload(link).get("vehicle", ""),
        ),
        rider.vehicle_registration,
    )

    return {
        "user": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
        },
        "rider": {
            "full_name": f"{first_name} {last_name}".strip(),
            "phone": phone,
            "vehicle_type": vehicle_type,
            "vehicle_registration": vehicle_registration,
        },
    }


def build_rider_earnings_payload(rider, facility):
    delivered_orders = list(
        rider.medication_orders.filter(
            facility=facility, status=PatientPortalOrderStatus.DELIVERED
        ).order_by(
            "-delivered_at", "-placed_at"
        )
    )
    today = timezone.localdate()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    today_total = Decimal("0")
    week_total = Decimal("0")
    month_total = Decimal("0")
    daily_totals = defaultdict(Decimal)

    for order in delivered_orders:
        delivered_on = timezone.localtime(
            order.delivered_at or order.placed_at
        ).date()
        payout = order.rider_payout_amount or Decimal("0")
        if delivered_on == today:
            today_total += payout
        if delivered_on >= week_start:
            week_total += payout
            daily_totals[delivered_on] += payout
        if delivered_on >= month_start:
            month_total += payout

    latest_snapshot = rider.earnings_snapshots.filter(facility=facility).order_by(
        "-period_end", "-created_at"
    ).first()
    pending_payout = Decimal("0")
    if latest_snapshot and latest_snapshot.payout_state != "paid":
        pending_payout = latest_snapshot.net_amount or Decimal("0")

    daily = []
    for offset in range(7):
        day = week_start + timedelta(days=offset)
        daily.append(
            {
                "day": day.strftime("%a"),
                "amount": float(daily_totals.get(day, Decimal("0"))),
            }
        )

    return {
        "today": float(today_total),
        "this_week": float(week_total),
        "this_month": float(month_total),
        "pending_payout": float(pending_payout),
        "daily": daily,
    }


class RiderMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, access_rows = get_active_rider_context_or_raise(request)
        return Response(build_rider_payload(link, facility, access_rows))

    @transaction.atomic
    def patch(self, request):
        link, facility, access_rows = get_active_rider_context_or_raise(request)
        update_payload = build_rider_profile_update_payload(link, request.data or {})

        for field_name, value in update_payload["user"].items():
            setattr(link.user, field_name, value)
        link.user.save(update_fields=["first_name", "last_name", "email"])

        for field_name, value in update_payload["rider"].items():
            setattr(link.rider, field_name, value)
        link.rider.save(
            update_fields=["full_name", "phone", "vehicle_type", "vehicle_registration"]
        )

        return Response(build_rider_payload(link, facility, access_rows))


class RiderDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        return Response(build_rider_dashboard_payload(link, facility))


class RiderRequestsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        rider = link.rider
        orders = (
            PatientMedicationOrder.objects.select_related("patient")
            .prefetch_related("items")
            .filter(
                facility=facility,
                status=PatientPortalOrderStatus.PENDING,
                rider__isnull=True,
            )
            .exclude(
                rider_request_decisions__rider=rider,
                rider_request_decisions__decision="declined",
            )
            .order_by("-placed_at", "-created_at")
        )
        return Response([build_rider_request_payload(order) for order in orders])


class RiderRequestActionView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_number):
        link, facility, _ = get_active_rider_context_or_raise(request)
        rider = link.rider
        action = str(request.data.get("action", "")).strip().lower()
        if action not in {"accept", "decline"}:
            raise ValidationError({"action": "Action must be accept or decline."})

        order = _lookup_by_id_or_code(
            PatientMedicationOrder.objects.select_related("patient")
            .prefetch_related("items")
            .filter(facility=facility),
            order_number,
            "order_number",
            "Request not found.",
        )

        if order.status != PatientPortalOrderStatus.PENDING:
            raise ValidationError({"detail": "This request is no longer pending."})
        if order.rider_id and order.rider_id != rider.id:
            raise ValidationError({"detail": "This request has already been assigned."})

        decision, _ = RiderRequestDecision.objects.get_or_create(
            rider=rider,
            facility=facility,
            order=order,
            defaults={"decision": action},
        )

        if action == "decline":
            if decision.decision != "declined":
                decision.decision = "declined"
                decision.save(update_fields=["decision", "updated_at"])
            _create_rider_notification(
                rider,
                facility,
                "Request dismissed",
                f"{order.order_number} was removed from your queue.",
                icon_name="x-circle",
                color="danger",
            )
            return Response(
                {"id": str(order.id), "reference": order.order_number, "status": "declined"}
            )

        decision.decision = "accepted"
        decision.save(update_fields=["decision", "updated_at"])
        order.rider = rider
        order.status = PatientPortalOrderStatus.IN_TRANSIT
        if not order.started_at:
            order.started_at = timezone.now()
        order.progress_step = max(int(order.progress_step or 0), 0)
        if not order.eta_label and order.estimated_minutes:
            order.eta_label = f"~{order.estimated_minutes} min"
        order.save(
            update_fields=[
                "rider",
                "status",
                "started_at",
                "progress_step",
                "eta_label",
                "updated_at",
            ]
        )

        RiderHistoryEntry.objects.create(
            facility=facility,
            rider=rider,
            status="confirmed",
            title=f"Accepted {order.order_number}",
            details=f"Accepted delivery request for {order.patient.full_name}.",
            occurred_at=timezone.now(),
        )
        _create_rider_notification(
            rider,
            facility,
            "Delivery accepted",
            f"You accepted {order.order_number} for {order.patient.full_name}.",
            icon_lib="mc",
            icon_name="truck-fast",
            color="success",
        )
        return Response({"id": str(order.id), "reference": order.order_number, "status": "accepted"})


class RiderActiveDeliveryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        order = (
            link.rider.medication_orders.select_related("patient")
            .prefetch_related("items")
            .filter(facility=facility, status=PatientPortalOrderStatus.IN_TRANSIT)
            .order_by("-started_at", "-placed_at")
            .first()
        )
        if order is None:
            return Response(None)
        return Response(build_active_delivery_payload(order))


class RiderDeliveryProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_number):
        link, facility, _ = get_active_rider_context_or_raise(request)
        order = _get_rider_order_or_raise(link.rider, facility, order_number)
        next_step = request.data.get("step")
        if next_step is None:
            raise ValidationError({"step": "Step is required."})
        try:
            next_step = int(next_step)
        except (TypeError, ValueError) as exc:
            raise ValidationError({"step": "Step must be an integer."}) from exc
        if next_step < 0 or next_step > 3:
            raise ValidationError({"step": "Step must be between 0 and 3."})

        order.progress_step = next_step
        if not order.started_at:
            order.started_at = timezone.now()
        order.save(update_fields=["progress_step", "started_at", "updated_at"])
        return Response(build_active_delivery_payload(order))


class RiderCompleteDeliveryView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, order_number):
        link, facility, _ = get_active_rider_context_or_raise(request)
        rider = link.rider
        order = _get_rider_order_or_raise(rider, facility, order_number)

        order.status = PatientPortalOrderStatus.DELIVERED
        order.delivered_at = timezone.now()
        order.progress_step = 3
        order.eta_label = "Delivered"
        if order.patient_rating is None:
            order.patient_rating = 5
        order.save(
            update_fields=[
                "status",
                "delivered_at",
                "progress_step",
                "eta_label",
                "patient_rating",
                "updated_at",
            ]
        )

        rider.total_trips = rider.medication_orders.filter(
            facility=facility, status=PatientPortalOrderStatus.DELIVERED
        ).count()
        rider.save(update_fields=["total_trips", "updated_at"])

        RiderHistoryEntry.objects.create(
            facility=facility,
            rider=rider,
            status="confirmed",
            title=f"Completed {order.order_number}",
            details=f"Completed delivery for {order.patient.full_name}.",
            occurred_at=timezone.now(),
        )
        _create_rider_notification(
            rider,
            facility,
            "Delivery completed",
            f"{order.order_number} was marked delivered.",
            icon_name="check-circle",
            color="success",
        )
        return Response({"id": str(order.id), "reference": order.order_number, "status": "completed"})


class RiderEarningsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        return Response(build_rider_earnings_payload(link.rider, facility))


class RiderTripsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        trips = (
            link.rider.medication_orders.select_related("patient")
            .prefetch_related("items")
            .filter(facility=facility, status=PatientPortalOrderStatus.DELIVERED)
            .order_by("-delivered_at", "-placed_at")
        )
        return Response([build_rider_trip_payload(order) for order in trips])


class RiderNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        notifications = (
            link.rider.portal_notifications.filter(facility=facility).order_by("-created_at")
        )
        return Response(
            [build_rider_notification_payload(notification) for notification in notifications]
        )


class RiderNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, notification_code):
        link, facility, _ = get_active_rider_context_or_raise(request)
        notification = _lookup_by_id_or_code(
            link.rider.portal_notifications.filter(facility=facility),
            notification_code,
            "notification_code",
            "Notification not found.",
        )
        if not notification.read:
            notification.read = True
            notification.save(update_fields=["read", "updated_at"])
        return Response(build_rider_notification_payload(notification))


class RiderNotificationsReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        link.rider.portal_notifications.filter(facility=facility, read=False).update(
            read=True,
            updated_at=timezone.now(),
        )
        notifications = (
            link.rider.portal_notifications.filter(facility=facility).order_by("-created_at")
        )
        return Response(
            [build_rider_notification_payload(notification) for notification in notifications]
        )


class RiderMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_number):
        link, facility, _ = get_active_rider_context_or_raise(request)
        order = _get_rider_order_or_raise(link.rider, facility, order_number)
        messages = order.rider_chat_messages.filter(rider=link.rider).order_by("sent_at", "id")
        return Response([build_rider_message_payload(message) for message in messages])

    @transaction.atomic
    def post(self, request, order_number):
        link, facility, _ = get_active_rider_context_or_raise(request)
        order = _get_rider_order_or_raise(link.rider, facility, order_number)
        text = str(request.data.get("text", "")).strip()
        if not text:
            raise ValidationError({"text": "Message text is required."})
        message = RiderChatMessage.objects.create(
            message_code=_next_code(RiderChatMessage, "message_code", "rm-", 4),
            facility=facility,
            rider=link.rider,
            order=order,
            sender_role="rider",
            sender_name=request.user.first_name or link.rider.full_name,
            message=text,
            sent_at=timezone.now(),
        )
        return Response(build_rider_message_payload(message), status=201)


class RiderStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        link, facility, access_rows = get_active_rider_context_or_raise(request)
        status_value = str(request.data.get("status", "")).strip().lower()
        if status_value not in {"active", "offline"}:
            raise ValidationError({"status": "Status must be active or offline."})
        link.rider.is_online = status_value == "active"
        link.rider.save(update_fields=["is_online", "updated_at"])
        return Response(build_rider_payload(link, facility, access_rows))


class RiderSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        preferences = _get_or_create_preferences(link.rider, facility)
        return Response(build_rider_settings_payload(preferences))

    def patch(self, request):
        link, facility, _ = get_active_rider_context_or_raise(request)
        preferences = _get_or_create_preferences(link.rider, facility)
        field_names = [
            "push_notifications",
            "sound_alerts",
            "location_share",
            "auto_accept",
        ]
        for field_name in field_names:
            if field_name in request.data:
                setattr(preferences, field_name, bool(request.data.get(field_name)))
        preferences.save(update_fields=field_names + ["updated_at"])
        return Response(build_rider_settings_payload(preferences))
