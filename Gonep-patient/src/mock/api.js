import {
  MOCK_USER,
  MOCK_APPOINTMENTS,
  MOCK_ORDERS,
  MOCK_RECORDS,
  MOCK_NOTIFICATIONS,
} from './data';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchCurrentUser() {
  await delay();
  return MOCK_USER;
}

export async function fetchAppointments(filters = {}) {
  await delay();
  const { status } = filters;
  let items = [...MOCK_APPOINTMENTS];
  if (status) {
    items = items.filter((a) => a.status === status);
  }
  return items;
}

export async function fetchAppointmentById(id) {
  await delay();
  return MOCK_APPOINTMENTS.find((a) => a.id === id) || null;
}

export async function updateAppointment(id, patch) {
  await delay();
  const idx = MOCK_APPOINTMENTS.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...patch };
  return MOCK_APPOINTMENTS[idx];
}

export async function fetchOrders() {
  await delay();
  return [...MOCK_ORDERS];
}

export async function fetchOrderById(id) {
  await delay();
  return MOCK_ORDERS.find((o) => o.id === id) || null;
}

export async function reorderOrder(id) {
  await delay();
  const original = MOCK_ORDERS.find((o) => o.id === id);
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

export async function fetchRecords() {
  await delay();
  return [...MOCK_RECORDS];
}

export async function fetchNotifications() {
  await delay();
  return [...MOCK_NOTIFICATIONS];
}

export async function markNotificationRead(id) {
  await delay();
  const idx = MOCK_NOTIFICATIONS.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  MOCK_NOTIFICATIONS[idx] = { ...MOCK_NOTIFICATIONS[idx], read: true };
  return MOCK_NOTIFICATIONS[idx];
}

