/**
 * Helpers for booking UI: map weekly availability + blocked days to concrete
 * calendar dates and discrete start times that fit a chosen duration.
 */

export function toMinutes(timeValue) {
  const [h = '0', m = '0'] = String(timeValue || '').split(':');
  return Number(h) * 60 + Number(m);
}

export function formatHHmm(totalMins) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = Math.round(totalMins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isoDateFromLocalDate(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function parseLocalIsoDate(iso) {
  const [y, mo, da] = String(iso || '').split('-').map((n) => Number(n));
  if (!y || !mo || !da) return null;
  return new Date(y, mo - 1, da);
}

/** Must match `useCreateAppointment` / backend slot `day` values (`Mon`, …). */
export function weekdayShortFromLocalDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/** Same logic as server-side booking collision: map list appointment to a Date (mock-friendly). */
export function parseExistingDateTime(item) {
  if (!item?.date || !item?.time) return null;
  const now = new Date();
  const label = String(item.date).toLowerCase();
  let baseDate = new Date(now);
  if (label.includes('tomorrow')) {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (!label.includes('today')) {
    const parsed = new Date(`${item.date} ${now.getFullYear()} ${item.time}`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const [hourMinute, period = 'AM'] = String(item.time).split(' ');
  const [h = '0', m = '0'] = hourMinute.split(':');
  let hour = Number(h);
  if (String(period).toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (String(period).toUpperCase() === 'AM' && hour === 12) hour = 0;
  baseDate.setHours(hour, Number(m), 0, 0);
  return baseDate;
}

function sameLocalCalendarDay(d, isoDate) {
  if (!d || !isoDate) return false;
  return isoDateFromLocalDate(d) === isoDate;
}

function confirmedAppointmentBlocks(appointments, doctorId, dateIso, defaultDuration = 30) {
  const blocks = [];
  for (const item of appointments || []) {
    if (String(item?.doctor_id || '') !== String(doctorId || '')) continue;
    const status = String(item?.status || '').toLowerCase();
    if (status !== 'confirmed') continue;
    const start = parseExistingDateTime(item);
    if (!start || !sameLocalCalendarDay(start, dateIso)) continue;
    const dur = Number(item?.duration_minutes || defaultDuration) || defaultDuration;
    const end = new Date(start.getTime() + dur * 60 * 1000);
    blocks.push({ start, end });
  }
  return blocks;
}

export function collectAvailableCalendarDates(availability, options = {}) {
  const slots = availability?.slots || [];
  const blockedDays = new Set(
    (availability?.blocked_days || []).map((s) => String(s || '').trim()).filter(Boolean)
  );
  const slotDays = new Set(
    slots.map((s) => String(s?.day || '').trim()).filter(Boolean)
  );
  if (!slotDays.size) return [];

  const horizonDays = options.horizonDays ?? 120;
  const from = options.fromDate instanceof Date ? new Date(options.fromDate) : new Date();
  from.setHours(0, 0, 0, 0);

  const out = [];
  const cursor = new Date(from);
  for (let i = 0; i < horizonDays; i += 1) {
    const short = weekdayShortFromLocalDate(cursor);
    if (!blockedDays.has(short) && slotDays.has(short)) {
      out.push(isoDateFromLocalDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/**
 * Start times (HH:mm) on dateIso that fit inside weekly slots and duration,
 * are strictly after `now` when dateIso is today, and do not overlap confirmed appointments.
 */
export function collectBookableTimeSlots(dateIso, availability, durationMinutes, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const appointments = options.appointments || [];
  const doctorId = options.doctorId;
  const step = options.stepMinutes ?? 15;

  const slots = availability?.slots || [];
  const blocked = new Set(
    (availability?.blocked_days || []).map((s) => String(s || '').trim()).filter(Boolean)
  );
  if (!dateIso) return [];

  const local = parseLocalIsoDate(dateIso);
  if (!local) return [];
  const short = weekdayShortFromLocalDate(local);
  if (blocked.has(short)) return [];

  const daySlots = slots.filter((s) => String(s?.day || '').trim() === short);
  const dur = Number(durationMinutes) || 30;
  const candidates = new Set();

  for (const slot of daySlots) {
    const a = toMinutes(slot.start);
    const b = toMinutes(slot.end);
    if (Number.isNaN(a) || Number.isNaN(b) || b <= a) continue;
    for (let t = a; t + dur <= b; t += step) {
      candidates.add(t);
    }
  }

  const todayIso = isoDateFromLocalDate(
    new Date(now.getFullYear(), now.getMonth(), now.getDate())
  );

  const blocks =
    doctorId != null
      ? confirmedAppointmentBlocks(appointments, doctorId, dateIso, dur)
      : [];

  const sorted = [...candidates].sort((x, y) => x - y);
  return sorted
    .map((mins) => formatHHmm(mins))
    .filter((timeStr) => {
      const start = new Date(`${dateIso}T${timeStr}:00`);
      if (Number.isNaN(start.getTime())) return false;
      if (dateIso === todayIso && start <= now) return false;
      const end = new Date(start.getTime() + dur * 60 * 1000);
      for (const { start: b0, end: b1 } of blocks) {
        if (start < b1 && end > b0) return false;
      }
      return true;
    });
}
