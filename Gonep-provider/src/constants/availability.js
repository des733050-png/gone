// ─── constants/availability.js ───────────────────────────────────────────────

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Slot types must match patient/provider booking types (In Facility / Home
// Visit / Virtual). The previous "chat" option is renamed to "virtual" so
// the availability calendar lines up with the booking flow.
export const SLOT_TYPES = [
  { value: 'in_facility', label: 'In Facility' },
  { value: 'home_visit',  label: 'Home Visit'  },
  { value: 'virtual',     label: 'Virtual'     },
];

export const slotTypeColor = (type, C) => {
  if (type === 'in_facility') return { bg: C.primaryLight, text: C.primary };
  if (type === 'home_visit')  return { bg: C.successLight, text: C.success };
  if (type === 'virtual' || type === 'chat')
    return { bg: C.purpleLight, text: C.purple };
  return { bg: C.primaryLight, text: C.primary };
};

export const slotDurationMins = (start, end) => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

export const dayTotalMins = (slots, day) =>
  slots
    .filter(s => s.day === day)
    .reduce((acc, s) => acc + slotDurationMins(s.start, s.end), 0);
