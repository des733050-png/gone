// ─── DEV CONFIG ─────────────────────────────────────────────────────────────
// Set MOCK_DELAY_MS to 0 for instant responses during UI development.
// Set to 400–800 for realistic latency testing before switching to real API.
export const MOCK_DELAY_MS = 400;

// ─── Hospital ────────────────────────────────────────────────────────────────
export const MOCK_HOSPITAL = {
  id: 'hosp-001',
  name: 'Nairobi General Hospital',
  email: 'admin@nairobi-general.co.ke',
  phone: '+254 20 272 5000',
  location: 'Upper Hill, Nairobi',
  registration_no: 'MoH-KE-2019-0042',
  status: 'approved',
  approved_at: '2024-01-15',
};

// ─── Users by role ───────────────────────────────────────────────────────────
export const MOCK_HOSPITAL_ADMIN = {
  id: 'usr-HA-001', email: 'admin@nairobi-general.co.ke', role: 'hospital_admin',
  first_name: 'Grace', last_name: 'Muthoni', phone: '+254 722 000 001',
  specialty: null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001', license: null,
};
export const MOCK_DOCTOR = {
  id: 'usr-DOC-001', email: 'doctor@nairobi-general.co.ke', role: 'doctor',
  first_name: 'Dr. Amina', last_name: 'Wanjiku', phone: '+254 722 111 222',
  specialty: 'General Physician', facility: 'Nairobi General Hospital',
  hospital_id: 'hosp-001', license: 'KMA-GP-20392',
  affiliated_hospitals: ['hosp-001', 'hosp-002'],
};
export const MOCK_BILLING_MANAGER = {
  id: 'usr-BM-001', email: 'billing@nairobi-general.co.ke', role: 'billing_manager',
  first_name: 'Samuel', last_name: 'Otieno', phone: '+254 722 333 444',
  specialty: null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001', license: null,
};
export const MOCK_LAB_MANAGER = {
  id: 'usr-LM-001', email: 'lab@nairobi-general.co.ke', role: 'lab_manager',
  first_name: 'Priya', last_name: 'Sharma', phone: '+254 722 555 666',
  specialty: null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001', license: null,
};
export const MOCK_RECEPTIONIST = {
  id: 'usr-REC-001', email: 'reception@nairobi-general.co.ke', role: 'receptionist',
  first_name: 'Janet', last_name: 'Auma', phone: '+254 722 777 888',
  specialty: null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001', license: null,
};
export const MOCK_PROVIDER = MOCK_DOCTOR; // legacy alias

export const MOCK_IT_ADMIN = {
  id: 'usr-IT-001', email: 'it@gonep.co.ke', role: 'it_admin',
  first_name: 'David', last_name: 'Kimani', phone: '+254 722 999 000',
  specialty: null, facility: 'GONEP HQ', hospital_id: null, license: null,
};

export const MOCK_POS_USER = {
  id: 'pos-001', email: 'pos1@nairobi-general.co.ke', role: 'pos',
  first_name: 'Main Reception', last_name: 'Till', phone: null,
  specialty: null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001', license: null,
};

export const DEMO_ACCOUNTS = [
  { label: 'Hospital Admin',         role: 'hospital_admin',  user: MOCK_HOSPITAL_ADMIN  },
  { label: 'Doctor',                 role: 'doctor',          user: MOCK_DOCTOR          },
  { label: 'Billing Manager',        role: 'billing_manager', user: MOCK_BILLING_MANAGER },
  { label: 'Lab & Pharmacy Manager', role: 'lab_manager',     user: MOCK_LAB_MANAGER     },
  { label: 'Receptionist',           role: 'receptionist',    user: MOCK_RECEPTIONIST    },
  { label: 'POS Terminal',           role: 'pos',             user: MOCK_POS_USER        },
];

export const MOCK_STAFF = [
  { ...MOCK_HOSPITAL_ADMIN },
  { ...MOCK_DOCTOR },
  {
    id: 'usr-DOC-002', email: 'dr.ochieng@nairobi-general.co.ke', role: 'doctor',
    first_name: 'Dr. Kevin', last_name: 'Ochieng', phone: '+254 711 222 333',
    specialty: 'Cardiologist', facility: 'Nairobi General Hospital',
    hospital_id: 'hosp-001', license: 'KMA-CD-10284', affiliated_hospitals: ['hosp-001'],
  },
  { ...MOCK_BILLING_MANAGER },
  { ...MOCK_LAB_MANAGER },
  { ...MOCK_RECEPTIONIST },
];

