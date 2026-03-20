// src/api/index.js — Gonep Patient Portal
// Mode-aware data layer.
//   MODE=mock                           → returns data from src/mock/data.js (no network)
//   MODE=development|staging|production → real fetch() calls to ENDPOINTS
//
// ⚠️  SWITCHING MODES: edit .env, then FULLY RESTART Metro (Ctrl+C → expo start).
//     Changing .env while the server is running has NO effect — Metro inlines
//     EXPO_PUBLIC_* values once at startup and never re-reads them.
//
// All function names match what screens and hooks already import. No changes needed there.

import { API_CONFIG, ENDPOINTS } from '../config/env';

// ─── Mock data (only used when MODE=mock) ─────────────────────────────────
import {
  MOCK_USER,
  MOCK_APPOINTMENTS,
  MOCK_ORDERS,
  MOCK_RECORDS,
  MOCK_NOTIFICATIONS,
} from '../mock/data';

const isMock = API_CONFIG.MODE === 'mock';

// ─── Startup mode banner ──────────────────────────────────────────────────
// Prints once when the module loads so you can confirm which mode is active
// in Metro logs / browser console. Never silent about which data source is used.
if (typeof __DEV__ !== "undefined" && __DEV__) {
  const modeLabel = {
    mock:        '🟡 MOCK       — data from src/mock/data.js, no network calls',
    development: '🟠 DEVELOPMENT — real HTTP calls to ' + API_CONFIG.BASE_URL,
    staging:     '🔵 STAGING    — real HTTP calls to ' + API_CONFIG.BASE_URL,
    production:  '🟢 PRODUCTION  — real HTTP calls to ' + API_CONFIG.BASE_URL,
  }[API_CONFIG.MODE] || '⚪ UNKNOWN MODE: ' + API_CONFIG.MODE;
  console.log('[Gonep API] Active mode:', modeLabel);
}

// ─── Guard: catch unknown MODE values immediately ─────────────────────────
const VALID_MODES = ['mock', 'development', 'staging', 'production'];
if (!VALID_MODES.includes(API_CONFIG.MODE)) {
  throw new Error(
    `[Gonep API] Invalid MODE "${API_CONFIG.MODE}". ` +
    `Valid values: ${VALID_MODES.join(', ')}. ` +
    `Check EXPO_PUBLIC_API_MODE in .env and restart Metro.`
  );
}

// ─── Internal fetch helper ────────────────────────────────────────────────
// Not exported. Every real HTTP call goes through this.
// Respects TIMEOUT_MS via AbortController. Throws a clear error on non-2xx.
async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`[Gonep API] HTTP ${res.status} — ${url}`);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`[Gonep API] Request timed out after ${API_CONFIG.TIMEOUT_MS}ms — ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ─── Exported API functions ───────────────────────────────────────────────

export async function getCurrentUser() {
  if (isMock) { await delay(); return MOCK_USER; }
  return apiFetch(ENDPOINTS.currentUser);
}

export async function getAppointments(filters = {}) {
  if (isMock) {
    await delay();
    const { status } = filters;
    let items = [...MOCK_APPOINTMENTS];
    if (status) items = items.filter((a) => a.status === status);
    return items;
  }
  return apiFetch(ENDPOINTS.appointments);
}

export async function getAppointmentById(id) {
  if (isMock) {
    await delay();
    return MOCK_APPOINTMENTS.find((a) => a.id === id) || null;
  }
  return apiFetch(ENDPOINTS.appointmentDetail(id));
}

export async function updateAppointment(id, patch) {
  if (isMock) {
    await delay();
    const idx = MOCK_APPOINTMENTS.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...patch };
    return MOCK_APPOINTMENTS[idx];
  }
  return apiFetch(ENDPOINTS.appointmentUpdate(id), {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function getOrders() {
  if (isMock) { await delay(); return [...MOCK_ORDERS]; }
  return apiFetch(ENDPOINTS.orders);
}

export async function getOrderById(id) {
  if (isMock) {
    await delay();
    return MOCK_ORDERS.find((o) => o.id === id) || null;
  }
  return apiFetch(ENDPOINTS.orderReorder(id).replace('/reorder/', '/'));
}

export async function reorderOrder(id) {
  if (isMock) {
    await delay();
    const original = MOCK_ORDERS.find((o) => o.id === id);
    if (!original) return null;
    const copy = {
      ...original,
      id: `${id}-R${Math.floor(Math.random() * 90 + 10)}`,
      status: 'in_transit',
      eta: '~15 mins',
      placedAt: 'Just now',
    };
    MOCK_ORDERS.unshift(copy);
    return copy;
  }
  return apiFetch(ENDPOINTS.orderReorder(id), { method: 'POST' });
}

export async function getRecords() {
  if (isMock) { await delay(); return [...MOCK_RECORDS]; }
  return apiFetch(ENDPOINTS.records);
}

export async function getNotifications() {
  if (isMock) { await delay(); return [...MOCK_NOTIFICATIONS]; }
  return apiFetch(ENDPOINTS.notifications);
}

export async function markNotificationRead(id) {
  if (isMock) {
    await delay();
    const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === id);
    if (idx === -1) return null;
    MOCK_NOTIFICATIONS[idx] = { ...MOCK_NOTIFICATIONS[idx], read: true };
    return MOCK_NOTIFICATIONS[idx];
  }
  return apiFetch(`${ENDPOINTS.notifications}${id}/read/`, { method: 'PATCH' });
}
