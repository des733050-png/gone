// ─── src/api/dev/index.js ────────────────────────────────────────────────────
// Development API layer — real HTTP calls to a local/dev backend.
// Used when EXPO_PUBLIC_API_MODE === 'development'.
// Reads BASE_URL from EXPO_PUBLIC_API_BASE_URL (defaults to localhost:8001).
// ─────────────────────────────────────────────────────────────────────────────

import { API_CONFIG, ENDPOINTS } from '../../config/env';

const { TIMEOUT_MS } = API_CONFIG;

async function http(url, options = {}) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...options,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    if (!res.ok) throw new Error(`[dev] HTTP ${res.status} — ${url}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err?.name === 'AbortError')
      throw new Error(`[dev] Timeout after ${TIMEOUT_MS}ms — ${url}`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const post  = (url, body = {}) => http(url, { method: 'POST',  body: JSON.stringify(body) });
const patch = (url, body = {}) => http(url, { method: 'PATCH', body: JSON.stringify(body) });
const del   = (url, body = {}) => http(url, { method: 'DELETE',body: JSON.stringify(body) });

export const getAppointments         = ()        => http(ENDPOINTS.appointments);
export const getPrescriptions        = ()        => http(ENDPOINTS.prescriptions);
export const dispatchPrescription    = (id)      => post(ENDPOINTS.prescriptionDispatch(id));
export const getPatients             = ()        => http(ENDPOINTS.patients);
export const getLabResults           = ()        => http(ENDPOINTS.labResults);
export const getInventory            = ()        => http(ENDPOINTS.inventory);
export const getBilling              = ()        => http(ENDPOINTS.billing);
export const getNotifications        = ()        => http(ENDPOINTS.notifications);
export const getAvailability         = ()        => http(ENDPOINTS.availability);
export const getActivityLogs         = ()        => http(ENDPOINTS.activityLogs);

export const markBillingPaid         = (id)      => post(`${ENDPOINTS.billing}${id}/pay/`);
export const markNotificationRead    = (id)      => patch(`${ENDPOINTS.notifications}${id}/read/`);
export const markAllNotificationsRead= ()        => post(`${ENDPOINTS.notifications}read-all/`);

export const addStock                = (p)       => post(`${ENDPOINTS.inventory}${p.id}/add-stock/`,    p);
export const reduceStock             = (p)       => post(`${ENDPOINTS.inventory}${p.id}/reduce-stock/`, p);
export const updateInventoryItem     = (id, p)   => patch(`${ENDPOINTS.inventory}${id}/`,               p);
export const addInventoryItem        = (p)       => post(ENDPOINTS.inventory,                            p);
export const deactivateInventoryItem = (id)      => post(`${ENDPOINTS.inventory}${id}/deactivate/`);
export const toggleEcommerce         = (id)      => post(`${ENDPOINTS.inventory}${id}/toggle-ecommerce/`);

export const addAvailabilitySlot     = (p)       => post(ENDPOINTS.availability,    p);
export const removeAvailabilitySlot  = (p)       => del(ENDPOINTS.availability,     p);
export const toggleBlockDay          = (p)       => patch(ENDPOINTS.availability,   p);

export const updateStaff             = (id, p)   => patch(`${ENDPOINTS.staff}${id}/`, p);
export const addStaffMember          = (p)       => post(ENDPOINTS.staff,              p);
export const suspendStaff            = (id)      => post(`${ENDPOINTS.staff}${id}/suspend/`);
export const reactivateStaff         = (id)      => post(`${ENDPOINTS.staff}${id}/reactivate/`);

// Logging is server-side in dev/prod — this is a no-op stub
export const appendLog = () => {};

// Staff (added)
export const getStaff = () => http(ENDPOINTS.staff);

// Consultations (added)
export const getConsultations        = ()        => http(ENDPOINTS.consultations || '');
export const getPatientConsultations = (pid)     => http(`${ENDPOINTS.consultations || ''}?patient_id=${pid}`);
export const addConsultation         = (p)       => post(ENDPOINTS.consultations || '', p);
export const updateConsultation      = (id, p)   => patch(`${ENDPOINTS.consultations || ''}${id}/`, p);
export const cancelPrescription      = (id)      => post(`${ENDPOINTS.prescriptions}${id}/cancel/`);

// Clinical settings
export const getClinicalSettings  = ()      => http(ENDPOINTS.clinicalSettings  || '');
export const setClinicalSettings  = (p)     => patch(ENDPOINTS.clinicalSettings || '', p);
// Support tickets
export const getSupportTickets    = ()      => http(ENDPOINTS.supportTickets    || '');
export const createSupportTicket  = (p)     => post(ENDPOINTS.supportTickets    || '', p);
export const updateSupportTicket  = (id, p) => patch(`${ENDPOINTS.supportTickets || ''}${id}/`, p);
// POS
export const getPosAccounts       = ()      => http(ENDPOINTS.posAccounts       || '');
export const getPosTransactions   = (id)    => http(`${ENDPOINTS.posTransactions|| ''}${id ? '?pos_id='+id : ''}`);
export const createPosAccount     = (p)     => post(ENDPOINTS.posAccounts       || '', p);
export const savePosTransaction   = (p)     => post(ENDPOINTS.posTransactions   || '', p);
export const resetPosPassword     = (id, p) => post(`${ENDPOINTS.posAccounts    || ''}${id}/reset-password/`, p);
