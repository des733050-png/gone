// FILE: src/api/dev/index.js

import { createHttpLayer } from '../httpLayer';

const layer = createHttpLayer();

export const loginPatient = layer.loginPatient;
export const registerPatient = layer.registerPatient;
export const getCurrentUser = layer.getCurrentUser;
export const updateCurrentUser = layer.updateCurrentUser;
export const logoutPatient = layer.logoutPatient;
export const getSettings = layer.getSettings;
export const updateSettings = layer.updateSettings;
export const getAppointments = layer.getAppointments;
export const getAppointmentById = layer.getAppointmentById;
export const updateAppointment = layer.updateAppointment;
export const getOrders = layer.getOrders;
export const getOrderById = layer.getOrderById;
export const reorderOrder = layer.reorderOrder;
export const getRecords = layer.getRecords;
export const getRecordById = layer.getRecordById;
export const getVitals = layer.getVitals;
export const getChatThread = layer.getChatThread;
export const getNotifications = layer.getNotifications;
export const markNotificationRead = layer.markNotificationRead;
export const markAllNotificationsRead = layer.markAllNotificationsRead;
export const getSupportTickets = layer.getSupportTickets;
export const createSupportTicket = layer.createSupportTicket;
export const subscribePatientEvents = layer.subscribePatientEvents;