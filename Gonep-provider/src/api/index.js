// ─── src/api/index.js ────────────────────────────────────────────────────────
// Single import point for all screens and hooks.
// Routes to mock / dev / prod based on EXPO_PUBLIC_API_MODE.
//
// NEVER import from api/mock, api/dev, or api/prod directly in screens.
// Always import from '../../api' (or '../api' etc.) so the environment
// routing is handled here in one place.
// ─────────────────────────────────────────────────────────────────────────────

import { API_CONFIG } from '../config/env';

const MODE = String(API_CONFIG.MODE || '').trim().toLowerCase(); // 'mock' | 'development' | 'staging' | 'production'

// Lazy-require each environment so bundlers can tree-shake unused layers.
// Using conditional require (not dynamic import) keeps it synchronous and
// compatible with Metro bundler without extra babel transforms.
let layer;
if (MODE === 'mock') {
  layer = require('./mock/index');
} else if (MODE === 'development') {
  layer = require('./dev/index');
} else if (MODE === 'staging' || MODE === 'production') {
  // staging + production both use the prod layer (auth tokens, error reporting)
  layer = require('./prod/index');
} else {
  throw new Error(
    `[Gonep API] Unsupported MODE "${MODE}". Refusing to fall back to another layer.`
  );
}

// ─── Re-export every function from the chosen layer ──────────────────────────
// Adding a new API function? Add it to all three index files (mock/dev/prod)
// then it will automatically appear here.

export const getAppointments          = layer.getAppointments;
export const createAppointment       = layer.createAppointment;
export const loginProvider            = layer.loginProvider;
export const submitFacilityApplication = layer.submitFacilityApplication;
export const registerFacilityPending   = layer.registerFacilityPending;
export const getVerificationStatus     = layer.getVerificationStatus;
export const uploadVerificationDocument = layer.uploadVerificationDocument;
export const deleteVerificationDocument = layer.deleteVerificationDocument;
export const getOnboardingState        = layer.getOnboardingState;
export const setOnboardingCompleted    = layer.setOnboardingCompleted;
export const getCurrentUser           = layer.getCurrentUser;
export const updateCurrentUser        = layer.updateCurrentUser;
export const changePassword           = layer.changePassword;
export const invitePatient            = layer.invitePatient;
export const logoutProvider           = layer.logoutProvider;
export const getPrescriptions         = layer.getPrescriptions;
export const dispatchPrescription     = layer.dispatchPrescription;
export const getPatients              = layer.getPatients;
export const searchPatientsForBooking = layer.searchPatientsForBooking;
export const getLabResults            = layer.getLabResults;
export const getInventory             = layer.getInventory;
export const getBilling               = layer.getBilling;
export const getNotifications         = layer.getNotifications;
export const getAvailability          = layer.getAvailability;
export const getActivityLogs          = layer.getActivityLogs;
export const getAnalytics             = layer.getAnalytics;

// Billing
export const markBillingPaid          = layer.markBillingPaid;

// Notifications
export const markNotificationRead     = layer.markNotificationRead;
export const markAllNotificationsRead = layer.markAllNotificationsRead;

// Inventory
export const addStock                 = layer.addStock;
export const reduceStock              = layer.reduceStock;
export const updateInventoryItem      = layer.updateInventoryItem;
export const addInventoryItem         = layer.addInventoryItem;
export const deactivateInventoryItem  = layer.deactivateInventoryItem;
export const toggleEcommerce          = layer.toggleEcommerce;

// Availability
export const addAvailabilitySlot      = layer.addAvailabilitySlot;
export const removeAvailabilitySlot   = layer.removeAvailabilitySlot;
export const toggleBlockDay           = layer.toggleBlockDay;

// Staff (admin only)
export const updateStaff              = layer.updateStaff;
export const addStaffMember           = layer.addStaffMember;
export const suspendStaff             = layer.suspendStaff;
export const reactivateStaff          = layer.reactivateStaff;
export const resetStaffPassword       = layer.resetStaffPassword;

// Activity log (no-op in dev/prod — server handles it there)
export const appendLog                = layer.appendLog;

// Staff read (added)
export const getStaff = layer.getStaff;
export const getFacilitySpecialties   = layer.getFacilitySpecialties;
export const createFacilitySpecialty  = layer.createFacilitySpecialty;
export const updateFacilitySpecialty  = layer.updateFacilitySpecialty;
export const deleteFacilitySpecialty  = layer.deleteFacilitySpecialty;

// Specializations (master catalogue + requests)
export const getSpecializations         = layer.getSpecializations;
export const getSpecializationRequests  = layer.getSpecializationRequests;
export const createSpecializationRequest = layer.createSpecializationRequest;

// Booking flow helpers
export const getBookingSpecialties    = layer.getBookingSpecialties;
export const getBookingDoctors        = layer.getBookingDoctors;
export const searchBookingPatients    = layer.searchBookingPatients;
export const getBookingDoctorSlots    = layer.getBookingDoctorSlots;
export const confirmAppointment       = layer.confirmAppointment;
export const rejectAppointment        = layer.rejectAppointment;
export const rescheduleAppointment    = layer.rescheduleAppointment;
export const assignAppointmentDoctor  = layer.assignAppointmentDoctor;
export const startAppointment         = layer.startAppointment;
export const completeAppointment      = layer.completeAppointment;
export const getAppointmentMeetingRoom = layer.getAppointmentMeetingRoom;
export const updateAppointment        = layer.updateAppointment;
export const softDeleteAppointment    = layer.softDeleteAppointment;
export const restoreAppointment       = layer.restoreAppointment;

// Consultations (added)
export const getConsultations        = layer.getConsultations;
export const getPatientConsultations = layer.getPatientConsultations;
export const addConsultation         = layer.addConsultation;
export const updateConsultation      = layer.updateConsultation;
export const cancelPrescription      = layer.cancelPrescription;

// Clinical settings, support tickets, POS (added)
export const getClinicalSettings  = layer.getClinicalSettings;
export const setClinicalSettings  = layer.setClinicalSettings;
export const getSupportTickets    = layer.getSupportTickets;
export const createSupportTicket  = layer.createSupportTicket;
export const updateSupportTicket  = layer.updateSupportTicket;
export const getPosAccounts       = layer.getPosAccounts;
export const getPosTransactions   = layer.getPosTransactions;
export const createPosAccount     = layer.createPosAccount;
export const savePosTransaction   = layer.savePosTransaction;
export const resetPosPassword     = layer.resetPosPassword;
export const requestPasswordReset = layer.requestPasswordReset;
export const verifyPasswordReset  = layer.verifyPasswordReset;