// ─── Appointments ─────────────────────────────────────────────────────────────
export const MOCK_APPOINTMENTS = [
  { id: 'apt-001', patient: 'Faith Njoroge',  doctor_id: 'usr-DOC-001', age: 34, type: 'Home Visit',  time: '2:30 PM',  date: 'Today',      status: 'confirmed',  reason: 'BP follow-up',      phone: '+254 712 345 678' },
  { id: 'apt-002', patient: 'James Kamau',    doctor_id: 'usr-DOC-001', age: 52, type: 'Online',       time: '4:00 PM',  date: 'Today',      status: 'confirmed',  reason: 'Diabetes review',   phone: '+254 723 456 789' },
  { id: 'apt-003', patient: 'Mary Achieng',   doctor_id: 'usr-DOC-002', age: 29, type: 'In Facility',  time: '9:00 AM',  date: 'Tomorrow',   status: 'pending',    reason: 'General checkup',   phone: '+254 734 567 890' },
  { id: 'apt-004', patient: 'Peter Otieno',   doctor_id: 'usr-DOC-001', age: 41, type: 'Home Visit',   time: '11:00 AM', date: 'Thu, Mar 6', status: 'confirmed',  reason: 'Post-op follow-up', phone: '+254 745 678 901' },
  { id: 'apt-005', patient: 'Sarah Kamande',  doctor_id: null,           age: 27, type: 'In Facility',  time: '10:00 AM', date: 'Today',      status: 'unassigned', reason: 'First visit',       phone: '+254 756 789 012' },
];

// ─── Prescriptions ────────────────────────────────────────────────────────────
export const MOCK_PRESCRIPTIONS = [
  { id: 'rx-001', patient: 'Faith Njoroge', doctor_id: 'usr-DOC-001', drug: 'Amlodipine 5mg',    qty: 30, instructions: 'Once daily',  status: 'pending_dispatch', date: 'Today 2:35 PM' },
  { id: 'rx-002', patient: 'James Kamau',   doctor_id: 'usr-DOC-001', drug: 'Metformin 850mg',   qty: 60, instructions: 'Twice daily', status: 'dispatched',       date: 'Today 10:12 AM' },
  { id: 'rx-003', patient: 'Mary Achieng',  doctor_id: 'usr-DOC-002', drug: 'Amoxicillin 500mg', qty: 21, instructions: 'Three times', status: 'pending_dispatch', date: 'Yesterday' },
];

// ─── Patients / EMR ───────────────────────────────────────────────────────────
export const MOCK_PATIENTS = [
  { id: 'pat-001', name: 'Faith Njoroge', doctor_id: 'usr-DOC-001', age: 34, blood_group: 'O+',  gender: 'F', last_visit: 'Today',     conditions: ['Hypertension', 'Type 2 Diabetes'], allergies: ['Penicillin'], medications: ['Amlodipine 5mg'] },
  { id: 'pat-002', name: 'James Kamau',   doctor_id: 'usr-DOC-001', age: 52, blood_group: 'A+',  gender: 'M', last_visit: 'Yesterday', conditions: ['Diabetes', 'Obesity'],              allergies: [],            medications: ['Metformin 850mg'] },
  { id: 'pat-003', name: 'Mary Achieng',  doctor_id: 'usr-DOC-002', age: 29, blood_group: 'B+',  gender: 'F', last_visit: 'Mar 1',     conditions: ['Asthma'],                          allergies: ['Pollen'],    medications: [] },
  { id: 'pat-004', name: 'Peter Otieno',  doctor_id: 'usr-DOC-001', age: 41, blood_group: 'AB-', gender: 'M', last_visit: 'Feb 28',    conditions: ['Post-op recovery'],                allergies: [],            medications: [] },
];

