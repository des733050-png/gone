// Frontend configuration for the GONEP Rider portal.
// ALL values are PUBLIC — baked into the app bundle at build time.

// ─── Direct env reads (static dot notation for build-time inlining) ───
const _mode = process.env.EXPO_PUBLIC_API_MODE;
const _baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const _basePath = process.env.EXPO_PUBLIC_RIDER_BASE_PATH;
const _appName = process.env.EXPO_PUBLIC_APP_NAME;
const _email = process.env.EXPO_PUBLIC_DEMO_EMAIL;
const _password = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
const _timeout = process.env.EXPO_PUBLIC_API_TIMEOUT_MS;

// ─── API config ───────────────────────────────────────────────────────────
export const API_CONFIG = Object.freeze({
  BASE_URL: _baseUrl || 'http://localhost:8001',
  TIMEOUT_MS: Number(_timeout || '15000'),
  // Supported: 'mock' | 'development' | 'staging' | 'production'
  MODE: _mode || 'mock',
});

// Base path for all rider APIs – controlled via env so backend mount point
// changes do not require code edits.
const RIDER_BASE_PATH = _basePath || '/api/v1/rider';

// ─── App identity ─────────────────────────────────────────────────────────
export const APP_CONFIG = Object.freeze({
  APP_NAME: _appName || 'GONEP RIDER PORTAL',
  // Demo credentials only exist in mock mode.
  DEMO_EMAIL: API_CONFIG.MODE === 'mock' ? _email || 'rider@gonep.co.ke' : '',
  DEMO_PASSWORD:
    API_CONFIG.MODE === 'mock' ? _password || 'password123' : '',
});

// ─── Endpoints ────────────────────────────────────────────────────────────
export const ENDPOINTS = Object.freeze({
  dashboard: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/dashboard/`,
  requests: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/requests/`,
  requestAction: (id) =>
    `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/requests/${id}/action/`,
  activeDelivery: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/active/`,
  completeDelivery: (id) =>
    `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/deliveries/${id}/complete/`,
  earnings: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/earnings/`,
  trips: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/trips/`,
  notifications: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/notifications/`,
  messages: (orderId) =>
    `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/messages/${orderId}/`,
  riderStatus: `${API_CONFIG.BASE_URL}${RIDER_BASE_PATH}/status/`,
});

// ─── Mode flags ───────────────────────────────────────────────────────────
export const IS_MOCK = API_CONFIG.MODE === 'mock';
export const IS_DEV = API_CONFIG.MODE === 'development';
export const IS_STAGING = API_CONFIG.MODE === 'staging';
export const IS_PROD = API_CONFIG.MODE === 'production';
