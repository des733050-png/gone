import { createHttpLayer } from '../httpLayer';

const layer = createHttpLayer();

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