// ─── Lab Results ──────────────────────────────────────────────────────────────
export const MOCK_LAB = [
  { id: 'lab-001', patient: 'Faith Njoroge', doctor_id: 'usr-DOC-001', test: 'HbA1c',               result: '6.8%',        range: '<6.5%',    status: 'high',     date: 'Today',     critical: false },
  { id: 'lab-002', patient: 'James Kamau',   doctor_id: 'usr-DOC-001', test: 'Fasting Blood Sugar',  result: '14.2 mmol/L', range: '3.9–6.1',  status: 'critical', date: 'Today',     critical: true  },
  { id: 'lab-003', patient: 'Mary Achieng',  doctor_id: 'usr-DOC-002', test: 'FBC — WBC',             result: '12.4 x10⁹/L', range: '4.0–10.0', status: 'high',     date: 'Yesterday', critical: false },
  { id: 'lab-004', patient: 'Peter Otieno',  doctor_id: 'usr-DOC-001', test: 'CRP',                   result: '0.4 mg/L',    range: '<1.0',     status: 'normal',   date: 'Feb 28',    critical: false },
];

// ─── Inventory (with per-item stock history) ──────────────────────────────────
// history entry: { date, action, qty_change (signed int), by }
export const MOCK_INVENTORY = [
  {
    id: 'inv-001', barcode: 'GONEP-001-12', name: 'Amlodipine 5mg', category: 'Cardiovascular',
    stock: 280, unit: 'tabs', unit_price: 12, reorder: 100, status: 'ok', ecommerce: true, active: true,
    barcode: '6001234000011', saved_discount: { type: 'percent', value: 0 }, item_discount: 0,
    barcode: 'GNP-INV-001', supplier_barcode: '5012345678900',
    default_discount: 0, max_discount: 20,
    history: [
      { date: 'Today 09:12',  action: 'Stock received',    qty_change:  50, by: 'Priya Sharma' },
      { date: 'Yesterday',    action: 'Dispensed via Rx',  qty_change:  -5, by: 'System'       },
      { date: 'Mar 18',       action: 'Stock adjustment',  qty_change:  -3, by: 'Priya Sharma' },
    ],
  },
  {
    id: 'inv-002', barcode: 'GONEP-002-08', name: 'Metformin 850mg', category: 'Diabetes',
    stock: 45, unit: 'tabs', unit_price: 8, reorder: 100, status: 'low', ecommerce: true, active: true,
    barcode: '6001234000028', saved_discount: { type: 'percent', value: 10 }, item_discount: 5,
    barcode: 'GNP-INV-002', supplier_barcode: '5012345678901',
    default_discount: 0, max_discount: 15,
    history: [
      { date: 'Mar 15', action: 'Stock received',   qty_change: 100, by: 'Priya Sharma' },
      { date: 'Mar 10', action: 'Dispensed via Rx', qty_change: -30, by: 'System'       },
    ],
  },
  {
    id: 'inv-003', barcode: 'GONEP-003-15', name: 'Amoxicillin 500mg', category: 'Antibiotics',
    stock: 0, unit: 'caps', unit_price: 15, reorder: 50, status: 'out', ecommerce: false, active: true,
    barcode: '6001234000035', saved_discount: { type: 'fixed', value: 0 }, item_discount: 0,
    barcode: 'GNP-INV-003', supplier_barcode: null,
    default_discount: 0, max_discount: 10,
    history: [
      { date: 'Mar 12', action: 'Dispensed via Rx',    qty_change: -21, by: 'System'       },
      { date: 'Mar 11', action: 'Expired — write-off', qty_change: -10, by: 'Priya Sharma' },
    ],
  },
  {
    id: 'inv-004', barcode: 'GONEP-004-05', name: 'Paracetamol 500mg', category: 'Pain Relief',
    stock: 620, unit: 'tabs', unit_price: 5, reorder: 200, status: 'ok', ecommerce: true, active: true,
    barcode: '6001234000042', saved_discount: { type: 'fixed', value: 5 }, item_discount: 10,
    barcode: 'GNP-INV-004', supplier_barcode: '5012345678903',
    default_discount: 5, max_discount: 25,
    history: [
      { date: 'Mar 10', action: 'Stock received',   qty_change: 400, by: 'Grace Muthoni' },
      { date: 'Mar 5',  action: 'Dispensed via Rx', qty_change: -20, by: 'System'        },
    ],
  },
  {
    id: 'inv-005', barcode: 'GONEP-005-18', name: 'Omeprazole 20mg', category: 'Gastro',
    stock: 90, unit: 'caps', unit_price: 18, reorder: 100, status: 'low', ecommerce: false, active: true,
    barcode: '6001234000059', saved_discount: { type: 'percent', value: 5 }, item_discount: 0,
    barcode: 'GNP-INV-005', supplier_barcode: null,
    default_discount: 0, max_discount: 20,
    history: [
      { date: 'Mar 14', action: 'Stock received',   qty_change:  50, by: 'Priya Sharma' },
      { date: 'Mar 12', action: 'Dispensed via Rx', qty_change: -10, by: 'System'       },
    ],
  },
];

