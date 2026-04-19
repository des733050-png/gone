import {
  MOCK_DELAY_MS,
  MOCK_APPOINTMENTS, MOCK_PRESCRIPTIONS, MOCK_PATIENTS,
  MOCK_LAB, MOCK_INVENTORY, MOCK_BILLING, MOCK_NOTIFICATIONS,
  MOCK_AVAILABILITY, MOCK_ACTIVITY_LOGS, MOCK_CONSULTATIONS,
} from './data';
import { parseExistingDateTime } from '../utils/bookingAvailability';

const delay = (ms = MOCK_DELAY_MS) => new Promise(r => setTimeout(r, ms));

// In-memory mutable state so screens can mutate and re-fetch within a session.
// Each call returns a fresh copy so mutations don't bleed between callers.
let _appointments   = MOCK_APPOINTMENTS.map(x => ({ ...x }));
let _prescriptions  = MOCK_PRESCRIPTIONS.map(x => ({ ...x }));
let _patients       = MOCK_PATIENTS.map(x => ({ ...x }));
let _lab            = MOCK_LAB.map(x => ({ ...x }));
let _inventory      = MOCK_INVENTORY.map(x => ({ ...x, history: [...(x.history || [])] }));
let _billing        = MOCK_BILLING.map(x => ({ ...x }));
let _notifications  = MOCK_NOTIFICATIONS.map(x => ({ ...x }));
let _availability   = JSON.parse(JSON.stringify(MOCK_AVAILABILITY));
let _logs           = MOCK_ACTIVITY_LOGS.map(x => ({ ...x }));
let _consultations  = null; // lazy init — see getConsultations()

