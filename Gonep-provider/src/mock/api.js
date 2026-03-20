import {
  MOCK_APPOINTMENTS, MOCK_PRESCRIPTIONS, MOCK_PATIENTS,
  MOCK_LAB, MOCK_INVENTORY, MOCK_BILLING, MOCK_NOTIFICATIONS,
} from './data';

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

export const mockApi = {
  getDashboard:      async () => { await delay(); return {}; },
  getAppointments:   async () => { await delay(); return MOCK_APPOINTMENTS; },
  getPrescriptions:  async () => { await delay(); return MOCK_PRESCRIPTIONS; },
  getPatients:       async () => { await delay(); return MOCK_PATIENTS; },
  getLabResults:     async () => { await delay(); return MOCK_LAB; },
  getInventory:      async () => { await delay(); return MOCK_INVENTORY; },
  getBilling:        async () => { await delay(); return MOCK_BILLING; },
  getNotifications:  async () => { await delay(); return MOCK_NOTIFICATIONS; },
};
