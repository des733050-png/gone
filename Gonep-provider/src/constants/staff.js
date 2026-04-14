// ─── constants/staff.js ──────────────────────────────────────────────────────

export const ROLE_OPTS = ['doctor', 'billing_manager', 'lab_manager', 'receptionist'];

export const ROLE_FILTER_OPTIONS = ['all', 'doctor', 'billing_manager', 'lab_manager', 'receptionist'];

export const PERMS = {
  hospital_admin:  [{ l: 'Full access', y: true }, { l: 'Billing', y: true }, { l: 'Staff mgmt', y: true }, { l: 'Settings', y: true }],
  doctor:          [{ l: 'Own patients', y: true }, { l: 'Rx & EMR', y: true }, { l: 'Billing', y: false }, { l: 'Settings', y: false }],
  billing_manager: [{ l: 'Billing', y: true }, { l: 'Invoices', y: true }, { l: 'Clinical', y: false }, { l: 'Settings', y: false }],
  lab_manager:     [{ l: 'Lab results', y: true }, { l: 'Inventory', y: true }, { l: 'Billing', y: false }, { l: 'Settings', y: false }],
  receptionist:    [{ l: 'Scheduling', y: true }, { l: 'Appointments', y: true }, { l: 'Clinical', y: false }, { l: 'Billing', y: false }],
};

export const ROLE_DESC = {
  doctor:          'Appointments, Rx, EMR, own patients only',
  billing_manager: 'Billing and invoices only',
  lab_manager:     'Lab results, inventory, pharmacy',
  receptionist:    'Appointment scheduling only',
};
