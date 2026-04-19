// src/config/env.js — Gonep Patient Portal
// ALL values are PUBLIC — baked into the app bundle at build time.
// Never store secrets, tokens, or real passwords here.
//
// HOW TO CHANGE ENVIRONMENTS:
//   npm run start           → mock (default)
//   npm run start:dev       → development
//   npm run start:staging   → staging
//   npm run start:prod      → production

// ─── CRITICAL: direct dot notation only ──────────────────────────────────
// Babel replaces process.env.EXPO_PUBLIC_* with literal values at build time.
// It only works with STATIC dot notation — never bracket notation.
// process.env?.[key] is NEVER replaced and always returns undefined on device.
// Each var must be read explicitly as written below.

const _mode     = process.env.EXPO_PUBLIC_API_MODE;
const _baseUrl  = process.env.EXPO_PUBLIC_API_BASE_URL;
const _basePath = process.env.EXPO_PUBLIC_PATIENT_BASE_PATH;
const _appName  = process.env.EXPO_PUBLIC_APP_NAME;
const _email    = process.env.EXPO_PUBLIC_DEMO_EMAIL;
const _password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
const _timeout  = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;

// ─── API config ───────────────────────────────────────────────────────────
const normalizedBaseUrl = (_baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
const normalizedMode = String(_mode || 'mock').trim().toLowerCase();

export const API_CONFIG = Object.freeze({
  BASE_URL:   normalizedBaseUrl,
  TIMEOUT_MS: Number(_timeout || '15000'),
  // Supported: 'mock' | 'development' | 'staging' | 'production'
  // Fallback 'mock' means the app works on a fresh clone with no .env
  MODE:       normalizedMode,
});

// ─── Base path ────────────────────────────────────────────────────────────
const PATIENT_BASE_PATH = _basePath || '/api/v1/patient';

// ─── App identity ─────────────────────────────────────────────────────────
export const APP_CONFIG = Object.freeze({
  APP_NAME: _appName || 'Gonep Patient Portal',
  // Demo credentials only exist in mock mode.
  // In all other modes they are empty strings — enforced in code, not convention.
  DEMO_EMAIL:    API_CONFIG.MODE === 'mock' ? (_email    || 'patient@gonep.co.ke') : '',
  DEMO_PASSWORD: API_CONFIG.MODE === 'mock' ? (_password || 'password123')         : '',
});

// ─── Endpoints ────────────────────────────────────────────────────────────
// Strings for fixed endpoints. Arrow functions for endpoints needing an ID.
// Add new endpoints here only — never hardcode URLs in screens or hooks.
export const ENDPOINTS = Object.freeze({
  authCsrf:           `${API_CONFIG.BASE_URL}/api/v1/auth/csrf/`,
  authLogin:          `${API_CONFIG.BASE_URL}/api/v1/auth/login/`,
  authMobileToken:    `${API_CONFIG.BASE_URL}/api/v1/auth/mobile-token/`,
  authLogout:         `${API_CONFIG.BASE_URL}/api/v1/auth/logout/`,
  authSession:        `${API_CONFIG.BASE_URL}/api/v1/auth/session/`,
  authRegisterPatient:`${API_CONFIG.BASE_URL}/api/v1/auth/register/patient/`,
  currentUser:        `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/me/`,
  patientSettings:    `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/settings/`,
  appointments:       `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/`,
  appointmentDetail:  (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/${id}/`,
  appointmentUpdate:  (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/appointments/${id}/`,
  orders:             `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/orders/`,
  orderDetail:        (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/orders/${id}/`,
  orderReorder:       (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/orders/${id}/reorder/`,
  records:            `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/records/`,
  recordDetail:       (id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/records/${id}/`,
  recordsCurrentUser: `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/records/me/`,
  vitals:             `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/vitals/`,
  chatThread:         `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/chat/thread/`,
  notifications:      `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/notifications/`,
  notificationsReadAll:`${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/notifications/read-all/`,
  supportTickets:     `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/support-tickets/`,
  supportTicketDetail:(id) => `${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/support-tickets/${id}/`,
  patientEventsStream:`${API_CONFIG.BASE_URL}${PATIENT_BASE_PATH}/events/stream/`,
});

// ─── Mode flags ───────────────────────────────────────────────────────────
export const IS_MOCK    = API_CONFIG.MODE === 'mock';
export const IS_DEV     = API_CONFIG.MODE === 'development';
export const IS_STAGING = API_CONFIG.MODE === 'staging';
export const IS_PROD    = API_CONFIG.MODE === 'production';