// ─── Billing ──────────────────────────────────────────────────────────────────
export const MOCK_BILLING = [
  { id: 'inv-B001', patient: 'Faith Njoroge', amount: 'KSh 3,500', amount_raw: 3500, service: 'Home Visit',        status: 'paid',    date: 'Today',     method: 'M-Pesa'  },
  { id: 'inv-B002', patient: 'James Kamau',   amount: 'KSh 2,800', amount_raw: 2800, service: 'Online Consult',    status: 'pending', date: 'Today',     method: 'Invoice' },
  { id: 'inv-B003', patient: 'Mary Achieng',  amount: 'KSh 5,000', amount_raw: 5000, service: 'In-facility Visit', status: 'paid',    date: 'Yesterday', method: 'NHIF'    },
  { id: 'inv-B004', patient: 'Peter Otieno',  amount: 'KSh 8,200', amount_raw: 8200, service: 'Post-op Follow-up', status: 'overdue', date: 'Feb 28',    method: 'Invoice' },
];

// ─── Notifications ────────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  { id: 'n1', icon: 'alert-circle',    lib: 'feather', title: 'Critical Lab Result',   msg: 'James Kamau — Fasting Blood Sugar: 14.2 mmol/L (Critical)', time: 'Just now',  read: false, color: 'danger'  },
  { id: 'n2', icon: 'calendar',        lib: 'feather', title: 'Appointment Confirmed', msg: 'Faith Njoroge confirmed Home Visit for today at 2:30 PM',   time: '1 hr ago',  read: false, color: 'primary' },
  { id: 'n3', icon: 'package-variant', lib: 'mc',      title: 'Rx Ready for Dispatch', msg: 'Amlodipine 5mg for Faith Njoroge ready to dispatch',       time: '2 hr ago',  read: true,  color: 'warning' },
  { id: 'n4', icon: 'dollar-sign',     lib: 'feather', title: 'Payment Received',      msg: 'KSh 3,500 received from Faith Njoroge via M-Pesa',         time: 'Yesterday', read: true,  color: 'success' },
];

// ─── Doctor Availability ──────────────────────────────────────────────────────
// Slot duration rules: min 30 min, max 4 hrs, max 3 slots per day (≤12 hrs total).
// setBy: 'self' | 'receptionist' — if receptionist, doctor sees a warning banner.
export const MOCK_AVAILABILITY = {
  'usr-DOC-001': {
    doctor_id: 'usr-DOC-001',
    doctor_name: 'Dr. Amina Wanjiku',
    slots: [
      { id: 'sl-001', day: 'Mon', start: '08:00', end: '12:00', type: 'home_visit',  setBy: 'self' },
      { id: 'sl-002', day: 'Mon', start: '14:00', end: '16:00', type: 'in_facility', setBy: 'self' },
      { id: 'sl-003', day: 'Tue', start: '09:00', end: '13:00', type: 'in_facility', setBy: 'receptionist' },
      { id: 'sl-004', day: 'Wed', start: '08:00', end: '12:00', type: 'home_visit',  setBy: 'self' },
      { id: 'sl-005', day: 'Thu', start: '10:00', end: '14:00', type: 'in_facility', setBy: 'self' },
      { id: 'sl-006', day: 'Fri', start: '08:00', end: '12:00', type: 'home_visit',  setBy: 'self' },
    ],
    blocked_days: ['Sat', 'Sun'],
  },
  'usr-DOC-002': {
    doctor_id: 'usr-DOC-002',
    doctor_name: 'Dr. Kevin Ochieng',
    slots: [
      { id: 'sl-007', day: 'Mon', start: '09:00', end: '13:00', type: 'in_facility', setBy: 'self' },
      { id: 'sl-008', day: 'Wed', start: '09:00', end: '13:00', type: 'in_facility', setBy: 'self' },
      { id: 'sl-009', day: 'Fri', start: '08:00', end: '12:00', type: 'in_facility', setBy: 'receptionist' },
    ],
    blocked_days: ['Tue', 'Thu', 'Sat', 'Sun'],
  },
};

