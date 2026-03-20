export const MOCK_RIDER = {
  id: 'usr-002',
  email: 'rider@Gonep.co.ke',
  role: 'rider',
  first_name: 'Kevin',
  last_name: 'Mwangi',
  phone: '+254 734 567 890',
  rating: 4.9,
  total_trips: 342,
  status: 'active',
  vehicle: 'Motorcycle · KBZ 234X',
  joined: 'Jan 2024',
  zone: 'Nairobi Central',
  bank: 'Equity Bank · ****4521',
};

export const MOCK_REQUESTS = [
  {
    id: 'REQ-001',
    patient: 'Faith Njoroge',
    address: '14 Riverside Drive, Lavington',
    distance: '2.4 km',
    eta: '~8 min',
    items: ['Amoxicillin 500mg x2', 'Paracetamol x1'],
    pharmacy: 'Westlands Pharmacy',
    payout: 'KSh 180',
    status: 'pending',
    placed_at: 'Just now',
  },
  {
    id: 'REQ-002',
    patient: 'James Kamau',
    address: '3 Kiambu Road, Muthaiga',
    distance: '5.1 km',
    eta: '~15 min',
    items: ['Insulin Pen x1', 'Test Strips x1'],
    pharmacy: 'Nairobi Pharmacy',
    payout: 'KSh 320',
    status: 'pending',
    placed_at: '2 min ago',
  },
];

export const MOCK_ACTIVE_DELIVERY = {
  id: 'DEL-007',
  order_id: 'ORD-001',
  patient: 'Faith Njoroge',
  phone: '+254 712 345 678',
  address: '14 Riverside Drive, Lavington, Nairobi',
  items: ['Amoxicillin 500mg x2', 'Paracetamol x1'],
  payout: 'KSh 180',
  pharmacy: 'Westlands Pharmacy',
  pickup_address: 'Westlands Mall, 2nd Floor',
  step: 2, // 0=heading to pharmacy, 1=picked up, 2=en route, 3=delivered
  started_at: '2:15 PM',
};

export const MOCK_EARNINGS = {
  today: 1420,
  this_week: 7850,
  this_month: 28400,
  pending_payout: 5600,
  daily: [
    { day: 'Mon', amount: 1200 },
    { day: 'Tue', amount: 980 },
    { day: 'Wed', amount: 1540 },
    { day: 'Thu', amount: 870 },
    { day: 'Fri', amount: 1840 },
    { day: 'Sat', amount: 1420 },
    { day: 'Sun', amount: 0 },
  ],
};

export const MOCK_TRIPS = [
  {
    id: 'TRP-101',
    patient: 'Faith Njoroge',
    address: '14 Riverside Drive, Lavington',
    date: 'Today · 2:45 PM',
    distance: '2.4 km',
    duration: '12 min',
    payout: 'KSh 180',
    rating: 5,
    status: 'completed',
  },
  {
    id: 'TRP-100',
    patient: 'James Kamau',
    address: '3 Kiambu Road, Muthaiga',
    date: 'Today · 12:10 PM',
    distance: '5.1 km',
    duration: '22 min',
    payout: 'KSh 320',
    rating: 5,
    status: 'completed',
  },
  {
    id: 'TRP-099',
    patient: 'Mary Achieng',
    address: '7 Ngong Road, Karen',
    date: 'Yesterday · 4:30 PM',
    distance: '8.2 km',
    duration: '34 min',
    payout: 'KSh 480',
    rating: 4,
    status: 'completed',
  },
  {
    id: 'TRP-098',
    patient: 'Peter Otieno',
    address: '21 Kenyatta Ave, CBD',
    date: 'Yesterday · 10:00 AM',
    distance: '3.7 km',
    duration: '18 min',
    payout: 'KSh 240',
    rating: 5,
    status: 'completed',
  },
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', icon: 'bell', lib: 'feather', title: 'New Request', msg: 'New delivery request in Lavington — KSh 180', time: 'Just now', read: false, color: 'warning' },
  { id: 'n2', icon: 'check-circle', lib: 'feather', title: 'Payout Sent', msg: 'KSh 5,600 payout sent to Equity Bank ****4521', time: '1 hr ago', read: false, color: 'success' },
  { id: 'n3', icon: 'star', lib: 'feather', title: 'New Rating', msg: 'Faith Njoroge rated you 5 stars ⭐⭐⭐⭐⭐', time: 'Yesterday', read: true, color: 'primary' },
];

export const MOCK_MESSAGES = [
  { id: 'm1', from: 'patient', name: 'Faith Njoroge', text: 'Hi, how far are you?', time: '2:30 PM' },
  { id: 'm2', from: 'rider',   name: 'Kevin M.',     text: 'Almost there, 3 minutes away!', time: '2:31 PM' },
  { id: 'm3', from: 'patient', name: 'Faith Njoroge', text: 'Great, I will be at the gate.', time: '2:31 PM' },
];
