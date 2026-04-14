// ─── constants/emr.js ────────────────────────────────────────────────────────

export const CONSULTATION_TYPES = ['In Facility', 'Home Visit', 'Online', 'Chat'];

export const SOAP_FIELDS = [
  { key: 'S', label: 'Subjective *',  field: 'subjective', ph: 'Chief complaint, history, patient-reported symptoms…', required: true  },
  { key: 'O', label: 'Objective',     field: 'objective',  ph: 'Vital signs, examination findings, test results…',   required: false },
  { key: 'A', label: 'Assessment *',  field: 'assessment', ph: 'Diagnosis, differential diagnoses…',                 required: true  },
  { key: 'P', label: 'Plan',          field: 'plan',       ph: 'Treatment, medications, follow-up, referrals…',       required: false },
];

export const TIMELINE_TYPE_META = {
  consultation: { name: 'file-text',     lib: 'feather', colorKey: 'primary' },
  lab:          { name: 'flask-outline', lib: 'mc',      colorKey: 'warning' },
  rx:           { name: 'pill',          lib: 'mc',      colorKey: 'success' },
  appointment:  { name: 'calendar',      lib: 'feather', colorKey: 'primary' },
};

export const TIMELINE_TYPE_LABEL = {
  consultation: 'Consultation',
  lab:          'Lab result',
  rx:           'Prescription',
  appointment:  'Appointment',
};

/** Returns per-role capability flags for the patient detail view */
export function roleCapabilities(role) {
  return {
    canSeeSoap:    role === 'hospital_admin' || role === 'doctor',
    canAddNote:    role === 'doctor',
    canEditRx:     role === 'doctor',
    canSeeLab:     role !== 'billing_manager',
    canSeeBilling: role === 'hospital_admin' || role === 'billing_manager',
    canSeeAppts:   role !== 'billing_manager',
  };
}

/** Returns true if the ISO timestamp is within `windowHours` hours of now */
export const isWithinWindow = (isoString, windowHours) => {
  const created = new Date(isoString);
  return (Date.now() - created.getTime()) < windowHours * 60 * 60 * 1000;
};
