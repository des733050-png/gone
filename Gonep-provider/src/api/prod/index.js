// ─── src/api/prod/index.js ───────────────────────────────────────────────────
// Production API layer — identical shape to dev, different base URL.
// Used when EXPO_PUBLIC_API_MODE === 'production' or 'staging'.
// Auth headers, refresh tokens, and error reporting hooks go here —
// not in dev/index.js — to keep the dev surface simple.
// ─────────────────────────────────────────────────────────────────────────────

import { createHttpLayer } from '../httpLayer';

const layer = createHttpLayer({ tokenMode: false });

export const loginProvider = layer.loginProvider;
export const submitFacilityApplication = layer.submitFacilityApplication;
export const getCurrentUser = layer.getCurrentUser;
export const updateCurrentUser = layer.updateCurrentUser;
export const changePassword = layer.changePassword;
export const invitePatient = layer.invitePatient;
export const logoutProvider = layer.logoutProvider;
export const getAppointments = layer.getAppointments;
export const createAppointment = layer.createAppointment;
export const getPrescriptions = layer.getPrescriptions;
export const dispatchPrescription = layer.dispatchPrescription;
export const getPatients = layer.getPatients;
export const searchPatientsForBooking = layer.searchPatientsForBooking;
export const getLabResults = layer.getLabResults;
export const getInventory = layer.getInventory;
export const getBilling = layer.getBilling;
export const getNotifications = layer.getNotifications;
export const getAvailability = layer.getAvailability;
export const getActivityLogs = layer.getActivityLogs;
export const getAnalytics = layer.getAnalytics;
export const markBillingPaid = layer.markBillingPaid;
export const markNotificationRead = layer.markNotificationRead;
export const markAllNotificationsRead = layer.markAllNotificationsRead;
export const addStock = layer.addStock;
export const reduceStock = layer.reduceStock;
export const updateInventoryItem = layer.updateInventoryItem;
export const addInventoryItem = layer.addInventoryItem;
export const deactivateInventoryItem = layer.deactivateInventoryItem;
export const toggleEcommerce = layer.toggleEcommerce;
export const addAvailabilitySlot = layer.addAvailabilitySlot;
export const removeAvailabilitySlot = layer.removeAvailabilitySlot;
export const toggleBlockDay = layer.toggleBlockDay;
export const updateStaff = layer.updateStaff;
export const addStaffMember = layer.addStaffMember;
export const suspendStaff = layer.suspendStaff;
export const reactivateStaff = layer.reactivateStaff;
export const appendLog = layer.appendLog;
export const getStaff = layer.getStaff;
export const getConsultations = layer.getConsultations;
export const getPatientConsultations = layer.getPatientConsultations;
export const addConsultation = layer.addConsultation;
export const updateConsultation = layer.updateConsultation;
export const cancelPrescription = layer.cancelPrescription;
export const getClinicalSettings = layer.getClinicalSettings;
export const setClinicalSettings = layer.setClinicalSettings;
export const getSupportTickets = layer.getSupportTickets;
export const createSupportTicket = layer.createSupportTicket;
export const updateSupportTicket = layer.updateSupportTicket;
export const getPosAccounts = layer.getPosAccounts;
export const getPosTransactions = layer.getPosTransactions;
export const createPosAccount = layer.createPosAccount;
export const savePosTransaction = layer.savePosTransaction;
export const resetPosPassword = layer.resetPosPassword;
