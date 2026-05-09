// FILE: src/config/env.js
// COMPLETE REPLACEMENT — add new patient booking endpoints to ENDPOINTS object.
// Everything else in this file stays identical to current version.

// ─── CRITICAL: direct dot notation only ──────────────────────────────────
const _mode     = process.env.EXPO_PUBLIC_API_MODE;
const _baseUrl  = process.env.EXPO_PUBLIC_API_BASE_URL;
const _basePath = process.env.EXPO_PUBLIC_PATIENT_BASE_PATH;
const _appName  = process.env.EXPO_PUBLIC_APP_NAME;
const _email    = process.env.EXPO_PUBLIC_DEMO_EMAIL;
const _password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
const _timeout  = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;

const normalizedBaseUrl = (_baseUrl || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const normalizedMode = String(_mode || 'mock').trim().toLowerCase();

export const API_CONFIG = Object.freeze({
  BASE_URL:   normalizedBaseUrl,
  TIMEOUT_MS: Number(_timeout || '15000'),
  MODE:       normalizedMode,
});

const PATIENT_BASE_PATH = _basePath || '/api/v1/patient';

export const APP_CONFIG = Object.freeze({
  APP_NAME: _appName || 'Gonep Patient Portal',
  DEMO_EMAIL:    API_CONFIG.MODE === 'mock' ? (_email    || 'patient@gonep.co.ke') : '',
  DEMO_PASSWORD: API_CONFIG.MODE === 'mock' ? (_password || 'password123')         : '',
});

export const ENDPOINTS = Object.freeze({
  // ── Auth ──────────────────────────────────────────────────────────────────
  authCsrf:             `${API_CONFIG.BASE_URL}/api/v1/auth/csrf/`,
  authLogin:            `${API_CONFIG.BASE_URL}/api/v1/auth/login/`,
  authMobileToken:      `${API_CONFIG.BASE_URL}/api/v1/auth/mobile-token/`,
  authLogout:           `${API_CONFIG.BASE_URL}/api/v1/auth/logout/`,
  authSession:          `${API_CONFIG.BASE_URL}/api/v1/auth/session/`,
  authRegisterPatient:  `${API_CONFIG.BASE_URL}/api/v1/auth/register/patient/`,
  authForgotPasswordRequest: `${API_CONFIG.BASE_URL}/api/v1/auth/forgot-password/request/`,
  authForgotPasswordVerify: `${API_CONFIG.BASE_URL}/api/v1/auth/forgot-password/verify/`,

  // ── Patient profile ───────────────────────────────────────────────────────
  currentUser:          `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/me/`,
  patientSettings:      `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/settings/`,

  // ── Booking ───────────────────────────────────────────────────────────────
  appointments:         `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/`,
  appointmentCreate:    `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/create/`,
  appointmentDetail:    (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/${id}/`,
  appointmentUpdate:    (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/${id}/`,
  appointmentMeetingRoom:  (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/${id}/meeting-room/`,
  appointmentReschedule:   (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/${id}/reschedule/`,

  // ── Booking discovery (new) ───────────────────────────────────────────────
  patientSpecialties:   `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/specialties/`,
  patientDoctors:       `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/doctors/`,
  patientDoctorSlots:   (providerCode) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/doctors/${providerCode}/slots/`,

  // ── Orders (routes exist in code but UI is disabled) ──────────────────────
  orders:               `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/orders/`,
  orderDetail:          (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/orders/${id}/`,
  orderReorder:         (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/orders/${id}/reorder/`,

  // ── Records ───────────────────────────────────────────────────────────────
  records:              `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/records/`,
  recordDetail:         (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/records/${id}/`,
  recordsCurrentUser:   `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/records/me/`,

  // ── Vitals (NI — route in code, UI disabled) ──────────────────────────────
  vitals:               `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/vitals/`,

  // ── Chat (NI — route in code, UI disabled) ────────────────────────────────
  chatThread:           `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/chat/thread/`,

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications:        `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/notifications/`,
  notificationsReadAll: `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/notifications/read-all/`,

  // ── Support ───────────────────────────────────────────────────────────────
  supportTickets:       `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/support-tickets/`,
  supportTicketDetail:  (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/support-tickets/${id}/`,

  // ── Events stream ─────────────────────────────────────────────────────────
  patientEventsStream:  `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/events/stream/`,
});

export const IS_MOCK    = API_CONFIG.MODE === 'mock';
export const IS_DEV     = API_CONFIG.MODE === 'development';
export const IS_STAGING = API_CONFIG.MODE === 'staging';
export const IS_PROD    = API_CONFIG.MODE === 'production';