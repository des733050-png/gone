export const MOCK_USER = {
  id: 'usr-001',
  email: 'patient@Gonep.co.ke',
  role: 'patient',
  first_name: 'Faith',
  last_name: 'Njoroge',
  phone: '+254 712 345 678',
  blood_group: 'O+',
  allergies: ['Penicillin'],
  gender: 'Female',
  age: 34,
  date_of_birth: '1992-04-15',
  address: '14 Riverside Drive, Lavington, Nairobi',
  insurance: 'NHIF · No. NHIF-1234567',
  emergency: 'James Njoroge · +254 723 456 789',
};

export const MOCK_APPOINTMENTS = [
  {
    id: 'apt-001',
    doctor: 'Dr. Amina Wanjiku',
    specialty: 'General Physician',
    type: 'Home Visit',
    date: 'Today',
    time: '2:30 PM',
    status: 'confirmed',
    fee: 'KSh 3,500',
    facility: 'Nairobi General',
    reason: 'Follow-up for blood pressure and general review.',
    address: '14 Riverside Drive, Lavington, Nairobi',
    can_reschedule: true,
  },
  {
    id: 'apt-002',
    doctor: 'Dr. James Ochieng',
    specialty: 'Pharmacist Consult',
    type: 'Online',
    date: 'Thu, Mar 7',
    time: '10:00 AM',
    status: 'pending',
    fee: 'KSh 1,500',
    facility: 'Westlands Medical',
    reason: 'Medication review and side-effect check.',
    address: 'Video call · GONEP Patient Portal',
    can_reschedule: true,
  },
];

export const MOCK_ORDERS = [
  {
    id: 'ORD-001',
    status: 'in_transit',
    eta: '~12 mins',
    items: [
      { name: 'Amoxicillin 500mg', qty: 2 },
      { name: 'Paracetamol 500mg', qty: 1 },
    ],
    placedAt: 'Today · 1:55 PM',
    rider_name: 'Kevin Mwangi',
    rider_rating: 4.9,
  },
  {
    id: 'ORD-000',
    status: 'delivered',
    eta: 'Delivered',
    items: [{ name: 'Vitamin D3 1000IU', qty: 1 }],
    placedAt: 'Feb 20, 2026 · 3:10 PM',
    rider_name: 'Jane Doe',
    rider_rating: 4.7,
  },
];

export const MOCK_RECORDS = [
  {
    id: 'rec-001',
    type: 'Lab Result',
    title: 'Full Blood Count + HbA1c',
    date: 'Feb 20, 2026',
    provider: 'Nairobi General Hospital',
    icon: 'flask-outline',
    color: '#06B6D4',
  },
  {
    id: 'rec-002',
    type: 'Prescription',
    title: 'Hypertension Management Rx',
    date: 'Feb 10, 2026',
    provider: 'Dr. Amina Wanjiku',
    icon: 'pill',
    color: '#1A6FE8',
  },
];

export const MOCK_VITALS = [
  { id: 'hr', label: 'Heart Rate', value: '72 bpm', trend: 'Stable', icon: { lib: 'feather', name: 'activity' } },
  { id: 'bp', label: 'Blood Pressure', value: '122/80', trend: 'Controlled', icon: { lib: 'mc', name: 'water' } },
  { id: 'spo2', label: 'SpO2', value: '98%', trend: 'Normal', icon: { lib: 'feather', name: 'feather' } },
  { id: 'bmi', label: 'BMI', value: '23.1', trend: 'Healthy range', icon: { lib: 'mc', name: 'human' } },
];

export const MOCK_CHAT_THREAD = [
  { id: 'm1', from: 'doctor', text: 'Hi Faith, how are you feeling after your last visit?', time: '2:10 PM' },
  { id: 'm2', from: 'patient', text: 'I am feeling much better, just mild headaches in the evening.', time: '2:12 PM' },
  { id: 'm3', from: 'doctor', text: 'Great to hear. Please continue with the meds and drink plenty of water.', time: '2:13 PM' },
];

export const MOCK_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Appointment confirmed',
    body: 'Your home visit with Dr. Amina is confirmed for Today at 2:30 PM.',
    time: 'Just now',
    icon: { lib: 'feather', name: 'calendar' },
    read: false,
  },
  {
    id: 'n2',
    title: 'Order on the way',
    body: 'Rider Kevin has picked up your medicines and is heading to your address.',
    time: '12 min ago',
    icon: { lib: 'mc', name: 'truck-delivery' },
    read: false,
  },
  {
    id: 'n3',
    title: 'Prescription uploaded',
    body: 'Your new prescription from Dr. Amina is now available in Medical Records.',
    time: 'Yesterday',
    icon: { lib: 'mc', name: 'file-document-outline' },
    read: true,
  },
];

