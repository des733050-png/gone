const STORAGE_KEY = 'gonep_patient_dismissed_attendance_alerts_v1';
const DISMISSED_ALERT_IDS = new Set();

function loadDismissedIds() {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return;
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    parsed.forEach((id) => {
      if (typeof id === 'string' && id) DISMISSED_ALERT_IDS.add(id);
    });
  } catch {
    // Ignore storage parsing failures to avoid blocking alerts.
  }
}

function persistDismissedIds() {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(DISMISSED_ALERT_IDS)));
  } catch {
    // Ignore storage write failures (private mode/quota).
  }
}

loadDismissedIds();

export function buildAttendanceNotifications(appointments = []) {
  return (appointments || [])
    .filter((item) => item?.attendance_due)
    .map((item) => ({
      id: `appt-alert-${item.id}`,
      title: 'Appointment ready to attend',
      body: `${item.doctor || 'Gonep team'} is ready for your ${item.type || 'appointment'} now.`,
      time: 'Now',
      icon: { lib: 'feather', name: 'calendar' },
      read: false,
      synthetic: true,
    }))
    .filter((item) => !DISMISSED_ALERT_IDS.has(item.id));
}

export function dismissAttendanceNotification(alertId) {
  if (!alertId) return;
  DISMISSED_ALERT_IDS.add(alertId);
  persistDismissedIds();
}

export function getAppointmentStatusMeta(status) {
  if (status === 'cancelled') return { label: 'Cancelled', color: 'danger' };
  if (status === 'completed') return { label: 'Completed', color: 'success' };
  if (status === 'in_progress') return { label: 'In Progress', color: 'warning' };
  if (status === 'pending') return { label: 'Pending', color: 'warning' };
  return { label: 'Confirmed', color: 'success' };
}
