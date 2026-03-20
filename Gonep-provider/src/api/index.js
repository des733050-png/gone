// src/api/index.js — Gonep Provider API layer
//
// In `mock` mode, delegates to `src/mock/api.js`.
// In non-mock modes, performs real HTTP calls to `ENDPOINTS` (best-effort).
//
// NOTE: This app assumes PUBLIC env var inlining via EXPO_PUBLIC_* at build time.

import { API_CONFIG, ENDPOINTS } from '../config/env';
import {
  fetchAppointments,
  fetchPrescriptions,
  dispatchPrescription as mockDispatchPrescription,
  fetchPatients,
  fetchLabResults,
  fetchInventory,
  fetchBilling,
  fetchNotifications,
} from '../mock/api';

const isMock = API_CONFIG.MODE === 'mock';

// Shared fetch helper with a simple timeout.
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
    if (!res.ok) throw new Error(`[Gonep-provider API] HTTP ${res.status} — ${url}`);
    // Some endpoints may not return JSON; handle defensively.
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`[Gonep-provider API] Request timed out after ${API_CONFIG.TIMEOUT_MS}ms — ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getAppointments() {
  return isMock ? fetchAppointments() : apiFetch(ENDPOINTS.appointments);
}

export async function getPrescriptions() {
  return isMock ? fetchPrescriptions() : apiFetch(ENDPOINTS.prescriptions);
}

export async function dispatchPrescription(id) {
  return isMock
    ? mockDispatchPrescription(id)
    : apiFetch(ENDPOINTS.prescriptionDispatch(id), {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
}

export async function getPatients() {
  return isMock ? fetchPatients() : apiFetch(ENDPOINTS.patients);
}

export async function getLabResults() {
  return isMock ? fetchLabResults() : apiFetch(ENDPOINTS.labResults);
}

export async function getInventory() {
  return isMock ? fetchInventory() : apiFetch(ENDPOINTS.inventory);
}

export async function getBilling() {
  return isMock ? fetchBilling() : apiFetch(ENDPOINTS.billing);
}

export async function getNotifications() {
  return isMock ? fetchNotifications() : apiFetch(ENDPOINTS.notifications);
}

