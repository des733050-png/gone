import { APP_CONFIG } from '../../config/env';
import {
  MOCK_USER,
  MOCK_APPOINTMENTS,
  MOCK_ORDERS,
  MOCK_RECORDS,
  MOCK_VITALS,
  MOCK_CHAT_THREAD,
  MOCK_NOTIFICATIONS,
} from '../../mock/data';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginPatient({ email, password }) {
  await delay();
  const expectedEmail = APP_CONFIG.DEMO_EMAIL.toLowerCase();
  if (email?.toLowerCase() !== expectedEmail || password !== APP_CONFIG.DEMO_PASSWORD) {
    throw new Error('Invalid email or password.');
  }
  return MOCK_USER;
}

export async function registerPatient(payload) {
  await delay();
  return {
    ...MOCK_USER,
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: payload.phone,
  };
}

export async function getCurrentUser() {
  await delay();
  return MOCK_USER;
}

export async function getAppointments(filters = {}) {
  await delay();
  const { status } = filters;
  const items = [...MOCK_APPOINTMENTS];
  return status ? items.filter((item) => item.status === status) : items;
}

export async function getAppointmentById(id) {
  await delay();
  return MOCK_APPOINTMENTS.find((item) => item.id === id) || null;
}

export async function updateAppointment(id, patch) {
  await delay();
  const idx = MOCK_APPOINTMENTS.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...patch };
  return MOCK_APPOINTMENTS[idx];
}

export async function getOrders() {
  await delay();
  return [...MOCK_ORDERS];
}

export async function getOrderById(id) {
  await delay();
  return MOCK_ORDERS.find((item) => item.id === id) || null;
}

export async function reorderOrder(id) {
  await delay();
  const original = MOCK_ORDERS.find((item) => item.id === id);
  if (!original) return null;

  const copy = {
    ...original,
    id: `${id}-R${Math.floor(Math.random() * 90 + 10)}`,
    status: 'in_transit',
    eta: '~15 mins',
    placedAt: 'Just now',
  };
  MOCK_ORDERS.unshift(copy);
  return copy;
}

export async function getRecords() {
  await delay();
  return [...MOCK_RECORDS];
}

export async function getVitals() {
  await delay();
  return [...MOCK_VITALS];
}

export async function getChatThread() {
  await delay();
  return [...MOCK_CHAT_THREAD];
}

export async function getNotifications() {
  await delay();
  return [...MOCK_NOTIFICATIONS];
}

export async function markNotificationRead(id) {
  await delay();
  const idx = MOCK_NOTIFICATIONS.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  MOCK_NOTIFICATIONS[idx] = { ...MOCK_NOTIFICATIONS[idx], read: true };
  return MOCK_NOTIFICATIONS[idx];
}