// ─── Activity Logs (admin-visible only) ───────────────────────────────────────
// module: 'Appointments' | 'Prescription' | 'Inventory' | 'Billing' | 'Staff' | 'EMR' | 'Availability'
export const MOCK_ACTIVITY_LOGS = [
  { id: 'log-001', ts: 'Today 09:41',     staff: 'Dr. Amina Wanjiku', staff_id: 'usr-DOC-001', role: 'doctor',          module: 'EMR',          action: 'Viewed patient record',   detail: 'Faith Njoroge — EMR opened',                   type: 'emr'          },
  { id: 'log-002', ts: 'Today 09:35',     staff: 'Dr. Amina Wanjiku', staff_id: 'usr-DOC-001', role: 'doctor',          module: 'Prescription',  action: 'Prescription written',    detail: 'Amlodipine 5mg × 30 for Faith Njoroge',         type: 'rx'           },
  { id: 'log-003', ts: 'Today 09:15',     staff: 'Janet Auma',        staff_id: 'usr-REC-001', role: 'receptionist',    module: 'Appointments',  action: 'Appointment created',     detail: 'Sarah Kamande booked — In-facility, Today',     type: 'appointments' },
  { id: 'log-004', ts: 'Today 09:12',     staff: 'Priya Sharma',      staff_id: 'usr-LM-001',  role: 'lab_manager',     module: 'Inventory',     action: 'Stock received',          detail: 'Amlodipine 5mg +50 units added',                 type: 'inventory'    },
  { id: 'log-005', ts: 'Today 08:50',     staff: 'Grace Muthoni',     staff_id: 'usr-HA-001',  role: 'hospital_admin',  module: 'Staff',         action: 'Account created',         detail: 'Dr. Kevin Ochieng added as Cardiologist',        type: 'staff'        },
  { id: 'log-006', ts: 'Today 08:30',     staff: 'Grace Muthoni',     staff_id: 'usr-HA-001',  role: 'hospital_admin',  module: 'Staff',         action: 'Login',                   detail: 'Admin session started',                          type: 'staff'        },
  { id: 'log-007', ts: 'Yesterday 16:20', staff: 'Priya Sharma',      staff_id: 'usr-LM-001',  role: 'lab_manager',     module: 'Prescription',  action: 'Rx dispatched',           detail: 'Metformin 850mg dispatched to James Kamau',      type: 'rx'           },
  { id: 'log-008', ts: 'Yesterday 15:45', staff: 'Samuel Otieno',     staff_id: 'usr-BM-001',  role: 'billing_manager', module: 'Billing',       action: 'Invoice marked paid',     detail: 'KSh 3,500 — Faith Njoroge — M-Pesa confirmed',   type: 'billing'      },
  { id: 'log-009', ts: 'Yesterday 14:10', staff: 'Dr. Amina Wanjiku', staff_id: 'usr-DOC-001', role: 'doctor',          module: 'Availability',  action: 'Schedule updated',        detail: 'Mon 14:00–16:00 In-facility slot added',         type: 'availability' },
  { id: 'log-010', ts: 'Yesterday 11:30', staff: 'Janet Auma',        staff_id: 'usr-REC-001', role: 'receptionist',    module: 'Availability',  action: 'Schedule set for doctor', detail: 'Dr. Kevin Ochieng — Fri 08:00–12:00',            type: 'availability' },
  { id: 'log-011', ts: 'Yesterday 10:00', staff: 'Samuel Otieno',     staff_id: 'usr-BM-001',  role: 'billing_manager', module: 'Billing',       action: 'Reminder sent',           detail: 'KSh 2,800 invoice — James Kamau notified',       type: 'billing'      },
  { id: 'log-012', ts: 'Mar 18 14:30',    staff: 'Priya Sharma',      staff_id: 'usr-LM-001',  role: 'lab_manager',     module: 'Inventory',     action: 'Stock reduced',           detail: 'Amoxicillin 500mg -10 units (write-off)',         type: 'inventory'    },
  { id: 'log-013', ts: 'Mar 18 09:00',    staff: 'Grace Muthoni',     staff_id: 'usr-HA-001',  role: 'hospital_admin',  module: 'Staff',         action: 'Account suspended',       detail: 'Dr. Kevin Ochieng — temporary suspension',       type: 'staff'        },
  { id: 'log-014', ts: 'Mar 17 11:00',    staff: 'Dr. Amina Wanjiku', staff_id: 'usr-DOC-001', role: 'doctor',          module: 'EMR',           action: 'Viewed patient record',   detail: 'James Kamau — EMR opened',                       type: 'emr'          },
  { id: 'log-015', ts: 'Mar 17 09:30',    staff: 'Janet Auma',        staff_id: 'usr-REC-001', role: 'receptionist',    module: 'Appointments',  action: 'Doctor assigned',         detail: 'Sarah Kamande assigned to Dr. Amina Wanjiku',    type: 'appointments' },
  { id: 'log-016', ts: 'Mar 16 16:00',    staff: 'Priya Sharma',      staff_id: 'usr-LM-001',  role: 'lab_manager',     module: 'Inventory',     action: 'New item added',          detail: 'Omeprazole 20mg added to formulary',             type: 'inventory'    },
];

