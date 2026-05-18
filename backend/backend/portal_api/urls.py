# FILE: backend/portal_api/urls.py
# COMPLETE FILE — all original routes + new patient booking routes merged in.

from django.urls import path

from portal_api.patient_booking_views import (
    PatientAppointmentRescheduleView,
    PatientBookingCreateView,
    PatientDoctorSlotsView,
    PatientDoctorsView,
    PatientMeetingRoomView,
    PatientSpecialtiesView,
)
from portal_api.patient_views import (
    PatientAppointmentDetailView,
    PatientAppointmentsView,
    PatientEventStreamView,
    PatientMeView,
    PatientNotificationReadView,
    PatientNotificationsReadAllView,
    PatientNotificationsView,
    PatientOrderDetailView,
    PatientOrderReorderView,
    PatientOrdersView,
    PatientRecordDetailView,
    PatientRecordsView,
    PatientSettingsView,
    PatientSupportTicketDetailView,
    PatientSupportTicketsView,
)
from portal_api.appointment_mgmt_views import (
    ProviderAppointmentAssignView,
    ProviderAppointmentCompleteView,
    ProviderAppointmentConfirmView,
    ProviderAppointmentMeetingRoomView,
    ProviderAppointmentRejectView,
    ProviderAppointmentRescheduleView,
    ProviderAppointmentStartView,
    ProviderBookingDoctorSlotsView,
    ProviderBookingDoctorsView,
    ProviderBookingPatientSearchView,
    ProviderBookingSpecialtiesView,
)
from portal_api.provider_views import (
    ProviderActivityLogView,
    ProviderAppointmentRestoreView,
    ProviderOnboardingStateView,
    ProviderVerificationDocumentDeleteView,
    ProviderVerificationStatusView,
    ProviderVerificationSubmitView,
    SpecializationListView,
    SpecializationRequestView,
    ProviderAnalyticsView,
    ProviderAppointmentDetailView,
    ProviderAppointmentsView,
    ProviderAvailabilityView,
    ProviderBillingPayView,
    ProviderBillingView,
    ProviderChangePasswordView,
    ProviderClinicalSettingsView,
    ProviderConsultationDetailView,
    ProviderConsultationsView,
    ProviderInventoryAddStockView,
    ProviderInventoryDeactivateView,
    ProviderInventoryDetailView,
    ProviderInventoryReduceStockView,
    ProviderInventoryToggleEcommerceView,
    ProviderInventoryView,
    ProviderLabResultAcknowledgeView,
    ProviderLabResultsView,
    ProviderMeView,
    ProviderNotificationReadAllView,
    ProviderNotificationReadView,
    ProviderNotificationsView,
    ProviderPatientInviteView,
    ProviderPatientSearchView,
    ProviderPatientsView,
    ProviderPosAccountResetPasswordView,
    ProviderPosAccountsView,
    ProviderPosTransactionsView,
    ProviderPrescriptionCancelView,
    ProviderPrescriptionDispatchView,
    ProviderPrescriptionsView,
    ProviderFacilitySpecialtiesView,
    ProviderFacilitySpecialtyDetailView,
    ProviderStaffDetailView,
    ProviderStaffReactivateView,
    ProviderStaffResetPasswordView,
    ProviderStaffSuspendView,
    ProviderStaffView,
    ProviderSupportTicketDetailView,
    ProviderSupportTicketsView,
)
from portal_api.rider_views import (
    RiderActiveDeliveryView,
    RiderCompleteDeliveryView,
    RiderDashboardView,
    RiderDeliveryProgressView,
    RiderEarningsView,
    RiderMeView,
    RiderMessagesView,
    RiderNotificationReadView,
    RiderNotificationsReadAllView,
    RiderNotificationsView,
    RiderRequestActionView,
    RiderRequestsView,
    RiderSettingsView,
    RiderStatusView,
    RiderTripsView,
)
from portal_api.views import (
    csrf_cookie_view,
    forgot_password_request_view,
    forgot_password_verify_view,
    login_view,
    logout_view,
    mobile_token_login_view,
    register_facility_pending_view,
    register_patient_view,
    register_provider_facility_view,
    session_view,
    switch_facility_context_view,
)


