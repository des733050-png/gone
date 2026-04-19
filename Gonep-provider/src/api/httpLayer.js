import { ENDPOINTS } from '../config/env';
import { createCsrfManager } from './transport/csrfManager';
import { createRequestClient } from './transport/requestClient';
import { clearStore } from './transport/sessionStore';

const ROLE_ALIASES = {
  facility_admin: 'hospital_admin',
};

function normalizeProviderUser(payload = {}) {
  return {
    ...payload,
    role: ROLE_ALIASES[payload.role] || payload.role,
  };
}

export function createHttpLayer({ tokenMode = false } = {}) {
  const csrfManager = createCsrfManager();
  const { apiFetch } = createRequestClient(csrfManager, { tokenMode });

  return {
    async loginProvider(payload = {}) {
      const res = await apiFetch(
        ENDPOINTS.authLogin,
        { method: 'POST', body: JSON.stringify(payload || {}) },
        { allowCsrfRetry: true }
      );
      if (!res?.authenticated) {
        throw new Error('Authentication failed. Check your email and password.');
      }
      if (res.csrfToken) csrfManager.setWebCsrfToken(res.csrfToken);
      const profile = await apiFetch(ENDPOINTS.providerMe);
      return normalizeProviderUser(profile);
    },

    async getCurrentUser() {
      try {
        const session = await apiFetch(ENDPOINTS.authSession);
        if (!session?.authenticated) return null;
        const profile = await apiFetch(ENDPOINTS.providerMe);
        return normalizeProviderUser(profile);
      } catch {
        return null;
      }
    },

    async submitFacilityApplication(payload = {}) {
      const body =
        typeof FormData !== 'undefined' && payload instanceof FormData
          ? payload
          : JSON.stringify(payload || {});
      return apiFetch(
        ENDPOINTS.authRegisterProviderFacility,
        { method: 'POST', body },
        { allowCsrfRetry: true }
      );
    },

    async updateCurrentUser(payload = {}) {
      const profile = await apiFetch(ENDPOINTS.providerMe, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      });
      return normalizeProviderUser(profile);
    },

    changePassword({ currentPassword, newPassword }) {
      return apiFetch(ENDPOINTS.providerChangePassword, {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
    },

    invitePatient(payload) {
      return apiFetch(ENDPOINTS.patientInvites, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      });
    },

    async logoutProvider() {
      try {
        await apiFetch(ENDPOINTS.authLogout, { method: 'POST' }, { allowCsrfRetry: true });
      } finally {
        clearStore();
        csrfManager.resetCsrfState();
      }
    },

    getAppointments: () => apiFetch(ENDPOINTS.appointments),
    createAppointment: (payload) =>
      apiFetch(ENDPOINTS.appointments, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    getPrescriptions: () => apiFetch(ENDPOINTS.prescriptions),
    dispatchPrescription: (id) => apiFetch(ENDPOINTS.prescriptionDispatch(id), { method: 'POST' }),
    getPatients: () => apiFetch(ENDPOINTS.patients),
    searchPatientsForBooking: (q) =>
      apiFetch(`${ENDPOINTS.patientsSearch}?q=${encodeURIComponent(q || '')}`),
    getLabResults: () => apiFetch(ENDPOINTS.labResults),
    getInventory: () => apiFetch(ENDPOINTS.inventory),
    getBilling: () => apiFetch(ENDPOINTS.billing),
    getNotifications: () => apiFetch(ENDPOINTS.notifications),
    getAvailability: () => apiFetch(ENDPOINTS.availability),
    getActivityLogs: () => apiFetch(ENDPOINTS.activityLogs),
    getAnalytics: () => apiFetch(ENDPOINTS.analytics),
    markBillingPaid: (id) => apiFetch(`${ENDPOINTS.billing}${id}/pay/`, { method: 'POST' }),
    markNotificationRead: (id) =>
      apiFetch(`${ENDPOINTS.notifications}${id}/read/`, { method: 'PATCH' }),
    markAllNotificationsRead: () =>
      apiFetch(`${ENDPOINTS.notifications}read-all/`, { method: 'POST' }),
    addStock: (payload) =>
      apiFetch(`${ENDPOINTS.inventory}${payload.id}/add-stock/`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    reduceStock: (payload) =>
      apiFetch(`${ENDPOINTS.inventory}${payload.id}/reduce-stock/`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    updateInventoryItem: (id, payload) =>
      apiFetch(`${ENDPOINTS.inventory}${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
    addInventoryItem: (payload) =>
      apiFetch(ENDPOINTS.inventory, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    deactivateInventoryItem: (id) =>
      apiFetch(`${ENDPOINTS.inventory}${id}/deactivate/`, { method: 'POST' }),
    toggleEcommerce: (id) =>
      apiFetch(`${ENDPOINTS.inventory}${id}/toggle-ecommerce/`, { method: 'POST' }),
    addAvailabilitySlot: (payload) =>
      apiFetch(ENDPOINTS.availability, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    removeAvailabilitySlot: (payload) =>
      apiFetch(ENDPOINTS.availability, {
        method: 'DELETE',
        body: JSON.stringify(payload || {}),
      }),
    toggleBlockDay: (payload) =>
      apiFetch(ENDPOINTS.availability, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
    updateStaff: (id, payload) =>
      apiFetch(`${ENDPOINTS.staff}${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
    addStaffMember: (payload) =>
      apiFetch(ENDPOINTS.staff, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    suspendStaff: (id) => apiFetch(`${ENDPOINTS.staff}${id}/suspend/`, { method: 'POST' }),
    reactivateStaff: (id) => apiFetch(`${ENDPOINTS.staff}${id}/reactivate/`, { method: 'POST' }),
    appendLog(entry) {
      (async () => {
        try {
          await apiFetch(ENDPOINTS.activityLogs, {
            method: 'POST',
            body: JSON.stringify(entry || {}),
          });
        } catch {
          /* fire-and-forget */
        }
      })();
    },
    getStaff: () => apiFetch(ENDPOINTS.staff),
    getConsultations: () => apiFetch(ENDPOINTS.consultations || ''),
    getPatientConsultations: (patientId) =>
      apiFetch(`${ENDPOINTS.consultations || ''}?patient_id=${patientId}`),
    addConsultation: (payload) =>
      apiFetch(ENDPOINTS.consultations || '', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    updateConsultation: (id, payload) =>
      apiFetch(`${ENDPOINTS.consultations || ''}${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
    cancelPrescription: (id) =>
      apiFetch(`${ENDPOINTS.prescriptions}${id}/cancel/`, { method: 'POST' }),
    getClinicalSettings: () => apiFetch(ENDPOINTS.clinicalSettings || ''),
    setClinicalSettings: (payload) =>
      apiFetch(ENDPOINTS.clinicalSettings || '', {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
    getSupportTickets: () => apiFetch(ENDPOINTS.supportTickets || ''),
    createSupportTicket: (payload) =>
      apiFetch(ENDPOINTS.supportTickets || '', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    updateSupportTicket: (id, payload) =>
      apiFetch(`${ENDPOINTS.supportTickets || ''}${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload || {}),
      }),
    getPosAccounts: () => apiFetch(ENDPOINTS.posAccounts || ''),
    getPosTransactions: (id) =>
      apiFetch(`${ENDPOINTS.posTransactions || ''}${id ? `?pos_id=${id}` : ''}`),
    createPosAccount: (payload) =>
      apiFetch(ENDPOINTS.posAccounts || '', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    savePosTransaction: (payload) =>
      apiFetch(ENDPOINTS.posTransactions || '', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
    resetPosPassword: (id, payload) =>
      apiFetch(`${ENDPOINTS.posAccounts || ''}${id}/reset-password/`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      }),
  };
}
