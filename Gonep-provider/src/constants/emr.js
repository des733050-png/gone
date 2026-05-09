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

// ─── Metadata stripping ───────────────────────────────────────────────────────

/**
 * Appointment `reason` fields can contain embedded audit tokens appended by the
 * backend: RESCHEDULE|…, CANCEL_META|…, REJECT|…
 *
 * Format examples:
 *   "Patient-initiated test booking REJECT|reason=no availability REJECT|reason=Rejected by provider"
 *   "CANCEL_META|by=Faith Njoroge|reason=Travel conflict RESCHEDULE|by=Grace Muthoni|at=…|to=…|type=…"
 *   " RESCHEDULE|by=Grace Muthoni|at=2026-05-09T14:11:15+00:00|to=2026-05-27T15:00:00+00:00|type=Home Visit"
 *   "helloworld again we are above everything else"   ← plain, untouched
 *
 * This function returns only the human-readable prefix that appears BEFORE the
 * first metadata keyword, or null if nothing clean remains.
 *
 * Why a prefix-slice instead of a global replace:
 *   Metadata tokens use "|" as a key=value delimiter.  Values can contain
 *   spaces (e.g. "by=Faith Njoroge"), so a regex that stops at whitespace
 *   splits the token mid-value and leaves orphaned fragments like
 *   "Muthoni|at=2026-…" in the output.  Slicing at the first keyword boundary
 *   eliminates the entire tail in one step regardless of how many tokens follow.
 */
export function stripApptMetadata(raw) {
  if (!raw) return null;
  // Find the position of the first metadata keyword followed immediately by "|"
  // Keywords are always ALL-CAPS and always directly adjacent to the pipe.
  const match = raw.match(/(?:^|\s)(RESCHEDULE|CANCEL_META|REJECT)\|/);
  const prefix = match
    ? raw.slice(0, match.index).trim()   // everything before the first keyword
    : raw.trim();                         // no metadata — return as-is
  return prefix || null;
}

/**
 * Derive a display label for an appointment from potentially polluted fields.
 * Priority: clean reason → consultation type → fallback string.
 */
export function apptDisplayReason(appt) {
  const clean = stripApptMetadata(appt?.reason);
  if (clean) return clean;
  if (appt?.type) return appt.type;
  return 'Appointment';
}

/**
 * Parse the mixed date formats stored across timeline item types into a
 * reliable millisecond timestamp suitable for numeric comparison/sorting.
 *
 * Handles:
 *   "Today"                     → Date.now()
 *   "Yesterday"                 → now − 24 h
 *   ISO strings                 → Date.parse() directly
 *   "Mon, Jun 15"               → current-year assumption
 *   "Fri, Apr 17 6:04 PM"       → current-year assumption
 *   Anything unrecognised       → 0
 */
export function parseTimelineDate(raw) {
  if (!raw) return 0;
  const str = String(raw).trim();

  if (str === 'Today')     return Date.now();
  if (str === 'Yesterday') return Date.now() - 24 * 60 * 60 * 1000;

  // Try direct parse first (covers ISO, RFC-2822, etc.)
  const direct = Date.parse(str);
  if (!isNaN(direct)) return direct;

  // Strip leading "Mon, " / "Fri, " weekday token and retry with a year injected
  const withoutWeekday = str.replace(/^[A-Za-z]{3},\s*/, '');
  const year = new Date().getFullYear();
  const candidate = Date.parse(`${withoutWeekday} ${year}`);
  if (!isNaN(candidate)) {
    // If the date is implausibly far in the future (>30 days) it's probably last year
    if (candidate - Date.now() > 30 * 24 * 60 * 60 * 1000) {
      const prev = Date.parse(`${withoutWeekday} ${year - 1}`);
      return isNaN(prev) ? candidate : prev;
    }
    return candidate;
  }

  return 0;
}