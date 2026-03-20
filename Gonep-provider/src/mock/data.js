// ─── Hospital ───────────────────────────────────────────────────────────────
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

// ─── Users by role ──────────────────────────────────────────────────────────
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
// legacy alias
export const MOCK_PROVIDER = MOCK_DOCTOR;

export const DEMO_ACCOUNTS = [
  { label: 'Hospital Admin',         role: 'hospital_admin',  user: MOCK_HOSPITAL_ADMIN  },
  { label: 'Doctor',                 role: 'doctor',          user: MOCK_DOCTOR          },
  { label: 'Billing Manager',        role: 'billing_manager', user: MOCK_BILLING_MANAGER },
  { label: 'Lab & Pharmacy Manager', role: 'lab_manager',     user: MOCK_LAB_MANAGER     },
  { label: 'Receptionist',           role: 'receptionist',    user: MOCK_RECEPTIONIST    },
];

export const MOCK_STAFF = [
  { ...MOCK_DOCTOR },
  { id: 'usr-DOC-002', email: 'dr.ochieng@nairobi-general.co.ke', role: 'doctor',
    first_name: 'Dr. Kevin', last_name: 'Ochieng', phone: '+254 711 222 333',
    specialty: 'Cardiologist', facility: 'Nairobi General Hospital',
    hospital_id: 'hosp-001', license: 'KMA-CD-10284', affiliated_hospitals: ['hosp-001'] },
  { ...MOCK_BILLING_MANAGER },
  { ...MOCK_LAB_MANAGER },
  { ...MOCK_RECEPTIONIST },
];

export const MOCK_APPOINTMENTS = [
  { id: 'apt-001', patient: 'Faith Njoroge',  doctor_id: 'usr-DOC-001', age: 34, type: 'Home Visit',  time: '2:30 PM', date: 'Today',      status: 'confirmed',  reason: 'BP follow-up',      phone: '+254 712 345 678' },
  { id: 'apt-002', patient: 'James Kamau',    doctor_id: 'usr-DOC-001', age: 52, type: 'Online',       time: '4:00 PM', date: 'Today',      status: 'confirmed',  reason: 'Diabetes review',   phone: '+254 723 456 789' },
  { id: 'apt-003', patient: 'Mary Achieng',   doctor_id: 'usr-DOC-002', age: 29, type: 'In Facility',  time: '9:00 AM', date: 'Tomorrow',   status: 'pending',    reason: 'General checkup',   phone: '+254 734 567 890' },
  { id: 'apt-004', patient: 'Peter Otieno',   doctor_id: 'usr-DOC-001', age: 41, type: 'Home Visit',   time: '11:00 AM',date: 'Thu, Mar 6', status: 'confirmed',  reason: 'Post-op follow-up', phone: '+254 745 678 901' },
  { id: 'apt-005', patient: 'Sarah Kamande',  doctor_id: null,           age: 27, type: 'In Facility',  time: '10:00 AM',date: 'Today',      status: 'unassigned', reason: 'First visit',       phone: '+254 756 789 012' },
];

export const MOCK_PRESCRIPTIONS = [
  { id: 'rx-001', patient: 'Faith Njoroge', doctor_id: 'usr-DOC-001', drug: 'Amlodipine 5mg',    qty: 30, instructions: 'Once daily',  status: 'pending_dispatch', date: 'Today 2:35 PM' },
  { id: 'rx-002', patient: 'James Kamau',   doctor_id: 'usr-DOC-001', drug: 'Metformin 850mg',   qty: 60, instructions: 'Twice daily', status: 'dispatched',        date: 'Today 10:12 AM' },
  { id: 'rx-003', patient: 'Mary Achieng',  doctor_id: 'usr-DOC-002', drug: 'Amoxicillin 500mg', qty: 21, instructions: 'Three times', status: 'pending_dispatch', date: 'Yesterday' },
];

export const MOCK_PATIENTS = [
  { id: 'pat-001', name: 'Faith Njoroge', doctor_id: 'usr-DOC-001', age: 34, blood_group: 'O+',  gender: 'F', last_visit: 'Today',     conditions: ['Hypertension', 'Type 2 Diabetes'] },
  { id: 'pat-002', name: 'James Kamau',   doctor_id: 'usr-DOC-001', age: 52, blood_group: 'A+',  gender: 'M', last_visit: 'Yesterday', conditions: ['Diabetes', 'Obesity'] },
  { id: 'pat-003', name: 'Mary Achieng',  doctor_id: 'usr-DOC-002', age: 29, blood_group: 'B+',  gender: 'F', last_visit: 'Mar 1',     conditions: ['Asthma'] },
  { id: 'pat-004', name: 'Peter Otieno',  doctor_id: 'usr-DOC-001', age: 41, blood_group: 'AB-', gender: 'M', last_visit: 'Feb 28',    conditions: ['Post-op recovery'] },
];

