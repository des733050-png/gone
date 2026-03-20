// src/api/index.js — Gonep Rider API layer
//
// In `mock` mode, delegates to `src/mock/api.js`.
// In non-mock modes, provides best-effort HTTP calls using `ENDPOINTS`.

import { API_CONFIG, ENDPOINTS } from '../config/env';
import {
  fetchCurrentRider,
  fetchRequests,
  fetchActiveDelivery,
  acceptRequest as mockAcceptRequest,
  declineRequest as mockDeclineRequest,
  completeDelivery as mockCompleteDelivery,
  fetchEarnings,
  fetchTrips,
  fetchNotifications,
  fetchMessages,
  updateRiderStatus as mockUpdateRiderStatus,
} from '../mock/api';

const isMock = API_CONFIG.MODE === 'mock';

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
    if (!res.ok) throw new Error(`[Gonep-rider API] HTTP ${res.status} — ${url}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`[Gonep-rider API] Request timed out after ${API_CONFIG.TIMEOUT_MS}ms — ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function getCurrentRider() {
  return isMock ? fetchCurrentRider() : apiFetch(ENDPOINTS.riderStatus);
}

export async function getRequests() {
  return isMock ? fetchRequests() : apiFetch(ENDPOINTS.requests);
}

export async function acceptRequest(id) {
  return isMock
    ? mockAcceptRequest(id)
    : apiFetch(ENDPOINTS.requestAction(id), { method: 'POST', body: JSON.stringify({ action: 'accept' }) });
}

export async function declineRequest(id) {
  return isMock
    ? mockDeclineRequest(id)
    : apiFetch(ENDPOINTS.requestAction(id), { method: 'POST', body: JSON.stringify({ action: 'decline' }) });
}

export async function completeDelivery(id) {
  return isMock
    ? mockCompleteDelivery(id)
    : apiFetch(ENDPOINTS.completeDelivery(id), { method: 'POST', body: JSON.stringify({ id }) });
}

export async function getEarnings() {
  return isMock ? fetchEarnings() : apiFetch(ENDPOINTS.earnings);
}

export async function getTrips() {
  return isMock ? fetchTrips() : apiFetch(ENDPOINTS.trips);
}

export async function getNotifications() {
  return isMock ? fetchNotifications() : apiFetch(ENDPOINTS.notifications);
}

export async function updateRiderStatus(status) {
  return isMock ? mockUpdateRiderStatus(status) : apiFetch(ENDPOINTS.riderStatus, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// Not currently imported by screens, but useful for completeness.
export async function getMessages(orderId) {
  return isMock ? fetchMessages(orderId) : apiFetch(ENDPOINTS.messages(orderId));
}

// Not currently imported by screens; kept for future parity.
export async function getActiveDelivery() {
  return isMock ? fetchActiveDelivery() : apiFetch(ENDPOINTS.activeDelivery);
}

