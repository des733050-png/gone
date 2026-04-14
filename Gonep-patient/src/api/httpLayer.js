import { API_CONFIG, ENDPOINTS } from '../config/env';

function toErrorMessage(err, fallback) {
  return err instanceof Error ? err.message : fallback;
}

export function createHttpLayer({ requireHttps = false } = {}) {
  if (requireHttps && API_CONFIG.BASE_URL.startsWith('http://')) {
    throw new Error('[Gonep API] Refusing insecure HTTP base URL in production mode.');
  }

  async function apiFetch(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        throw new Error(`[Gonep API] HTTP ${response.status} — ${url}`);
      }

      return response.json();
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new Error(`[Gonep API] Request timed out after ${API_CONFIG.TIMEOUT_MS}ms.`);
      }
      throw new Error(toErrorMessage(err, 'Request failed.'));
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async loginPatient() {
      return apiFetch(ENDPOINTS.currentUser);
    },
    async registerPatient() {
      return apiFetch(ENDPOINTS.currentUser);
    },
    async getCurrentUser() {
      return apiFetch(ENDPOINTS.currentUser);
    },
    async getAppointments() {
      return apiFetch(ENDPOINTS.appointments);
    },
    async getAppointmentById(id) {
      return apiFetch(ENDPOINTS.appointmentDetail(id));
    },
    async updateAppointment(id, patch) {
      return apiFetch(ENDPOINTS.appointmentUpdate(id), {
        method: 'PATCH',
        body: JSON.stringify(patch),
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
  };
}