// ─── Consultation notes (SOAP) ────────────────────────────────────────────────
// Linked to patient by patient_name. setBy: doctor who wrote it.
// created_at is ISO string used for 48-hr edit window check.
export const MOCK_CONSULTATIONS = [
  {
    id: 'con-001',
    patient_id: 'pat-001', patient_name: 'Faith Njoroge',
    doctor_id: 'usr-DOC-001', doctor_name: 'Dr. Amina Wanjiku',
    appointment_id: 'apt-001',
    date: 'Today', created_at: new Date().toISOString(),
    type: 'Home Visit',
    subjective:  'Patient reports persistent headaches and dizziness for 3 days. BP at home readings averaging 160/95.',
    objective:   'BP: 162/94 mmHg, Pulse: 78 bpm, Temp: 36.8°C, Weight: 72 kg. No oedema. Heart sounds normal.',
    assessment:  'Uncontrolled hypertension. Current medication dosage may need review.',
    plan:        'Increase Amlodipine to 10mg once daily. Repeat BP check in 1 week. Dietary sodium restriction advised. Referral to cardiologist if no improvement.',
    uploaded_files: [],
  },
  {
    id: 'con-002',
    patient_id: 'pat-001', patient_name: 'Faith Njoroge',
    doctor_id: 'usr-DOC-001', doctor_name: 'Dr. Amina Wanjiku',
    appointment_id: null,
    date: 'Mar 10', created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'In Facility',
    subjective:  'Routine diabetes review. Patient reports good compliance with Metformin. Occasional hypoglycaemic episodes in the morning.',
    objective:   'BP: 148/88 mmHg, Weight: 73 kg. HbA1c result: 6.8% (see lab). Fasting sugar: 7.2 mmol/L.',
    assessment:  'Type 2 Diabetes — reasonably controlled but morning hypos are a concern. Hypertension — stable.',
    plan:        'Continue Metformin 850mg twice daily. Advise light breakfast before morning dose. Review in 1 month.',
    uploaded_files: [{ name: 'BP_chart_march.pdf', url: '#', type: 'pdf' }],
  },
  {
    id: 'con-003',
    patient_id: 'pat-002', patient_name: 'James Kamau',
    doctor_id: 'usr-DOC-001', doctor_name: 'Dr. Amina Wanjiku',
    appointment_id: 'apt-002',
    date: 'Today', created_at: new Date().toISOString(),
    type: 'Online',
    subjective:  'Patient reports extreme thirst, frequent urination and fatigue for 2 days. Admits to skipping medication.',
    objective:   'Fasting Blood Sugar: 14.2 mmol/L (CRITICAL — see lab). Symptoms consistent with hyperglycaemia.',
    assessment:  'Hyperglycaemia secondary to non-compliance. Urgent intervention required.',
    plan:        'Resume Metformin immediately. Add Glibenclamide 5mg once daily. Strict dietary advice. Return to clinic in 48 hrs or present to A&E if symptoms worsen.',
    uploaded_files: [],
  },
  {
    id: 'con-004',
    patient_id: 'pat-003', patient_name: 'Mary Achieng',
    doctor_id: 'usr-DOC-002', doctor_name: 'Dr. Kevin Ochieng',
    appointment_id: 'apt-003',
    date: 'Mar 1', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'In Facility',
    subjective:  'Presents with shortness of breath on exertion, wheezing and dry cough for 1 week. History of asthma.',
    objective:   'Respiratory rate 22/min. Widespread bilateral wheeze on auscultation. O2 sat 96% on air. PEFR 310 L/min (predicted 480).',
    assessment:  'Moderate asthma exacerbation.',
    plan:        'Salbutamol 2.5mg nebulised, 3 doses. Prednisolone 30mg orally for 5 days. Review reliever inhaler technique. Return if no improvement in 48 hrs.',
    uploaded_files: [{ name: 'spirometry_results.pdf', url: '#', type: 'pdf' }],
  },
  {
    id: 'con-005',
    patient_id: 'pat-004', patient_name: 'Peter Otieno',
    doctor_id: 'usr-DOC-001', doctor_name: 'Dr. Amina Wanjiku',
    appointment_id: 'apt-004',
    date: 'Feb 28', created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    type: 'Home Visit',
    subjective:  'Post-operative follow-up after appendectomy. Patient reports wound site pain reducing. No fever. Eating and drinking normally.',
    objective:   'Wound site clean, no signs of infection. Sutures intact. BP 118/76, Temp 36.6°C, CRP 0.4 mg/L (normal).',
    assessment:  'Satisfactory post-operative recovery.',
    plan:        'Continue wound dressing every 2 days. Suture removal at day 10 post-op. Avoid strenuous activity for 4 weeks. Follow-up in 1 week.',
    uploaded_files: [{ name: 'discharge_summary.pdf', url: '#', type: 'pdf' }, { name: 'wound_photo.jpg', url: '#', type: 'image' }],
  },
];

