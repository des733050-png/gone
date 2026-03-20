export const MOCK_PROVIDER = {
  id: 'usr-003',
  email: 'provider@Gonep.co.ke',
  role: 'provider',
  first_name: 'Dr. Amina',
  last_name: 'Wanjiku',
  phone: '+254 722 111 222',
  specialty: 'General Physician',
  facility: 'Nairobi General Hospital',
  license: 'KMA-GP-20392',
};

export const MOCK_APPOINTMENTS = [
  { id: 'apt-001', patient: 'Faith Njoroge',  age: 34, type: 'Home Visit', time: '2:30 PM', date: 'Today',         status: 'confirmed', reason: 'BP follow-up',       phone: '+254 712 345 678' },
  { id: 'apt-002', patient: 'James Kamau',    age: 52, type: 'Online',     time: '4:00 PM', date: 'Today',         status: 'confirmed', reason: 'Diabetes review',    phone: '+254 723 456 789' },
  { id: 'apt-003', patient: 'Mary Achieng',   age: 29, type: 'In Facility',time: '9:00 AM', date: 'Tomorrow',      status: 'pending',   reason: 'General checkup',   phone: '+254 734 567 890' },
  { id: 'apt-004', patient: 'Peter Otieno',   age: 41, type: 'Home Visit', time: '11:00 AM',date: 'Thu, Mar 6',    status: 'confirmed', reason: 'Post-op follow-up',  phone: '+254 745 678 901' },
];

export const MOCK_PRESCRIPTIONS = [
  { id: 'rx-001', patient: 'Faith Njoroge',  drug: 'Amlodipine 5mg',   qty: 30, instructions: 'Once daily',  status: 'pending_dispatch', date: 'Today 2:35 PM' },
  { id: 'rx-002', patient: 'James Kamau',    drug: 'Metformin 850mg',  qty: 60, instructions: 'Twice daily', status: 'dispatched',        date: 'Today 10:12 AM' },
  { id: 'rx-003', patient: 'Mary Achieng',   drug: 'Amoxicillin 500mg',qty: 21, instructions: 'Three times', status: 'pending_dispatch', date: 'Yesterday' },
];

export const MOCK_PATIENTS = [
  { id: 'pat-001', name: 'Faith Njoroge',  age: 34, blood_group: 'O+',  gender: 'F', last_visit: 'Today',      conditions: ['Hypertension', 'Type 2 Diabetes'] },
  { id: 'pat-002', name: 'James Kamau',    age: 52, blood_group: 'A+',  gender: 'M', last_visit: 'Yesterday',  conditions: ['Diabetes', 'Obesity'] },
  { id: 'pat-003', name: 'Mary Achieng',   age: 29, blood_group: 'B+',  gender: 'F', last_visit: 'Mar 1',      conditions: ['Asthma'] },
  { id: 'pat-004', name: 'Peter Otieno',   age: 41, blood_group: 'AB-', gender: 'M', last_visit: 'Feb 28',     conditions: ['Post-op recovery'] },
];

export const MOCK_LAB = [
  { id: 'lab-001', patient: 'Faith Njoroge', test: 'HbA1c',              result: '6.8%',       range: '<6.5%',      status: 'high',   date: 'Today',     critical: false },
  { id: 'lab-002', patient: 'James Kamau',   test: 'Fasting Blood Sugar',result: '14.2 mmol/L',range: '3.9–6.1',    status: 'critical',date: 'Today',    critical: true  },
  { id: 'lab-003', patient: 'Mary Achieng',  test: 'FBC — WBC',          result: '12.4 x10⁹/L',range: '4.0–10.0',  status: 'high',   date: 'Yesterday', critical: false },
  { id: 'lab-004', patient: 'Peter Otieno',  test: 'CRP',                result: '0.4 mg/L',   range: '<1.0',       status: 'normal', date: 'Feb 28',    critical: false },
];

export const MOCK_INVENTORY = [
  { id: 'inv-001', name: 'Amlodipine 5mg',    category: 'Cardiovascular', stock: 280, unit: 'tabs',   reorder: 100, status: 'ok' },
  { id: 'inv-002', name: 'Metformin 850mg',   category: 'Diabetes',       stock: 45,  unit: 'tabs',   reorder: 100, status: 'low' },
  { id: 'inv-003', name: 'Amoxicillin 500mg', category: 'Antibiotics',    stock: 0,   unit: 'caps',   reorder: 50,  status: 'out' },
  { id: 'inv-004', name: 'Paracetamol 500mg', category: 'Pain Relief',    stock: 620, unit: 'tabs',   reorder: 200, status: 'ok' },
  { id: 'inv-005', name: 'Omeprazole 20mg',   category: 'Gastro',         stock: 90,  unit: 'caps',   reorder: 100, status: 'low' },
];

export const MOCK_BILLING = [
  { id: 'inv-B001', patient: 'Faith Njoroge', amount: 'KSh 3,500', service: 'Home Visit',        status: 'paid',    date: 'Today',     method: 'M-Pesa' },
  { id: 'inv-B002', patient: 'James Kamau',   amount: 'KSh 2,800', service: 'Online Consult',    status: 'pending', date: 'Today',     method: 'Invoice' },
  { id: 'inv-B003', patient: 'Mary Achieng',  amount: 'KSh 5,000', service: 'In-facility Visit', status: 'paid',    date: 'Yesterday', method: 'NHIF' },
  { id: 'inv-B004', patient: 'Peter Otieno',  amount: 'KSh 8,200', service: 'Post-op Follow-up', status: 'overdue', date: 'Feb 28',    method: 'Invoice' },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', icon: 'alert-circle',   lib: 'feather', title: 'Critical Lab Result', msg: 'James Kamau — Fasting Blood Sugar: 14.2 mmol/L (Critical)', time: 'Just now',  read: false, color: 'danger' },
  { id: 'n2', icon: 'calendar',       lib: 'feather', title: 'Appointment Confirmed', msg: 'Faith Njoroge confirmed Home Visit for today at 2:30 PM',   time: '1 hr ago',  read: false, color: 'primary' },
  { id: 'n3', icon: 'package-variant',lib: 'mc',      title: 'Rx Ready for Dispatch', msg: 'Amlodipine 5mg for Faith Njoroge ready to dispatch',        time: '2 hr ago',  read: true,  color: 'warning' },
  { id: 'n4', icon: 'dollar-sign',    lib: 'feather', title: 'Payment Received', msg: 'KSh 3,500 received from Faith Njoroge via M-Pesa',              time: 'Yesterday', read: true,  color: 'success' },
];
