// config/env.js — Gonep Provider Portal
// ALL values here are PUBLIC. They are baked into the app bundle at build
// time. Never store secrets, tokens, or passwords here.

// ─── API config ───────────────────────────────────────────────────────────
export const API_CONFIG = Object.freeze({
  BASE_URL: (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
  TIMEOUT_MS: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS || '15000'),
  // Supported modes: 'mock' | 'development' | 'staging' | 'production'
  MODE: String(process.env.EXPO_PUBLIC_API_MODE || 'mock').trim().toLowerCase(),
});

// ─── Base path ────────────────────────────────────────────────────────────
const PROVIDER_BASE_PATH =
  process.env.EXPO_PUBLIC_PROVIDER_BASE_PATH || '/api/v1/provider';

// ─── App identity ─────────────────────────────────────────────────────────
export const APP_CONFIG = Object.freeze({
  APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'Gonep Provider',
  DEMO_EMAIL:
    API_CONFIG.MODE === 'mock'
      ? process.env.EXPO_PUBLIC_DEMO_EMAIL || 'provider@gonep.co.ke'
      : '',
  DEMO_PASSWORD:
    API_CONFIG.MODE === 'mock'
      ? process.env.EXPO_PUBLIC_DEMO_PASSWORD || 'password123'
      : '',
});

// ─── Endpoints ────────────────────────────────────────────────────────────
export const ENDPOINTS = Object.freeze({
  authCsrf:             `${API_CONFIG.BASE_URL}/api/v1/auth/csrf/`,
  authLogin:            `${API_CONFIG.BASE_URL}/api/v1/auth/login/`,
  authLogout:           `${API_CONFIG.BASE_URL}/api/v1/auth/logout/`,
  authSession:          `${API_CONFIG.BASE_URL}/api/v1/auth/session/`,
  authRegisterProviderFacility: `${API_CONFIG.BASE_URL}/api/v1/auth/register/provider-facility/`,
  authRegisterFacilityPending:  `${API_CONFIG.BASE_URL}/api/v1/auth/register/facility-pending/`,
  providerVerification:         `${API_CONFIG.BASE_URL}/api/v1/provider/verification/`,
  providerVerificationSubmit:   `${API_CONFIG.BASE_URL}/api/v1/provider/verification/submit/`,
  providerVerificationDocument: (docType) => `${API_CONFIG.BASE_URL}/api/v1/provider/verification/document/${docType}/`,
  providerOnboarding:           `${API_CONFIG.BASE_URL}/api/v1/provider/onboarding/`,
  authForgotPasswordRequest: `${API_CONFIG.BASE_URL}/api/v1/auth/forgot-password/request/`,
  authForgotPasswordVerify: `${API_CONFIG.BASE_URL}/api/v1/auth/forgot-password/verify/`,
  authMobileToken:      `${API_CONFIG.BASE_URL}/api/v1/auth/mobile-token/`,
  authFacilityContext:  `${API_CONFIG.BASE_URL}/api/v1/auth/facility-context/`,
  providerMe:           `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/me/`,
  providerChangePassword: `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/me/change-password/`,
  dashboard:            `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/dashboard/`,
  appointments:         `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/`,
  prescriptions:        `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/prescriptions/`,
  prescriptionDispatch: (id) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/prescriptions/${id}/dispatch/`,
  patients:             `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/emr/`,
  patientsSearch:       `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/patients/search/`,
  patientDetail:        (id) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/emr/${id}/`,
  labResults:           `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/lab/`,
  inventory:            `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/inventory/`,
  billing:              `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/billing/`,
  notifications:        `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/notifications/`,
  // New — wire backend paths when ready
  availability:         `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/availability/`,
  activityLogs:         `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/activity-logs/`,
  consultations:        `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/consultations/`,
  clinicalSettings:     `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/clinical-settings/`,
  supportTickets:       `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/support-tickets/`,
  posAccounts:          `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/pos-accounts/`,
  posTransactions:      `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/pos-transactions/`,
  analytics:            `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/analytics/`,
  staff:                `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/staff/`,
  staffResetPassword:   (id) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/staff/${id}/reset-password/`,
  facilitySpecialties:  `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/specialties/`,
  facilitySpecialtyDetail: (id) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/specialties/${id}/`,
  specializations:          `${API_CONFIG.BASE_URL}/api/v1/specializations/`,
  specializationRequests:   `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/specialization-requests/`,
  patientInvites:       `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/patient-invites/`,
  // Booking flow helpers
  bookingSpecialties:   `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/booking/specialties/`,
  bookingDoctors:       `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/booking/doctors/`,
  bookingPatients:      `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/booking/patients/`,
  bookingDoctorSlots:   (code) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/booking/doctors/${code}/slots/`,
  appointmentConfirm:    (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/confirm/`,
  appointmentReject:     (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/reject/`,
  appointmentReschedule: (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/reschedule/`,
  appointmentAssign:     (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/assign/`,
  appointmentStart:      (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/start/`,
  appointmentComplete:   (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/complete/`,
  appointmentMeetingRoom:(ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/meeting-room/`,
  appointmentDetail:     (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/`,
  appointmentRestore:    (ref) => `${API_CONFIG.BASE_URL}${PROVIDER_BASE_PATH}/appointments/${ref}/restore/`,
});

// ─── Mode flags ───────────────────────────────────────────────────────────
export const IS_MOCK    = API_CONFIG.MODE === 'mock';
export const IS_DEV     = API_CONFIG.MODE === 'development';
export const IS_STAGING = API_CONFIG.MODE === 'staging';
export const IS_PROD    = API_CONFIG.MODE === 'production';

