// ─── constants/availability.js ───────────────────────────────────────────────

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SLOT_TYPES = [
  { value: 'in_facility', label: 'In-facility' },
  { value: 'home_visit',  label: 'Home visit'  },
  { value: 'chat',        label: 'Chat / text' },
];

export const slotTypeColor = (type, C) => {
  if (type === 'in_facility') return { bg: C.primaryLight, text: C.primary };
  if (type === 'home_visit')  return { bg: C.successLight, text: C.success };
  if (type === 'chat')        return { bg: C.purpleLight,  text: C.purple  };
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