urlpatterns = [

    # ── Shared auth ──────────────────────────────────────────────────────────
    path("auth/csrf/",              csrf_cookie_view,               name="auth-csrf"),
    path("auth/login/",             login_view,                     name="auth-login"),
    path("auth/mobile-token/",      mobile_token_login_view,        name="auth-mobile-token"),
    path("auth/logout/",            logout_view,                    name="auth-logout"),
    path("auth/session/",           session_view,                   name="auth-session"),
    path("auth/facility-context/",  switch_facility_context_view,   name="auth-facility-context"),
    path("auth/register/patient/",  register_patient_view,          name="auth-register-patient"),
    path(
        "auth/register/provider-facility/",
        register_provider_facility_view,
        name="auth-register-provider-facility",
    ),
    # 2-step onboarding: hospital details + admin account, no docs upfront.
    # Admin then signs in and submits documents via the verification endpoint.
    path(
        "auth/register/facility-pending/",
        register_facility_pending_view,
        name="auth-register-facility-pending",
    ),
    path(
        "auth/forgot-password/request/",
        forgot_password_request_view,
        name="auth-forgot-password-request",
    ),
    path(
        "auth/forgot-password/verify/",
        forgot_password_verify_view,
        name="auth-forgot-password-verify",
    ),

    # ── Patient — profile & settings ─────────────────────────────────────────
    path("patient/me/",       PatientMeView.as_view(),       name="patient-me"),
    path("patient/settings/", PatientSettingsView.as_view(), name="patient-settings"),

    # ── Patient — booking discovery (new) ────────────────────────────────────
    path(
        "patient/specialties/",
        PatientSpecialtiesView.as_view(),
        name="patient-specialties",
    ),
    path(
        "patient/doctors/",
        PatientDoctorsView.as_view(),
        name="patient-doctors",
    ),
    path(
        "patient/doctors/<str:provider_code>/slots/",
        PatientDoctorSlotsView.as_view(),
        name="patient-doctor-slots",
    ),

    # ── Patient — appointments ───────────────────────────────────────────────
    # GET list of existing bookings
    path(
        "patient/appointments/",
        PatientAppointmentsView.as_view(),
        name="patient-appointments",
    ),
    # POST new booking (patient-initiated)
    path(
        "patient/appointments/create/",
        PatientBookingCreateView.as_view(),
        name="patient-appointment-create",
    ),
    # GET / PATCH single booking
    path(
        "patient/appointments/<str:booking_ref>/",
        PatientAppointmentDetailView.as_view(),
        name="patient-appointment-detail",
    ),
    # GET Daily.co meeting room URL for virtual appointments
    path(
        "patient/appointments/<str:booking_ref>/meeting-room/",
        PatientMeetingRoomView.as_view(),
        name="patient-meeting-room",
    ),
    # PATCH patient reschedule
    path(
        "patient/appointments/<str:booking_ref>/reschedule/",
        PatientAppointmentRescheduleView.as_view(),
        name="patient-appointment-reschedule",
    ),

    # ── Patient — orders ──────────────────────────────────────────────────────
    path("patient/orders/",                          PatientOrdersView.as_view(),   name="patient-orders"),
    path("patient/orders/<str:order_number>/",       PatientOrderDetailView.as_view(), name="patient-order-detail"),
    path("patient/orders/<str:order_number>/reorder/", PatientOrderReorderView.as_view(), name="patient-order-reorder"),

    # ── Patient — records ─────────────────────────────────────────────────────
    path("patient/records/",              PatientRecordsView.as_view(),      name="patient-records"),
    path("patient/records/<str:record_id>/", PatientRecordDetailView.as_view(), name="patient-record-detail"),

    # ── Patient — support tickets ─────────────────────────────────────────────
    path("patient/support-tickets/",                    PatientSupportTicketsView.as_view(),      name="patient-support-tickets"),
    path("patient/support-tickets/<str:ticket_number>/", PatientSupportTicketDetailView.as_view(), name="patient-support-ticket-detail"),

    # ── Patient — notifications ───────────────────────────────────────────────
    path("patient/notifications/",                             PatientNotificationsView.as_view(),      name="patient-notifications"),
    path("patient/notifications/<str:notification_code>/read/", PatientNotificationReadView.as_view(),   name="patient-notification-read"),
    path("patient/notifications/read-all/",                    PatientNotificationsReadAllView.as_view(), name="patient-notification-read-all"),

    # ── Patient — SSE event stream ────────────────────────────────────────────
    path("patient/events/stream/", PatientEventStreamView.as_view(), name="patient-events-stream"),

    # ── Provider — profile & auth ─────────────────────────────────────────────
    path("provider/me/",                 ProviderMeView.as_view(),             name="provider-me"),
    path("provider/me/change-password/", ProviderChangePasswordView.as_view(), name="provider-change-password"),
    path("provider/patient-invites/",    ProviderPatientInviteView.as_view(),  name="provider-patient-invites"),

    # ── Provider — appointments ───────────────────────────────────────────────
    path("provider/appointments/",                  ProviderAppointmentsView.as_view(),      name="provider-appointments"),
    path("provider/appointments/<str:appointment_ref>/", ProviderAppointmentDetailView.as_view(), name="provider-appointment-detail"),
    path("provider/appointments/<str:appointment_ref>/confirm/",    ProviderAppointmentConfirmView.as_view(),    name="provider-appointment-confirm"),
    path("provider/appointments/<str:appointment_ref>/reject/",     ProviderAppointmentRejectView.as_view(),     name="provider-appointment-reject"),
    path("provider/appointments/<str:appointment_ref>/reschedule/", ProviderAppointmentRescheduleView.as_view(), name="provider-appointment-reschedule"),
    path("provider/appointments/<str:appointment_ref>/assign/",     ProviderAppointmentAssignView.as_view(),     name="provider-appointment-assign"),
    path("provider/appointments/<str:appointment_ref>/start/",      ProviderAppointmentStartView.as_view(),      name="provider-appointment-start"),
    path("provider/appointments/<str:appointment_ref>/complete/",   ProviderAppointmentCompleteView.as_view(),   name="provider-appointment-complete"),
    path("provider/appointments/<str:appointment_ref>/meeting-room/", ProviderAppointmentMeetingRoomView.as_view(), name="provider-appointment-meeting-room"),
    path("provider/appointments/<str:appointment_ref>/restore/",      ProviderAppointmentRestoreView.as_view(),     name="provider-appointment-restore"),

    # ── Provider — booking helpers (specialties / doctors / patients / slots) ─
    path("provider/booking/specialties/",                                  ProviderBookingSpecialtiesView.as_view(),   name="provider-booking-specialties"),
    path("provider/booking/doctors/",                                       ProviderBookingDoctorsView.as_view(),       name="provider-booking-doctors"),
    path("provider/booking/patients/",                                      ProviderBookingPatientSearchView.as_view(), name="provider-booking-patients"),
    path("provider/booking/doctors/<str:provider_code>/slots/",             ProviderBookingDoctorSlotsView.as_view(),   name="provider-booking-doctor-slots"),

    # ── Provider — patient search & EMR ──────────────────────────────────────
    path("provider/patients/search/", ProviderPatientSearchView.as_view(), name="provider-patient-search"),
    path("provider/emr/",             ProviderPatientsView.as_view(),      name="provider-patients"),

    # ── Provider — lab ────────────────────────────────────────────────────────
    path("provider/lab/",                          ProviderLabResultsView.as_view(),          name="provider-lab"),
    path("provider/lab/<str:lab_ref>/acknowledge/", ProviderLabResultAcknowledgeView.as_view(), name="provider-lab-acknowledge"),

    # ── Provider — prescriptions ──────────────────────────────────────────────
    path("provider/prescriptions/",                      ProviderPrescriptionsView.as_view(),       name="provider-prescriptions"),
    path("provider/prescriptions/<str:task_ref>/dispatch/", ProviderPrescriptionDispatchView.as_view(), name="provider-prescription-dispatch"),
    path("provider/prescriptions/<str:task_ref>/cancel/",   ProviderPrescriptionCancelView.as_view(),   name="provider-prescription-cancel"),

    # ── Provider — inventory ──────────────────────────────────────────────────
    path("provider/inventory/",                              ProviderInventoryView.as_view(),              name="provider-inventory"),
    path("provider/inventory/<str:item_code>/",              ProviderInventoryDetailView.as_view(),        name="provider-inventory-detail"),
    path("provider/inventory/<str:item_code>/add-stock/",    ProviderInventoryAddStockView.as_view(),      name="provider-inventory-add-stock"),
    path("provider/inventory/<str:item_code>/reduce-stock/", ProviderInventoryReduceStockView.as_view(),   name="provider-inventory-reduce-stock"),
    path("provider/inventory/<str:item_code>/deactivate/",   ProviderInventoryDeactivateView.as_view(),    name="provider-inventory-deactivate"),
    path("provider/inventory/<str:item_code>/toggle-ecommerce/", ProviderInventoryToggleEcommerceView.as_view(), name="provider-inventory-toggle-ecommerce"),

    # ── Provider — billing ────────────────────────────────────────────────────
    path("provider/billing/",                     ProviderBillingView.as_view(),    name="provider-billing"),
    path("provider/billing/<str:billing_code>/pay/", ProviderBillingPayView.as_view(), name="provider-billing-pay"),

    # ── Provider — notifications ──────────────────────────────────────────────
    path("provider/notifications/",                             ProviderNotificationsView.as_view(),      name="provider-notifications"),
    path("provider/notifications/read-all/",                    ProviderNotificationReadAllView.as_view(), name="provider-notification-read-all"),
    path("provider/notifications/<str:notification_code>/read/", ProviderNotificationReadView.as_view(),   name="provider-notification-read"),

    # ── Provider — availability ───────────────────────────────────────────────
    path("provider/availability/", ProviderAvailabilityView.as_view(), name="provider-availability"),

    # ── Provider — activity logs ──────────────────────────────────────────────
    path("provider/activity-logs/", ProviderActivityLogView.as_view(), name="provider-activity-logs"),

    # Onboarding flag — controls the post-verification "Getting started" overlay
    path("provider/onboarding/",    ProviderOnboardingStateView.as_view(), name="provider-onboarding"),

    # Verification — facility admin reads status + uploads documents.
    path("provider/verification/",        ProviderVerificationStatusView.as_view(), name="provider-verification"),
    path("provider/verification/submit/", ProviderVerificationSubmitView.as_view(), name="provider-verification-submit"),
    path("provider/verification/document/<str:doc_type>/", ProviderVerificationDocumentDeleteView.as_view(), name="provider-verification-doc-delete"),

    # ── Provider — staff ──────────────────────────────────────────────────────
    path("provider/staff/",                         ProviderStaffView.as_view(),         name="provider-staff"),
    path("provider/staff/<str:staff_id>/",           ProviderStaffDetailView.as_view(),   name="provider-staff-detail"),
    path("provider/staff/<str:staff_id>/suspend/",        ProviderStaffSuspendView.as_view(),       name="provider-staff-suspend"),
    path("provider/staff/<str:staff_id>/reactivate/",     ProviderStaffReactivateView.as_view(),    name="provider-staff-reactivate"),
    path("provider/staff/<str:staff_id>/reset-password/", ProviderStaffResetPasswordView.as_view(), name="provider-staff-reset-password"),

    # Master specialization catalogue (public — patients + providers use it)
    path("specializations/", SpecializationListView.as_view(), name="specializations"),

    # Facility admin: request a new specialization be added to the catalogue
    path(
        "provider/specialization-requests/",
        SpecializationRequestView.as_view(),
        name="provider-specialization-requests",
    ),

    path("provider/specialties/", ProviderFacilitySpecialtiesView.as_view(), name="provider-specialties"),
    path(
        "provider/specialties/<str:specialty_id>/",
        ProviderFacilitySpecialtyDetailView.as_view(),
        name="provider-specialty-detail",
    ),

    # ── Provider — consultations ──────────────────────────────────────────────
    path("provider/consultations/",                      ProviderConsultationsView.as_view(),      name="provider-consultations"),
    path("provider/consultations/<str:consultation_ref>/", ProviderConsultationDetailView.as_view(), name="provider-consultation-detail"),

    # ── Provider — clinical settings ──────────────────────────────────────────
    path("provider/clinical-settings/", ProviderClinicalSettingsView.as_view(), name="provider-clinical-settings"),

    # ── Provider — support tickets ────────────────────────────────────────────
    path("provider/support-tickets/",                  ProviderSupportTicketsView.as_view(),      name="provider-support-tickets"),
    path("provider/support-tickets/<str:ticket_code>/", ProviderSupportTicketDetailView.as_view(), name="provider-support-ticket-detail"),

    # ── Provider — POS ────────────────────────────────────────────────────────
    path("provider/pos-accounts/",                               ProviderPosAccountsView.as_view(),         name="provider-pos-accounts"),
    path("provider/pos-accounts/<str:staff_id>/reset-password/", ProviderPosAccountResetPasswordView.as_view(), name="provider-pos-reset-password"),
    path("provider/pos-transactions/",                           ProviderPosTransactionsView.as_view(),     name="provider-pos-transactions"),

    # ── Provider — analytics ──────────────────────────────────────────────────
    path("provider/analytics/", ProviderAnalyticsView.as_view(), name="provider-analytics"),

    # ── Rider — dashboard & profile ───────────────────────────────────────────
    path("rider/dashboard/", RiderDashboardView.as_view(), name="rider-dashboard"),
    path("rider/me/",        RiderMeView.as_view(),        name="rider-me"),

    # ── Rider — requests & deliveries ─────────────────────────────────────────
    path("rider/requests/",                                RiderRequestsView.as_view(),       name="rider-requests"),
    path("rider/requests/<str:order_number>/action/",      RiderRequestActionView.as_view(),  name="rider-request-action"),
    path("rider/active/",                                  RiderActiveDeliveryView.as_view(), name="rider-active"),
    path("rider/deliveries/<str:order_number>/progress/",  RiderDeliveryProgressView.as_view(), name="rider-delivery-progress"),
    path("rider/deliveries/<str:order_number>/complete/",  RiderCompleteDeliveryView.as_view(), name="rider-delivery-complete"),

    # ── Rider — earnings & trips ──────────────────────────────────────────────
    path("rider/earnings/", RiderEarningsView.as_view(), name="rider-earnings"),
    path("rider/trips/",    RiderTripsView.as_view(),    name="rider-trips"),

    # ── Rider — notifications ─────────────────────────────────────────────────
    path("rider/notifications/",                             RiderNotificationsView.as_view(),      name="rider-notifications"),
    path("rider/notifications/<str:notification_code>/read/", RiderNotificationReadView.as_view(),   name="rider-notification-read"),
    path("rider/notifications/read-all/",                    RiderNotificationsReadAllView.as_view(), name="rider-notifications-read-all"),

    # ── Rider — messages, status, settings ───────────────────────────────────
    path("rider/messages/<str:order_number>/", RiderMessagesView.as_view(), name="rider-messages"),
    path("rider/status/",                      RiderStatusView.as_view(),   name="rider-status"),
    path("rider/settings/",                    RiderSettingsView.as_view(), name="rider-settings"),
]