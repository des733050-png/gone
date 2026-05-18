// ─── src/api/mock/index.js ───────────────────────────────────────────────────
// Mock API layer — all data served from src/mock/*.  No network calls.
// Used when EXPO_PUBLIC_API_MODE === 'mock' (default).
//
// Do NOT import this file directly in screens — always import from src/api.
// ─────────────────────────────────────────────────────────────────────────────

import {
  submitFacilityApplication,
  requestPasswordReset,
  verifyPasswordReset,
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
  fetchFacilitySpecialties,
  createFacilitySpecialty,
  deleteFacilitySpecialty,
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
export { requestPasswordReset, verifyPasswordReset };
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
export const getFacilitySpecialties   = fetchFacilitySpecialties;
export { createFacilitySpecialty, deleteFacilitySpecialty };
export const updateFacilitySpecialty = async (id, payload) => ({ id, ...payload });

// Specialization catalogue + requests (mock data)
const MOCK_SPECIALIZATIONS = [
  { id: 'spec-1',  name: 'Cardiology',               slug: 'cardiology',               description: '' },
  { id: 'spec-2',  name: 'Dermatology',               slug: 'dermatology',               description: '' },
  { id: 'spec-3',  name: 'Emergency Medicine',        slug: 'emergency-medicine',        description: '' },
  { id: 'spec-4',  name: 'Family Medicine',           slug: 'family-medicine',           description: '' },
  { id: 'spec-5',  name: 'General Medicine',          slug: 'general-medicine',          description: '' },
  { id: 'spec-6',  name: 'General Surgery',           slug: 'general-surgery',           description: '' },
  { id: 'spec-7',  name: 'Gynaecology & Obstetrics',  slug: 'gynaecology-obstetrics',    description: '' },
  { id: 'spec-8',  name: 'Internal Medicine',         slug: 'internal-medicine',         description: '' },
  { id: 'spec-9',  name: 'Neurology',                 slug: 'neurology',                 description: '' },
  { id: 'spec-10', name: 'Oncology',                  slug: 'oncology',                  description: '' },
  { id: 'spec-11', name: 'Ophthalmology',             slug: 'ophthalmology',             description: '' },
  { id: 'spec-12', name: 'Orthopaedics',              slug: 'orthopaedics',              description: '' },
  { id: 'spec-13', name: 'Paediatrics',               slug: 'paediatrics',               description: '' },
  { id: 'spec-14', name: 'Psychiatry',                slug: 'psychiatry',                description: '' },
  { id: 'spec-15', name: 'Radiology',                 slug: 'radiology',                 description: '' },
];
const _mockSpecRequests = [];
export const getSpecializations = async () => MOCK_SPECIALIZATIONS;
export const getSpecializationRequests = async () => _mockSpecRequests;
export const createSpecializationRequest = async (payload) => {
  const req = {
    id: `req-${Date.now()}`,
    name: payload?.name || '',
    reason: payload?.reason || '',
    status: 'pending',
    review_note: '',
    specialization: null,
    created_at: new Date().toISOString(),
  };
  _mockSpecRequests.unshift(req);
  return req;
};

// Booking flow helpers (mock)
export const getBookingSpecialties = fetchFacilitySpecialties;
export const getBookingDoctors = async (specialty) => {
  const staff = await fetchStaff();
  const doctors = (staff || []).filter((s) => s.role === 'doctor');
  if (!specialty) return doctors;
  return doctors.filter((d) => (d.specialty || '').toLowerCase() === specialty.toLowerCase());
};
export const searchBookingPatients = async (q) => {
  const patients = await fetchPatients();
  const query = (q || '').toLowerCase();
  const results = (patients?.patients || patients || [])
    .filter((p) => (
      (p.name || '').toLowerCase().includes(query) ||
      (p.phone || '').toLowerCase().includes(query) ||
      (p.email || '').toLowerCase().includes(query) ||
      (p.id || '').toLowerCase().includes(query)
    ))
    .slice(0, 15);
  return { results };
};
export const getBookingDoctorSlots = async (providerCode, type) => {
  const avail = await fetchAvailability();
  const slots = (avail?.slots || []).filter((s) => !type || s.type === type);
  return { provider_code: providerCode, slots, blocked_days: avail?.blocked_days || [] };
};
export const confirmAppointment = async (ref) => ({ reference: ref, status: 'confirmed' });
export const rejectAppointment = async (ref) => ({ reference: ref, status: 'rejected' });
export const rescheduleAppointment = async (ref, scheduledFor) => ({ reference: ref, scheduled_for: scheduledFor, status: 'confirmed' });
export const assignAppointmentDoctor = async (ref, doctorId) => ({ reference: ref, doctor_id: doctorId });
export const startAppointment = async (ref) => ({ reference: ref, status: 'in_progress', is_virtual: false, room_url: null });
export const completeAppointment = async (ref) => ({ reference: ref, status: 'completed' });
export const getAppointmentMeetingRoom = async (ref) => ({ appointment_ref: ref, room_url: `https://meet.jit.si/gonep-${ref}` });
export const updateAppointment = async (ref, payload) => ({ reference: ref, ...payload });
export const softDeleteAppointment = async (ref) => ({ reference: ref, deleted_at: new Date().toISOString() });
export const restoreAppointment = async (ref) => ({ reference: ref, deleted_at: null });

// ─── Write operations ─────────────────────────────────────────────────────────
export { dispatchPrescription };
export { markBillingPaid };
export { markNotificationRead, markAllNotificationsRead };
export { addStock, reduceStock, updateInventoryItem, addInventoryItem, deactivateInventoryItem, toggleEcommerce };
export { addAvailabilitySlot, removeAvailabilitySlot, toggleBlockDay };
export { updateStaff, addStaffMember, suspendStaff, reactivateStaff };
export const resetStaffPassword = async (id) => ({
  id,
  temporary_password: `Mock${Math.random().toString(36).slice(2, 9)}@1`,
  password_note: 'Mock password — copy now, will not be shown again.',
});
export const registerFacilityPending = async (payload) => ({
  facility_id: 'mock-facility-1',
  facility_code: 'FAC-MOCK',
  facility_status: 'pending',
  admin_email: payload?.admin_email || payload?.email || 'admin@example.com',
  next_step: 'login_then_upload_verification_documents',
  detail: 'Mock: facility account created.',
});
export const getVerificationStatus = async () => ({
  success: true,
  data: { verification_status: 'UNVERIFIED', access: 'RESTRICTED', can_upload_verification_documents: true },
});
export const uploadVerificationDocument = async () => ({ success: true });
export const deleteVerificationDocument = async () => ({ success: true });
export const getOnboardingState = async () => ({ completed: false, should_show: false, verification_status: 'UNVERIFIED' });
export const setOnboardingCompleted = async (completed = true) => ({ completed, should_show: false });

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