// ─── Clinical settings (admin-configurable) ───────────────────────────────────
// edit_window_hours: max time after a consultation is created that it can be edited.
// Admins can change this from Settings. Logged to MOCK_ACTIVITY_LOGS on change.
export const MOCK_CLINICAL_SETTINGS = {
  edit_window_hours: 24, // default 24 hrs
  allowed_values: [1, 6, 12, 24, 48, 72], // hours the admin may choose from
};

// ─── Support tickets ──────────────────────────────────────────────────────────
// Status: 'open' | 'in_progress' | 'resolved' | 'closed'
// Priority: 'low' | 'medium' | 'high' | 'critical'
// visible_to: 'it_admin' only, or 'it_admin' + 'hospital_admin' of that facility
export const MOCK_SUPPORT_TICKETS = [
  {
    id: 'tkt-001', title: 'Cannot access lab results page',
    description: 'When clicking Lab Results in the sidebar the page loads but shows a blank white screen. Happens on Chrome and Edge. Started after the last update.',
    category: 'Bug', priority: 'high', status: 'open',
    raised_by: 'usr-DOC-001', raised_by_name: 'Dr. Amina Wanjiku', raised_by_role: 'doctor',
    facility: 'Nairobi General Hospital', created_at: new Date().toISOString(),
    responses: [],
  },
  {
    id: 'tkt-002', title: 'Inventory stock levels not updating after POS sale',
    description: 'After completing a sale through the POS terminal, the inventory page still shows the old stock number. Refreshing does not help.',
    category: 'Bug', priority: 'critical', status: 'in_progress',
    raised_by: 'usr-LM-001', raised_by_name: 'Priya Sharma', raised_by_role: 'lab_manager',
    facility: 'Nairobi General Hospital', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    responses: [
      { by: 'IT Admin', role: 'it_admin', ts: 'Today 08:30', text: 'Investigating — this looks like a cache invalidation issue. Will push a fix within 2 hours.' },
    ],
  },
  {
    id: 'tkt-003', title: 'Request: add export to CSV for billing records',
    description: 'It would help to be able to export all billing records for a month to CSV for external accounting software.',
    category: 'Feature Request', priority: 'low', status: 'open',
    raised_by: 'usr-BM-001', raised_by_name: 'Samuel Otieno', raised_by_role: 'billing_manager',
    facility: 'Nairobi General Hospital', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    responses: [],
  },
  {
    id: 'tkt-004', title: 'Password reset not working — email not received',
    description: 'Tried password reset 3 times. No email arrives in inbox or spam.',
    category: 'Access', priority: 'medium', status: 'resolved',
    raised_by: 'usr-REC-001', raised_by_name: 'Janet Auma', raised_by_role: 'receptionist',
    facility: 'Nairobi General Hospital', created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    responses: [
      { by: 'IT Admin', role: 'it_admin', ts: 'Yesterday', text: 'Fixed — there was a misconfigured SMTP rule. Password reset emails should now arrive within 60 seconds.' },
    ],
  },
];

