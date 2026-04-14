import { API_CONFIG } from '../config/env';

const MODE = API_CONFIG.MODE;
const VALID_MODES = ['mock', 'development', 'staging', 'production'];

if (!VALID_MODES.includes(MODE)) {
  throw new Error(
    `[Gonep API] Invalid MODE "${MODE}". Valid values: ${VALID_MODES.join(', ')}.`
  );
}

let layer;
if (MODE === 'mock') {
  layer = require('./mock/index');
} else if (MODE === 'development') {
  layer = require('./dev/index');
} else {
  layer = require('./prod/index');
}

export const loginPatient = layer.loginPatient;
export const registerPatient = layer.registerPatient;
export const getCurrentUser = layer.getCurrentUser;
export const getAppointments = layer.getAppointments;
export const getAppointmentById = layer.getAppointmentById;
export const updateAppointment = layer.updateAppointment;
export const getOrders = layer.getOrders;
export const getOrderById = layer.getOrderById;
export const reorderOrder = layer.reorderOrder;
export const getRecords = layer.getRecords;
export const getVitals = layer.getVitals;
export const getChatThread = layer.getChatThread;
export const getNotifications = layer.getNotifications;
export const markNotificationRead = layer.markNotificationRead;
