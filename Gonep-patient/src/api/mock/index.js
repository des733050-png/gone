// FILE: src/api/mock/index.js

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
let MOCK_SETTINGS = {
  appointment_reminders: true,
  order_updates: true,
  lab_results_alerts: true,
  medication_refill_reminders: true,
  marketing_updates: false,
  privacy_mode: false,
};
let MOCK_SUPPORT_TICKETS = [];

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

export async function updateCurrentUser(payload) {
  await delay();
  return {
    ...MOCK_USER,
    ...(payload || {}),
  };
}

export async function getSettings() {
  await delay();
  return { ...MOCK_SETTINGS };
}

export async function updateSettings(payload) {
  await delay();
  MOCK_SETTINGS = {
    appointment_reminders: Boolean(payload?.appointment_reminders),
    order_updates: Boolean(payload?.order_updates),
    lab_results_alerts: Boolean(payload?.lab_results_alerts),
    medication_refill_reminders: Boolean(payload?.medication_refill_reminders),
    marketing_updates: Boolean(payload?.marketing_updates),
    privacy_mode: Boolean(payload?.privacy_mode),
  };
  return { ...MOCK_SETTINGS };
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

export async function getRecordById(id) {
  await delay();
  const record = MOCK_RECORDS.find((item) => item.id === id) || null;
  if (!record) return null;
  return {
    ...record,
    detail: {
      summary: record.title,
      fields: {
        drug_name: 'Amlodipine 5mg',
        dosage: 'Once daily',
        instructions: 'Take after breakfast.',
        prescribed_date: new Date().toISOString(),
      },
    },
  };
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

export async function markAllNotificationsRead() {
  await delay();
  for (let i = 0; i < MOCK_NOTIFICATIONS.length; i += 1) {
    MOCK_NOTIFICATIONS[i] = { ...MOCK_NOTIFICATIONS[i], read: true };
  }
  return { detail: 'Notifications updated.' };
}

export async function getSupportTickets() {
  await delay();
  return [...MOCK_SUPPORT_TICKETS];
}

export async function createSupportTicket(payload = {}) {
  await delay();
  const ticket = {
    id: `ptkt-${Date.now()}`,
    reference: `PTKT-${String(MOCK_SUPPORT_TICKETS.length + 1).padStart(4, '0')}`,
    subject: payload.subject || '',
    message: payload.message || '',
    severity: payload.severity || 'medium',
    status: 'in_progress',
    channel: 'app',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  MOCK_SUPPORT_TICKETS = [ticket, ...MOCK_SUPPORT_TICKETS];
  return ticket;
}

export function subscribePatientEvents() {
  return () => {};
}

export async function logoutPatient() {
  await delay();
  // Mock logout — no server state to clear
  return { authenticated: false };
}

export async function requestPasswordReset() {
  await delay(300);
  return { detail: 'If that email is registered, an OTP has been sent.' };
}

export async function verifyPasswordReset() {
  await delay(300);
  return { temp_password: 'TempMockPass1' };
}

// FILE: src/api/mock/index.js — ADDITIONS ONLY
// Add these exports to the existing mock/index.js file.
// Everything currently in that file stays unchanged.

// ─── ADD these functions to the existing mock/index.js ───────────────────────

export async function getSpecialties() {
  await delay();
  return {
    specialties: [
      'General Practice',
      'Cardiology',
      'Dermatology',
      'Paediatrics',
      'Pharmacist Consult',
    ],
  };
}

export async function getDoctors(specialty = '') {
  await delay();
  const all = [
    {
      id: 'mock-membership-001',
      provider_code: 'PRV-0001',
      name: 'Dr. Amina Wanjiku',
      specialty: 'General Practice',
      phone: '+254722222222',
      has_slots: true,
    },
    {
      id: 'mock-membership-002',
      provider_code: 'PRV-0002',
      name: 'Dr. James Ochieng',
      specialty: 'Pharmacist Consult',
      phone: '+254733333333',
      has_slots: true,
    },
  ];
  const doctors = specialty
    ? all.filter((d) => d.specialty.toLowerCase() === specialty.toLowerCase())
    : all;
  return { doctors };
}

export async function getDoctorSlots(providerCode, appointmentType = '') {
  await delay();
  const allSlots = [
    { date: '2026-05-05', datetime: '2026-05-05T09:00:00', day: 'Mon', start: '9:00 AM', end: '10:00', type: 'In Facility', slot_id: 'sl-1' },
    { date: '2026-05-05', datetime: '2026-05-05T10:00:00', day: 'Mon', start: '10:00 AM', end: '11:00', type: 'Home Visit', slot_id: 'sl-2' },
    { date: '2026-05-05', datetime: '2026-05-05T14:00:00', day: 'Mon', start: '2:00 PM', end: '15:00', type: 'Virtual', slot_id: 'sl-3' },
    { date: '2026-05-12', datetime: '2026-05-12T09:00:00', day: 'Mon', start: '9:00 AM', end: '10:00', type: 'In Facility', slot_id: 'sl-4' },
    { date: '2026-05-07', datetime: '2026-05-07T11:00:00', day: 'Wed', start: '11:00 AM', end: '12:00', type: 'Virtual', slot_id: 'sl-5' },
    { date: '2026-05-09', datetime: '2026-05-09T13:00:00', day: 'Fri', start: '1:00 PM', end: '14:00', type: 'Home Visit', slot_id: 'sl-6' },
  ];
  const filtered = appointmentType
    ? allSlots.filter((s) => s.type.toLowerCase() === appointmentType.toLowerCase())
    : allSlots;
  return {
    slots: filtered,
    blocked_days: ['Sun'],
    provider: {
      name: 'Dr. Amina Wanjiku',
      specialty: 'General Practice',
      provider_code: providerCode,
    },
  };
}

export async function createAppointment(payload) {
  await delay();
  const { MOCK_APPOINTMENTS } = require('../../mock/data');
  const newAppointment = {
    id: `apt-00${MOCK_APPOINTMENTS.length + 1}`,
    reference: `PBK-00${MOCK_APPOINTMENTS.length + 1}`,
    doctor: payload.provider_name || 'Dr. Amina Wanjiku',
    specialty: payload.specialty || 'General Practice',
    type: payload.appointment_type || 'In Facility',
    date: 'Upcoming',
    time: (payload.slot_datetime || payload.scheduled_for)
      ? new Date(payload.slot_datetime || payload.scheduled_for).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'TBD',
    status: 'pending',
    fee: 'KSh 2,500',
    facility: 'Nairobi General',
    reason: payload.reason || '',
    address: payload.location_details || 'To be confirmed',
    can_reschedule: true,
    can_cancel: true,
    scheduled_for: payload.slot_datetime || payload.scheduled_for || null,
    service_type_detail: payload.appointment_type || 'In Facility',
  };
  return newAppointment;
}

export async function getMeetingRoom(bookingRef) {
  await delay();
  return {
    room_url: `https://meet.daily.co/gonep-${bookingRef}`,
    booking_ref: bookingRef,
    scheduled_for: new Date().toISOString(),
  };
}

export async function rescheduleAppointment(bookingRef, slotDatetime) {
  await delay();
  return {
    booking_ref: bookingRef,
    scheduled_for: slotDatetime,
    status: 'pending',
    message: 'Reschedule request sent.',
  };
}