// ─── POS accounts ─────────────────────────────────────────────────────────────
export const MOCK_POS_ACCOUNTS = [
  {
    id: 'pos-001', name: 'Main Reception Till',
    email: 'pos1@nairobi-general.co.ke', password_hint: 'Set by admin',
    facility: 'Nairobi General Hospital', hospital_id: 'hosp-001',
    role: 'pos', active: true, created_by: 'usr-HA-001',
    created_at: '2024-03-01',
  },
  {
    id: 'pos-002', name: 'Pharmacy Counter Till',
    email: 'pos2@nairobi-general.co.ke', password_hint: 'Set by admin',
    facility: 'Nairobi General Hospital', hospital_id: 'hosp-001',
    role: 'pos', active: true, created_by: 'usr-HA-001',
    created_at: '2024-03-10',
  },
];

// ─── POS transactions ─────────────────────────────────────────────────────────
export const MOCK_POS_TRANSACTIONS = [
  {
    id: 'pos-tx-001', pos_id: 'pos-001', cashier: 'Main Reception Till',
    items: [
      { id: 'inv-001', barcode: 'GONEP-001-12', name: 'Amlodipine 5mg', qty: 30, unit_price: 12, discount: 0, total: 360 },
      { id: 'inv-004', barcode: 'GONEP-004-05', name: 'Paracetamol 500mg', qty: 10, unit_price: 5, discount: 10, total: 45 },
    ],
    subtotal: 405, discount_total: 10, tax: 0, grand_total: 405,
    payment_method: 'M-Pesa', payment_ref: 'MP24031001',
    status: 'completed', created_at: new Date().toISOString(),
    receipt_no: 'RCP-2024-0301',
  },
  {
    id: 'pos-tx-002', pos_id: 'pos-002', cashier: 'Pharmacy Counter Till',
    items: [
      { id: 'inv-002', barcode: 'GONEP-002-08', name: 'Metformin 850mg', qty: 60, unit_price: 8, discount: 0, total: 480 },
    ],
    subtotal: 480, discount_total: 0, tax: 0, grand_total: 480,
    payment_method: 'Cash', payment_ref: null,
    status: 'completed', created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    receipt_no: 'RCP-2024-0302',
  },
];

// ─── Analytics data ───────────────────────────────────────────────────────────
export const MOCK_ANALYTICS = {
  revenue_over_time: [
    { label: 'Oct', clinic: 42000, website: 12000 },
    { label: 'Nov', clinic: 51000, website: 15000 },
    { label: 'Dec', clinic: 38000, website: 9000  },
    { label: 'Jan', clinic: 56000, website: 18000 },
    { label: 'Feb', clinic: 62000, website: 21000 },
    { label: 'Mar', clinic: 47000, website: 16000 },
  ],
  revenue_by_service: [
    { label: 'Home Visit',    value: 85000 },
    { label: 'In Facility',  value: 124000 },
    { label: 'Online Consult',value: 43000 },
    { label: 'POS Sales',    value: 67000 },
    { label: 'Website Sales',value: 91000 },
  ],
  billing_status: { paid: 18, pending: 6, overdue: 3 },
  inventory_value: [
    { label: 'Cardiovascular', value: 33600 },
    { label: 'Diabetes',       value: 3600  },
    { label: 'Pain Relief',    value: 31000 },
    { label: 'Gastro',         value: 16200 },
    { label: 'Antibiotics',    value: 0     },
  ],
  top_drugs: [
    { name: 'Amlodipine 5mg',    dispensed: 280, revenue: 3360  },
    { name: 'Paracetamol 500mg', dispensed: 200, revenue: 1000  },
    { name: 'Metformin 850mg',   dispensed: 120, revenue: 960   },
    { name: 'Omeprazole 20mg',   dispensed: 80,  revenue: 1440  },
  ],
  appointment_volume: [
    { label: 'Mon', count: 12 }, { label: 'Tue', count: 8  },
    { label: 'Wed', count: 15 }, { label: 'Thu', count: 11 },
    { label: 'Fri', count: 9  }, { label: 'Sat', count: 3  },
  ],
  website_earnings: {
    total: 91000, this_month: 16000,
    orders: 47, avg_order: 1936,
    top_products: [
      { name: 'Amlodipine 5mg',    orders: 18, revenue: 32400 },
      { name: 'Paracetamol 500mg', orders: 14, revenue: 7000  },
      { name: 'Omeprazole 20mg',   orders: 9,  revenue: 16200 },
    ],
  },
};
