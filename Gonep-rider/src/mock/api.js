import {
  MOCK_RIDER, MOCK_REQUESTS, MOCK_ACTIVE_DELIVERY,
  MOCK_EARNINGS, MOCK_TRIPS, MOCK_NOTIFICATIONS, MOCK_MESSAGES,
} from './data';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export async function fetchCurrentRider()        { await delay(); return MOCK_RIDER; }
export async function fetchRequests()            { await delay(); return [...MOCK_REQUESTS]; }
export async function fetchActiveDelivery()      { await delay(); return { ...MOCK_ACTIVE_DELIVERY }; }
export async function acceptRequest(id)          { await delay(); return { id, status: 'accepted' }; }
export async function declineRequest(id)         { await delay(); return { id, status: 'declined' }; }
export async function completeDelivery(id)       { await delay(); return { id, status: 'completed' }; }
export async function fetchEarnings()            { await delay(); return { ...MOCK_EARNINGS }; }
export async function fetchTrips()               { await delay(); return [...MOCK_TRIPS]; }
export async function fetchNotifications()       { await delay(); return [...MOCK_NOTIFICATIONS]; }
export async function fetchMessages(orderId)     { await delay(); return [...MOCK_MESSAGES]; }
export async function updateRiderStatus(status)  { await delay(); return { status }; }
