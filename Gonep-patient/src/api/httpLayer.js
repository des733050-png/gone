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
    async loginPatient(payload) {
      if (isNative()) {
        const res = await apiFetch(
          ENDPOINTS.authMobileToken,
          { method: 'POST', body: JSON.stringify(payload || {}) },
          { allowCsrfRetry: false }
        );
        if (!res?.authenticated || !res?.token) {
          throw new Error('Authentication failed. Check your email and password.');
        }
        getStore().authToken = res.token;
        return res.user;
      }
      const res = await apiFetch(
        ENDPOINTS.authLogin,
        { method: 'POST', body: JSON.stringify(payload || {}) },
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
        if (isNative() && getStore().authToken) return apiFetch(ENDPOINTS.currentUser);
        const session = await apiFetch(ENDPOINTS.authSession);
        if (!session?.authenticated) return null;
        return apiFetch(ENDPOINTS.currentUser);
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

    async getAppointments(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;
        params.append(key, value);
      });
      const url = params.toString() ? `${ENDPOINTS.appointments}?${params.toString()}` : ENDPOINTS.appointments;
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

    async getOrders() {
      return apiFetch(ENDPOINTS.orders);
    },

    async getOrderById(id) {
      return apiFetch(ENDPOINTS.orderDetail(id));
    },

    async reorderOrder(id) {
      return apiFetch(ENDPOINTS.orderReorder(id), { method: 'POST' });
    },

    async getRecords() {
      return apiFetch(ENDPOINTS.records);
    },

    async getRecordById(id) {
      return apiFetch(ENDPOINTS.recordDetail(id));
    },

    async getVitals() {
      return apiFetch(ENDPOINTS.vitals);
    },

    async getChatThread() {
      return apiFetch(ENDPOINTS.chatThread);
    },

    async getNotifications() {
      return apiFetch(ENDPOINTS.notifications);
    },

    async markNotificationRead(id) {
      return apiFetch(`${ENDPOINTS.notifications}${id}/read/`, { method: 'PATCH' });
    },

    async markAllNotificationsRead() {
      return apiFetch(ENDPOINTS.notificationsReadAll, { method: 'POST' });
    },

    async getSupportTickets() {
      return apiFetch(ENDPOINTS.supportTickets);
    },

    async createSupportTicket(payload) {
      return apiFetch(ENDPOINTS.supportTickets, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },

    subscribePatientEvents({ cursor, onEvent, onError } = {}) {
      if (typeof EventSource === 'undefined') return () => {};
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
      source.addEventListener('notification', handleMessage('notification'));
      source.addEventListener('appointment', handleMessage('appointment'));
      source.onerror = (error) => {
        onError?.(error);
        source.close();
      };
      return () => source.close();
    },
  };
}
