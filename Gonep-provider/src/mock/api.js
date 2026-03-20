import {
  MOCK_PROVIDER, MOCK_APPOINTMENTS, MOCK_PRESCRIPTIONS, MOCK_PATIENTS,
  MOCK_LAB, MOCK_INVENTORY, MOCK_BILLING, MOCK_NOTIFICATIONS,
} from './data';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const fetchCurrentProvider   = async () => { await delay(); return MOCK_PROVIDER; };
export const fetchAppointments      = async () => { await delay(); return [...MOCK_APPOINTMENTS]; };
export const fetchPrescriptions     = async () => { await delay(); return [...MOCK_PRESCRIPTIONS]; };
export const dispatchPrescription   = async (id) => { await delay(); const i = MOCK_PRESCRIPTIONS.findIndex((x) => x.id === id); if (i >= 0) MOCK_PRESCRIPTIONS[i].status = 'dispatched'; return MOCK_PRESCRIPTIONS[i]; };
export const fetchPatients          = async () => { await delay(); return [...MOCK_PATIENTS]; };
export const fetchPatientById       = async (id) => { await delay(); return MOCK_PATIENTS.find((p) => p.id === id) || null; };
export const fetchLabResults        = async () => { await delay(); return [...MOCK_LAB]; };
export const fetchInventory         = async () => { await delay(); return [...MOCK_INVENTORY]; };
export const fetchBilling           = async () => { await delay(); return [...MOCK_BILLING]; };
export const fetchNotifications     = async () => { await delay(); return [...MOCK_NOTIFICATIONS]; };
