// ─── src/api/mock/index.js ───────────────────────────────────────────────────
// Mock API layer — all data served from src/mock/*.  No network calls.
// Used when EXPO_PUBLIC_API_MODE === 'mock' (default).
//
// Do NOT import this file directly in screens — always import from src/api.
// ─────────────────────────────────────────────────────────────────────────────

import {
  submitFacilityApplication,
  fetchAppointments,
  createAppointment,
  fetchPrescriptions,
  dispatchPrescription,
  fetchPatients,
  searchPatientsForBooking as mockSearchPatientsForBooking,
  fetchLabResults,
  fetchInventory,
  fetchBilling,
  fetchNotifications,
  fetchAvailability,
  fetchActivityLogs,
  fetchStaff,
  markBillingPaid,
  markNotificationRead,
  markAllNotificationsRead,
  addStock,
  reduceStock,
  updateInventoryItem,
  addInventoryItem,
  deactivateInventoryItem,
  toggleEcommerce,
  addAvailabilitySlot,
  removeAvailabilitySlot,
  toggleBlockDay,
  updateStaff,
  addStaffMember,
  suspendStaff,
  reactivateStaff,
  appendLog,
} from '../../mock/api';
import { APP_CONFIG } from '../../config/env';
import { DEMO_ACCOUNTS, MOCK_ANALYTICS } from '../../mock/data';

// ─── Read operations ──────────────────────────────────────────────────────────
export const getAppointments          = fetchAppointments;
export { createAppointment };
export { submitFacilityApplication };
export const getPrescriptions         = fetchPrescriptions;
export const getPatients              = fetchPatients;
export const searchPatientsForBooking = mockSearchPatientsForBooking;
export const getLabResults            = fetchLabResults;
export const getInventory             = fetchInventory;
export const getBilling               = fetchBilling;
export const getNotifications         = fetchNotifications;
export const getAvailability          = fetchAvailability;
export const getActivityLogs          = fetchActivityLogs;
export const getStaff                 = fetchStaff;

// ─── Write operations ─────────────────────────────────────────────────────────
export { dispatchPrescription };
export { markBillingPaid };
export { markNotificationRead, markAllNotificationsRead };
export { addStock, reduceStock, updateInventoryItem, addInventoryItem, deactivateInventoryItem, toggleEcommerce };
export { addAvailabilitySlot, removeAvailabilitySlot, toggleBlockDay };
export { updateStaff, addStaffMember, suspendStaff, reactivateStaff };

// ─── Logging (mock — appends to in-memory log) ────────────────────────────────
export { appendLog };

// Consultations (added)
import {
  fetchConsultations,
  fetchPatientConsultations,
  addConsultation,
  updateConsultation,
  cancelPrescription,
} from '../../mock/api';

export const getConsultations         = fetchConsultations;
export const getPatientConsultations  = fetchPatientConsultations;
export { addConsultation, updateConsultation, cancelPrescription };

// Clinical settings, support tickets, POS (added)
import {
  fetchClinicalSettings, updateClinicalSettings, changePassword, invitePatient,
  fetchSupportTickets, createSupportTicket, updateSupportTicket,
  fetchPosAccounts, fetchPosTransactions,
  createPosAccount, savePosTransaction, resetPosPassword,
} from '../../mock/api';

export const getClinicalSettings     = fetchClinicalSettings;
export const setClinicalSettings     = updateClinicalSettings;
export { changePassword, invitePatient };
export const getSupportTickets       = fetchSupportTickets;
export { createSupportTicket, updateSupportTicket };
export const getPosAccounts          = fetchPosAccounts;
export const getPosTransactions      = fetchPosTransactions;
export { createPosAccount, savePosTransaction, resetPosPassword };

export async function loginProvider({ email, password }) {
  const match = DEMO_ACCOUNTS.find(
    (account) => account.user.email.toLowerCase() === String(email || '').toLowerCase()
  );
  if (!match || password !== APP_CONFIG.DEMO_PASSWORD) {
    throw new Error('Invalid credentials. Use a demo account to sign in.');
  }
  return match.user;
}

export async function getCurrentUser() {
  return DEMO_ACCOUNTS[0]?.user || null;
}

export async function updateCurrentUser(payload = {}) {
  return { ...DEMO_ACCOUNTS[0]?.user, ...(payload || {}) };
}

export async function getAnalytics() {
  return MOCK_ANALYTICS;
}

export async function logoutProvider() {
  return null;
}
