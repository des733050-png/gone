// FILE: src/api/httpLayer.js
// COMPLETE REPLACEMENT
// Adds: getSpecialties, getDoctors, getDoctorSlots, createAppointment, getMeetingRoom

import { API_CONFIG, ENDPOINTS } from '../config/env';
import { createCsrfManager } from './transport/csrfManager';
import { createRequestClient } from './transport/requestClient';
import { clearStore, getStore, isNative } from './transport/sessionStore';

export function createHttpLayer({ requireHttps = false } = {}) {
  if (requireHttps && API_CONFIG.BASE_URL.startsWith('http://')) {
    throw new Error('[Gonep API] Refusing insecure HTTP base URL in production mode.');
  }

  const csrfManager = createCsrfManager();
  const { apiFetch } = createRequestClient(csrfManager);

  return {
    // ── Auth ────────────────────────────────────────────────────────────────
    async loginPatient(payload) {
      if (isNative()) {
        const body = JSON.stringify({ portal: 'patient', ...(payload || {}) });
        const res = await apiFetch(
          ENDPOINTS.authMobileToken,
          { method: 'POST', body },
          { allowCsrfRetry: false }
        );
        if (!res?.authenticated || !res?.token) {
          throw new Error('Authentication failed. Check your email and password.');
        }
        getStore().authToken = res.token;
        return res.user;
      }
      const body = JSON.stringify({ portal: 'patient', ...(payload || {}) });
      const res = await apiFetch(
        ENDPOINTS.authLogin,
        { method: 'POST', body },
        { allowCsrfRetry: true }
      );
      if (!res?.authenticated) throw new Error('Authentication failed. Check your email and password.');
      if (res.csrfToken) csrfManager.setWebCsrfToken(res.csrfToken);
      return res.user;
    },

    async registerPatient(payload) {
      const res = await apiFetch(ENDPOINTS.authRegisterPatient, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
      if (res?.csrfToken) {
        if (isNative()) getStore().csrfToken = res.csrfToken;
        else csrfManager.setWebCsrfToken(res.csrfToken);
      }
      return res?.user || res;
    },

    async getCurrentUser() {
      try {
        if (isNative() && getStore().authToken) {
          // Native: token-based — /me/ is the only source of truth
          try { return await apiFetch(ENDPOINTS.currentUser); } catch { return null; }
        }
        // Web: session-cookie flow — check session first
        const session = await apiFetch(ENDPOINTS.authSession);
        if (!session?.authenticated) return null;
        // Session is valid — try to enrich with full patient profile
        try {
          return await apiFetch(ENDPOINTS.currentUser);
        } catch {
          // /me/ returned 404 / 403 (patient profile not linked yet, or
          // transient backend error). The session IS still valid, so return
          // the minimal user from the session response so the app does NOT
          // force-logout the user on every hot-reload.
          return session.user || null;
        }
      } catch {
        return null;
      }
    },

    async updateCurrentUser(payload) {
      return apiFetch(ENDPOINTS.currentUser, { method: 'PATCH', body: JSON.stringify(payload || {}) });
    },

    async getSettings() {
      return apiFetch(ENDPOINTS.patientSettings);
    },

    async updateSettings(payload) {
      return apiFetch(ENDPOINTS.patientSettings, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      });
    },

    async logoutPatient() {
      try {
        if (!isNative()) await apiFetch(ENDPOINTS.authLogout, { method: 'POST' }, { allowCsrfRetry: true });
      } finally {
        clearStore();
        csrfManager.resetCsrfState();
      }
    },

    requestPasswordReset(payload = {}) {
      return apiFetch(ENDPOINTS.authForgotPasswordRequest, {
        method: 'POST',
        body: JSON.stringify({ portal: 'patient', ...(payload || {}) }),
      });
    },

    verifyPasswordReset(payload = {}) {
      return apiFetch(ENDPOINTS.authForgotPasswordVerify, {
        method: 'POST',
        body: JSON.stringify({ portal: 'patient', ...(payload || {}) }),
      });
    },

    // ── Booking discovery ───────────────────────────────────────────────────
    async getSpecialties() {
      return apiFetch(ENDPOINTS.patientSpecialties);
    },

    async getDoctors(specialty = '') {
      const url = specialty
        ? `${ENDPOINTS.patientDoctors}?specialty=${encodeURIComponent(specialty)}`
        : ENDPOINTS.patientDoctors;
      return apiFetch(url);
    },

    async getDoctorSlots(providerCode, appointmentType = '') {
      const url = appointmentType
        ? `${ENDPOINTS.patientDoctorSlots(providerCode)}?type=${encodeURIComponent(appointmentType)}`
        : ENDPOINTS.patientDoctorSlots(providerCode);
      return apiFetch(url);
    },

    // ── Appointments ────────────────────────────────────────────────────────
    async getAppointments(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.append(key, value);
      });
      const url = params.toString()
        ? `${ENDPOINTS.appointments}?${params.toString()}`
        : ENDPOINTS.appointments;
      return apiFetch(url);
    },

    async getAppointmentById(id) {
      return apiFetch(ENDPOINTS.appointmentDetail(id));
    },

    async updateAppointment(id, patch) {
      return apiFetch(ENDPOINTS.appointmentUpdate(id), {
        method: 'PATCH',
        body: JSON.stringify(patch || {}),
      });
    },

    async createAppointment(payload) {
      const p = payload || {};
      const slotDatetime = p.slot_datetime || p.scheduled_for;
      const body = {
        provider_code: p.provider_code,
        slot_datetime: slotDatetime,
        service_type: p.service_type || 'Consultation',
        service_type_detail: p.appointment_type || p.service_type_detail || 'In Facility',
        notes: p.notes ?? p.reason ?? '',
      };
      return apiFetch(ENDPOINTS.appointmentCreate, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },

    async getMeetingRoom(bookingRef) {
      return apiFetch(ENDPOINTS.appointmentMeetingRoom(bookingRef));
    },

    async rescheduleAppointment(bookingRef, slotDatetime, appointmentType) {
      const body = { slot_datetime: slotDatetime };
      if (appointmentType) body.appointment_type = appointmentType;
      return apiFetch(ENDPOINTS.appointmentReschedule(bookingRef), {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
    },

    // ── Orders (code retained, UI disabled) ─────────────────────────────────
    async getOrders() {
      return apiFetch(ENDPOINTS.orders);
    },

    async getOrderById(id) {
      return apiFetch(ENDPOINTS.orderDetail(id));
    },

    async reorderOrder(id) {
      return apiFetch(ENDPOINTS.orderReorder(id), { method: 'POST' });
    },

    // ── Records ─────────────────────────────────────────────────────────────
    async getRecords() {
      return apiFetch(ENDPOINTS.records);
    },

    async getRecordById(id) {
      return apiFetch(ENDPOINTS.recordDetail(id));
    },

    // ── Vitals (NI — code retained) ─────────────────────────────────────────
    async getVitals() {
      return apiFetch(ENDPOINTS.vitals);
    },

    // ── Chat (NI — code retained) ────────────────────────────────────────────
    async getChatThread() {
      return apiFetch(ENDPOINTS.chatThread);
    },

    // ── Notifications ────────────────────────────────────────────────────────
    async getNotifications() {
      return apiFetch(ENDPOINTS.notifications);
    },

    async markNotificationRead(id) {
      return apiFetch(`${ENDPOINTS.notifications}${id}/read/`, { method: 'PATCH' });
    },

    async markAllNotificationsRead() {
      return apiFetch(ENDPOINTS.notificationsReadAll, { method: 'POST' });
    },

    // ── Support ──────────────────────────────────────────────────────────────
    async getSupportTickets() {
      return apiFetch(ENDPOINTS.supportTickets);
    },

    async createSupportTicket(payload) {
      return apiFetch(ENDPOINTS.supportTickets, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },

    // ── SSE stream ───────────────────────────────────────────────────────────
    subscribePatientEvents({ cursor, onEvent, onError, onOpen } = {}) {
      if (typeof EventSource === 'undefined') return () => {};
      try {
        const streamUrl = new URL(ENDPOINTS.patientEventsStream);
        if (cursor) streamUrl.searchParams.set('cursor', cursor);
        const source = new EventSource(streamUrl.toString(), { withCredentials: true });
        const handleMessage = (type) => (evt) => {
          try {
            onEvent?.({ type, payload: JSON.parse(evt.data || '{}') });
          } catch (error) {
            onError?.(error);
          }
        };
        source.onopen = () => {
          onOpen?.();
        };
        source.addEventListener('notification', handleMessage('notification'));
        source.addEventListener('appointment', handleMessage('appointment'));
        source.onerror = (error) => {
          onError?.(error);
          source.close();
        };
        return () => source.close();
      } catch {
        return () => {};
      }
    },
  };
}