// ─── Helpers ─────────────────────────────────────────────────────────────────
const nowTs = () => {
  const now = new Date();
  return `Today ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
};

export function appendLog(entry) {
  _logs.unshift({
    id: `log-${Date.now()}`,
    ts: nowTs(),
    occurred_at: new Date().toISOString(),
    ...entry,
  });
}

export const submitFacilityApplication = async (payload = {}) => {
  await delay(500);
  const isFormData =
    typeof FormData !== 'undefined' && payload instanceof FormData;
  const getValue = (key) => {
    if (!isFormData) return payload?.[key] || '';
    const value = payload.get(key);
    return typeof value === 'string' ? value : '';
  };
  return {
    application_id: `fac-app-${Date.now()}`,
    facility_code: `FAC-${Math.floor(Math.random() * 9000 + 1000)}`,
    status: 'under_review',
    detail: 'Application submitted successfully. Await super admin approval.',
    hospital: {
      name: getValue('name'),
      email: getValue('email'),
      registration_no: getValue('registration_no'),
    },
    admin_contact: {
      name: getValue('admin_name'),
      email: getValue('admin_email'),
    },
    submitted_documents: {},
  };
};

// ─── Fetch functions ──────────────────────────────────────────────────────────
function withScheduledFor(row) {
  if (row.scheduled_for) return { ...row };
  const dt = parseExistingDateTime(row);
  return dt ? { ...row, scheduled_for: dt.toISOString() } : { ...row };
}

export const fetchAppointments = async () => {
  await delay();
  return _appointments.map((x) => withScheduledFor({ ...x }));
};
export const fetchPrescriptions  = async () => { await delay(); return _prescriptions.map(x => ({ ...x })); };
export const fetchPatients       = async () => { await delay(); return _patients.map(x => ({ ...x })); };

/** Mirrors GET provider/patients/search/?q= — minimal { id, name, phone } rows */
export const searchPatientsForBooking = async (q = '') => {
  await delay(200);
  const ql = String(q || '').trim().toLowerCase();
  if (ql.length < 2) return { results: [] };
  const results = _patients
    .filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const id = String(p?.id || '').toLowerCase();
      const phone = String(p?.phone || '').toLowerCase();
      return name.includes(ql) || id.includes(ql) || phone.includes(ql);
    })
    .slice(0, 25)
    .map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
    }));
  return { results };
};
export const fetchLabResults     = async () => { await delay(); return _lab.map(x => ({ ...x })); };
export const fetchInventory      = async () => { await delay(); return _inventory.map(x => ({ ...x, history: [...x.history] })); };
export const fetchBilling        = async () => { await delay(); return _billing.map(x => ({ ...x })); };
export const fetchNotifications  = async () => { await delay(); return _notifications.map(x => ({ ...x })); };
export const fetchAvailability   = async () => { await delay(); return JSON.parse(JSON.stringify(_availability)); };
export const fetchActivityLogs   = async () => { await delay(); return _logs.map(x => ({ ...x })); };

export const createAppointment = async (payload = {}) => {
  await delay(500);
  const when = payload?.scheduled_for ? new Date(payload.scheduled_for) : new Date();
  const time = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const isToday = when.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = when.toDateString() === tomorrow.toDateString();
  const date = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : when.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const created = {
    id: `apt-${Date.now()}`,
    patient: payload?.patient_name || 'Patient',
    patient_id: payload?.patient_id || null,
    doctor_id: payload?.doctor_id || null,
    age: payload?.patient_age || null,
    type: payload?.appointment_type || 'In Facility',
    time,
    date,
    status: 'confirmed',
    reason: payload?.visit_reason || '',
    phone: payload?.patient_phone || '',
    scheduled_for: when.toISOString(),
    duration_minutes: Number(payload?.duration_minutes) || 30,
  };
  _appointments = [created, ..._appointments];
  return { ...created };
};

// ─── Mutations ────────────────────────────────────────────────────────────────
export const dispatchPrescription = async (id) => {
  await delay(300);
  _prescriptions = _prescriptions.map(p => p.id === id ? { ...p, status: 'dispatched' } : p);
  return _prescriptions.find(p => p.id === id);
};

export const markBillingPaid = async (id) => {
  await delay(300);
  _billing = _billing.map(b => b.id === id ? { ...b, status: 'paid' } : b);
  return _billing.find(b => b.id === id);
};

export const markNotificationRead = async (id) => {
  await delay(100);
  _notifications = _notifications.map(n => n.id === id ? { ...n, read: true } : n);
};

export const markAllNotificationsRead = async () => {
  await delay(100);
  _notifications = _notifications.map(n => ({ ...n, read: true }));
};

// Inventory mutations
export const addStock = async ({ id, qty, reason, by }) => {
  await delay(300);
  _inventory = _inventory.map(item => {
    if (item.id !== id) return item;
    const newStock = item.stock + qty;
    const status = newStock <= 0 ? 'out' : newStock <= item.reorder ? 'low' : 'ok';
    const histEntry = { date: nowTs(), action: reason || 'Stock received', qty_change: qty, by };
    return { ...item, stock: newStock, status, history: [histEntry, ...item.history] };
  });
  return _inventory.find(i => i.id === id);
};

export const reduceStock = async ({ id, qty, reason, by }) => {
  await delay(300);
  _inventory = _inventory.map(item => {
    if (item.id !== id) return item;
    const newStock = Math.max(0, item.stock - qty);
    const status = newStock <= 0 ? 'out' : newStock <= item.reorder ? 'low' : 'ok';
    const histEntry = { date: nowTs(), action: reason || 'Stock reduced', qty_change: -qty, by };
    return { ...item, stock: newStock, status, history: [histEntry, ...item.history] };
  });
  return _inventory.find(i => i.id === id);
};

export const updateInventoryItem = async (id, patch) => {
  await delay(300);
  _inventory = _inventory.map(item => item.id === id ? { ...item, ...patch } : item);
  return _inventory.find(i => i.id === id);
};

export const addInventoryItem = async (newItem) => {
  await delay(400);
  const item = { ...newItem, id: `inv-${Date.now()}`, status: newItem.stock <= 0 ? 'out' : newItem.stock <= newItem.reorder ? 'low' : 'ok', active: true, history: [{ date: nowTs(), action: 'Added to formulary', qty_change: newItem.stock, by: newItem.addedBy }] };
  _inventory.push(item);
  return item;
};

export const deactivateInventoryItem = async (id) => {
  await delay(300);
  _inventory = _inventory.map(item => item.id === id ? { ...item, active: false } : item);
};

export const toggleEcommerce = async (id) => {
  await delay(200);
  _inventory = _inventory.map(item => item.id === id ? { ...item, ecommerce: !item.ecommerce } : item);
  return _inventory.find(i => i.id === id);
};

// Availability mutations
export const addAvailabilitySlot = async ({ doctorId, slot }) => {
  await delay(300);
  if (!_availability[doctorId]) return null;
  const newSlot = { ...slot, id: `sl-${Date.now()}` };
  _availability[doctorId].slots.push(newSlot);
  return newSlot;
};

export const removeAvailabilitySlot = async ({ doctorId, slotId }) => {
  await delay(200);
  if (!_availability[doctorId]) return;
  _availability[doctorId].slots = _availability[doctorId].slots.filter(s => s.id !== slotId);
};

export const toggleBlockDay = async ({ doctorId, day }) => {
  await delay(200);
  if (!_availability[doctorId]) return;
  const blocked = _availability[doctorId].blocked_days;
  if (blocked.includes(day)) {
    _availability[doctorId].blocked_days = blocked.filter(d => d !== day);
  } else {
    _availability[doctorId].blocked_days.push(day);
    _availability[doctorId].slots = _availability[doctorId].slots.filter(s => s.day !== day);
  }
};

// Legacy named exports used by existing api/index.js
export const mockApi = {
  getDashboard:    async () => { await delay(); return {}; },
  getAppointments: fetchAppointments,
  getPrescriptions: fetchPrescriptions,
  getPatients:     fetchPatients,
  getLabResults:   fetchLabResults,
  getInventory:    fetchInventory,
  getBilling:      fetchBilling,
  getNotifications: fetchNotifications,
};

// ─── Staff mutations ──────────────────────────────────────────────────────────

// ─── Staff mutations ──────────────────────────────────────────────────────────
// _staff uses lazy init so it picks up MOCK_STAFF (which now includes admin)
let _staff = null;

function getStaff() {
  if (!_staff) {
    const { MOCK_STAFF } = require('./data');
    _staff = MOCK_STAFF.map(s => ({ ...s, suspended: false }));
  }
  return _staff;
}

export const fetchStaff = async () => {
  await delay();
  return getStaff().map(s => ({ ...s }));
};

export const updateStaff = async (id, patch) => {
  await delay(300);
  const staff = getStaff();
  const idx = staff.findIndex(s => s.id === id);
  if (idx !== -1) staff[idx] = { ...staff[idx], ...patch };
  return staff[idx] ? { ...staff[idx] } : null;
};

export const addStaffMember = async (newMember) => {
  await delay(400);
  const staff = getStaff();
  const member = { ...newMember, id: `usr-${Date.now()}`, suspended: false };
  staff.push(member);
  return {
    ...member,
    invitation: {
      temporary_password: `Stf${String(Date.now()).slice(-5)}Aa1`,
      login_url: 'http://127.0.0.1:8081',
    },
  };
};

export const suspendStaff = async (id) => {
  await delay(300);
  const staff = getStaff();
  const idx = staff.findIndex(s => s.id === id);
  if (idx !== -1) staff[idx] = { ...staff[idx], suspended: true };
  return staff[idx] ? { ...staff[idx] } : null;
};

export const reactivateStaff = async (id) => {
  await delay(300);
  const staff = getStaff();
  const idx = staff.findIndex(s => s.id === id);
  if (idx !== -1) staff[idx] = { ...staff[idx], suspended: false };
  return staff[idx] ? { ...staff[idx] } : null;
};

// ─── Consultation mutations ───────────────────────────────────────────────────
function getConsultations() {
  if (!_consultations) {
    _consultations = MOCK_CONSULTATIONS.map(c => ({ ...c }));
  }
  return _consultations;
}

export const fetchConsultations = async () => {
  await delay();
  return getConsultations().map(c => ({ ...c }));
};

export const fetchPatientConsultations = async (patientId) => {
  await delay();
  return getConsultations().filter(c => c.patient_id === patientId).map(c => ({ ...c }));
};

export const addConsultation = async (note) => {
  await delay(400);
  const cons = getConsultations();
  const newNote = { ...note, id: `con-${Date.now()}`, created_at: new Date().toISOString() };
  cons.unshift(newNote);
  return { ...newNote };
};

export const updateConsultation = async (id, patch) => {
  await delay(300);
  const cons = getConsultations();
  const idx = cons.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Consultation not found');
  // Enforce 48-hr edit window
  const created = new Date(cons[idx].created_at);
  const hoursDiff = (Date.now() - created.getTime()) / (1000 * 60 * 60);
  if (hoursDiff > 48) throw new Error('Edit window expired (48 hrs)');
  cons[idx] = { ...cons[idx], ...patch };
  return { ...cons[idx] };
};

export const cancelPrescription = async (id) => {
  await delay(300);
  // _prescriptions is the module-level mutable array declared at the top of this file
  const idx = _prescriptions.findIndex(p => p.id === id);
  if (idx !== -1) _prescriptions[idx] = { ..._prescriptions[idx], status: 'cancelled' };
  return _prescriptions[idx] ? { ..._prescriptions[idx] } : null;
};

// ─── Clinical settings (edit window) ─────────────────────────────────────────
let _clinicalSettings = null;

function getClinicalSettings() {
  if (!_clinicalSettings) {
    const { MOCK_CLINICAL_SETTINGS } = require('./data');
    _clinicalSettings = {
      push_notifications: true,
      critical_lab_alerts: true,
      email_reports: true,
      two_factor_enabled: false,
      ...MOCK_CLINICAL_SETTINGS,
    };
  }
  return _clinicalSettings;
}

export const fetchClinicalSettings = async () => {
  await delay(100);
  return { ...getClinicalSettings() };
};

export const updateClinicalSettings = async (patch) => {
  await delay(200);
  _clinicalSettings = { ...getClinicalSettings(), ...patch };
  return { ..._clinicalSettings };
};

export const changePassword = async ({ currentPassword, newPassword } = {}) => {
  await delay(1000);
  if (String(currentPassword || '') === 'wrong') {
    const err = new Error('Current password is incorrect');
    err.status = 400;
    err.body = { error: 'Current password is incorrect' };
    throw err;
  }
  if (String(newPassword || '') === String(currentPassword || '')) {
    throw new Error('New password must be different from your current password.');
  }
  if (!String(newPassword || '') || String(newPassword).length < 8) {
    throw new Error('Password must be at least 8 characters and include one number and one uppercase letter.');
  }
  return { detail: 'Password updated. Please sign in again.' };
};

export const invitePatient = async (payload = {}) => {
  await delay(500);
  const email = String(payload?.email || '').trim().toLowerCase();
  if (!email) throw new Error('Email is required.');
  if (!String(payload?.date_of_birth || '').trim()) throw new Error('Date of birth is required.');
  return {
    patient_invite: true,
    patient_code: `PAT-${Date.now()}`,
    email,
    temporary_password: `Inv${String(Date.now()).slice(-6)}Aa1`,
    login_url: 'https://patient.gonep.local/login',
  };
};

// ─── Support ticket mutations ─────────────────────────────────────────────────
let _tickets = null;

function getTickets() {
  if (!_tickets) {
    const { MOCK_SUPPORT_TICKETS } = require('./data');
    _tickets = MOCK_SUPPORT_TICKETS.map(t => ({ ...t }));
  }
  return _tickets;
}

export const fetchSupportTickets = async () => {
  await delay();
  return getTickets().map(t => ({ ...t }));
};

export const createSupportTicket = async (ticket) => {
  await delay(400);
  const t = { ...ticket, id: `tkt-${Date.now()}`, created_at: new Date().toISOString() };
  getTickets().unshift(t);
  return { ...t };
};

export const updateSupportTicket = async (id, patch) => {
  await delay(300);
  const ts = getTickets();
  const idx = ts.findIndex(t => t.id === id);
  if (idx !== -1) ts[idx] = { ...ts[idx], ...patch };
  return ts[idx] ? { ...ts[idx] } : null;
};

// ─── POS mutations ────────────────────────────────────────────────────────────
let _posAccounts     = null;
let _posTransactions = null;

function getPosAccounts() {
  if (!_posAccounts) {
    const { MOCK_POS_ACCOUNTS } = require('./data');
    _posAccounts = MOCK_POS_ACCOUNTS.map(a => ({ ...a }));
  }
  return _posAccounts;
}

function getPosTransactions() {
  if (!_posTransactions) {
    const { MOCK_POS_TRANSACTIONS } = require('./data');
    _posTransactions = MOCK_POS_TRANSACTIONS.map(t => ({ ...t }));
  }
  return _posTransactions;
}

export const fetchPosAccounts    = async () => { await delay(); return getPosAccounts().map(a => ({...a})); };
export const fetchPosTransactions = async (posId) => {
  await delay();
  const all = getPosTransactions();
  return (posId ? all.filter(t => t.pos_id === posId) : all).map(t => ({...t}));
};

export const createPosAccount = async (account) => {
  await delay(400);
  const a = { ...account, id: `pos-${Date.now()}`, created_at: new Date().toISOString(), active: true };
  getPosAccounts().push(a);
  return { ...a };
};

export const savePosTransaction = async (tx) => {
  await delay(200);
  // Auto-deduct stock
  tx.items.forEach(item => {
    const idx = _inventory.findIndex(i => i.id === item.id);
    if (idx !== -1) {
      const newStock = Math.max(0, _inventory[idx].stock - item.qty);
      const status   = newStock <= 0 ? 'out' : newStock <= _inventory[idx].reorder ? 'low' : 'ok';
      const histEntry = {
        date: new Date().toLocaleTimeString('en-KE'),
        action: 'POS sale', qty_change: -item.qty, by: tx.cashier,
      };
      _inventory[idx] = { ..._inventory[idx], stock: newStock, status, history: [histEntry, ...(_inventory[idx].history||[])] };
    }
  });
  const saved = { ...tx, id: `pos-tx-${Date.now()}`, created_at: new Date().toISOString() };
  getPosTransactions().unshift(saved);
  return { ...saved };
};

export const resetPosPassword = async (id, newPassword) => {
  await delay(300);
  const accounts = getPosAccounts();
  const idx = accounts.findIndex(a => a.id === id);
  if (idx !== -1) accounts[idx] = { ...accounts[idx], password_hint: 'Reset by admin' };
  return accounts[idx] ? { ...accounts[idx] } : null;
};
