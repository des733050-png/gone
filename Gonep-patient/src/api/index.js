// FILE: src/api/index.js
// COMPLETE REPLACEMENT

import { API_CONFIG } from '../config/env';

const MODE = String(API_CONFIG.MODE || '').trim().toLowerCase();
const VALID_MODES = ['mock', 'development', 'staging', 'production'];

if (!VALID_MODES.includes(MODE)) {
  throw new Error(
    `[Gonep API] Invalid MODE "${MODE}". Valid values: ${VALID_MODES.join(', ')}.`
  );
}

let layer;
if (MODE === 'mock') {
  const mod = require('./mock/index');
  layer = mod?.default || mod;
} else if (MODE === 'development') {
  const mod = require('./dev/index');
  layer = mod?.default || mod;
} else if (MODE === 'staging' || MODE === 'production') {
  const mod = require('./prod/index');
  layer = mod?.default || mod;
} else {
  throw new Error(
    `[Gonep API] Unsupported MODE "${MODE}". Refusing to fall back to another layer.`
  );
}

// Auth
export const loginPatient             = layer.loginPatient;
export const registerPatient          = layer.registerPatient;
export const getCurrentUser           = layer.getCurrentUser;
export const updateCurrentUser        = layer.updateCurrentUser;
export const logoutPatient            = layer.logoutPatient;
export const requestPasswordReset     = layer.requestPasswordReset;
export const verifyPasswordReset      = layer.verifyPasswordReset;

// Settings
export const getSettings              = layer.getSettings;
export const updateSettings           = layer.updateSettings;

// Booking discovery (new)
export const getSpecialties           = layer.getSpecialties;
export const getDoctors               = layer.getDoctors;
export const getDoctorSlots           = layer.getDoctorSlots;

// Appointments
export const getAppointments          = layer.getAppointments;
export const getAppointmentById       = layer.getAppointmentById;
export const updateAppointment        = layer.updateAppointment;
export const createAppointment        = layer.createAppointment;
export const rescheduleAppointment    = layer.rescheduleAppointment;
export const getMeetingRoom           = layer.getMeetingRoom;

// Orders (UI disabled, code retained)
export const getOrders                = layer.getOrders;
export const getOrderById             = layer.getOrderById;
export const reorderOrder             = layer.reorderOrder;

// Records
export const getRecords               = layer.getRecords;
export const getRecordById            = layer.getRecordById;

// Vitals (NI)
export const getVitals                = layer.getVitals;

// Chat (NI)
export const getChatThread            = layer.getChatThread;

// Notifications
export const getNotifications         = layer.getNotifications;
export const markNotificationRead     = layer.markNotificationRead;
export const markAllNotificationsRead = layer.markAllNotificationsRead;

// Support
export const getSupportTickets        = layer.getSupportTickets;
export const createSupportTicket      = layer.createSupportTicket;

// SSE stream
export const subscribePatientEvents   = layer.subscribePatientEvents;