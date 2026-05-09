// FILE: src/api/dev/index.js  (and prod/index.js — identical export list)
// COMPLETE REPLACEMENT for both dev and prod index files.

import { createHttpLayer } from '../httpLayer';

const layer = createHttpLayer();

// Auth
export const loginPatient           = layer.loginPatient;
export const registerPatient        = layer.registerPatient;
export const getCurrentUser         = layer.getCurrentUser;
export const updateCurrentUser      = layer.updateCurrentUser;
export const logoutPatient          = layer.logoutPatient;
export const requestPasswordReset   = layer.requestPasswordReset;
export const verifyPasswordReset    = layer.verifyPasswordReset;

// Settings
export const getSettings            = layer.getSettings;
export const updateSettings         = layer.updateSettings;

// Booking discovery (new)
export const getSpecialties         = layer.getSpecialties;
export const getDoctors             = layer.getDoctors;
export const getDoctorSlots         = layer.getDoctorSlots;

// Appointments
export const getAppointments        = layer.getAppointments;
export const getAppointmentById     = layer.getAppointmentById;
export const updateAppointment      = layer.updateAppointment;
export const createAppointment      = layer.createAppointment;
export const getMeetingRoom         = layer.getMeetingRoom;
export const rescheduleAppointment  = layer.rescheduleAppointment;

// Orders (code retained, UI disabled)
export const getOrders              = layer.getOrders;
export const getOrderById           = layer.getOrderById;
export const reorderOrder           = layer.reorderOrder;

// Records
export const getRecords             = layer.getRecords;
export const getRecordById          = layer.getRecordById;

// Vitals (NI)
export const getVitals              = layer.getVitals;

// Chat (NI)
export const getChatThread          = layer.getChatThread;

// Notifications
export const getNotifications       = layer.getNotifications;
export const markNotificationRead   = layer.markNotificationRead;
export const markAllNotificationsRead = layer.markAllNotificationsRead;

// Support
export const getSupportTickets      = layer.getSupportTickets;
export const createSupportTicket    = layer.createSupportTicket;

// SSE
export const subscribePatientEvents = layer.subscribePatientEvents;