export const MOCK_LAB = [
  { id: 'lab-001', patient: 'Faith Njoroge', doctor_id: 'usr-DOC-001', test: 'HbA1c',              result: '6.8%',        range: '<6.5%',   status: 'high',     date: 'Today',     critical: false },
  { id: 'lab-002', patient: 'James Kamau',   doctor_id: 'usr-DOC-001', test: 'Fasting Blood Sugar', result: '14.2 mmol/L', range: '3.9–6.1', status: 'critical', date: 'Today',     critical: true  },
  { id: 'lab-003', patient: 'Mary Achieng',  doctor_id: 'usr-DOC-002', test: 'FBC — WBC',           result: '12.4 x10⁹/L',range: '4.0–10.0',status: 'high',     date: 'Yesterday', critical: false },
  { id: 'lab-004', patient: 'Peter Otieno',  doctor_id: 'usr-DOC-001', test: 'CRP',                 result: '0.4 mg/L',    range: '<1.0',    status: 'normal',   date: 'Feb 28',    critical: false },
];

export const MOCK_INVENTORY = [
  { id: 'inv-001', name: 'Amlodipine 5mg',    category: 'Cardiovascular', stock: 280, unit: 'tabs', reorder: 100, status: 'ok',  ecommerce: true  },
  { id: 'inv-002', name: 'Metformin 850mg',   category: 'Diabetes',       stock: 45,  unit: 'tabs', reorder: 100, status: 'low', ecommerce: true  },
  { id: 'inv-003', name: 'Amoxicillin 500mg', category: 'Antibiotics',    stock: 0,   unit: 'caps', reorder: 50,  status: 'out', ecommerce: false },
  { id: 'inv-004', name: 'Paracetamol 500mg', category: 'Pain Relief',    stock: 620, unit: 'tabs', reorder: 200, status: 'ok',  ecommerce: true  },
  { id: 'inv-005', name: 'Omeprazole 20mg',   category: 'Gastro',         stock: 90,  unit: 'caps', reorder: 100, status: 'low', ecommerce: false },
];

export const MOCK_BILLING = [
  { id: 'inv-B001', patient: 'Faith Njoroge', amount: 'KSh 3,500', service: 'Home Visit',        status: 'paid',    date: 'Today',     method: 'M-Pesa'  },
  { id: 'inv-B002', patient: 'James Kamau',   amount: 'KSh 2,800', service: 'Online Consult',    status: 'pending', date: 'Today',     method: 'Invoice' },
  { id: 'inv-B003', patient: 'Mary Achieng',  amount: 'KSh 5,000', service: 'In-facility Visit', status: 'paid',    date: 'Yesterday', method: 'NHIF'    },
  { id: 'inv-B004', patient: 'Peter Otieno',  amount: 'KSh 8,200', service: 'Post-op Follow-up', status: 'overdue', date: 'Feb 28',    method: 'Invoice' },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', icon: 'alert-circle',    lib: 'feather', title: 'Critical Lab Result',   msg: 'James Kamau — Fasting Blood Sugar: 14.2 mmol/L (Critical)', time: 'Just now',  read: false, color: 'danger'  },
  { id: 'n2', icon: 'calendar',        lib: 'feather', title: 'Appointment Confirmed', msg: 'Faith Njoroge confirmed Home Visit for today at 2:30 PM',   time: '1 hr ago',  read: false, color: 'primary' },
  { id: 'n3', icon: 'package-variant', lib: 'mc',      title: 'Rx Ready for Dispatch', msg: 'Amlodipine 5mg for Faith Njoroge ready to dispatch',       time: '2 hr ago',  read: true,  color: 'warning' },
  { id: 'n4', icon: 'dollar-sign',     lib: 'feather', title: 'Payment Received',      msg: 'KSh 3,500 received from Faith Njoroge via M-Pesa',         time: 'Yesterday', read: true,  color: 'success' },
];
