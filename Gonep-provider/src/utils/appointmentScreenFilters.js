import { parseExistingDateTime } from './bookingAvailability';

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfTomorrowLocal(now = new Date()) {
  const t = startOfLocalDay(now);
  t.setDate(t.getDate() + 1);
  return t;
}

function appointmentInstant(apt) {
  if (apt?.scheduled_for) {
    const dt = new Date(apt.scheduled_for);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return parseExistingDateTime(apt);
}

function mondayOfWeekContaining(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function sundayEndOfWeekContaining(d) {
  const mon = mondayOfWeekContaining(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

function isInThisCalendarWeek(d, now = new Date()) {
  if (!d) return false;
  const t = d.getTime();
  return t >= mondayOfWeekContaining(now).getTime() && t <= sundayEndOfWeekContaining(now).getTime();
}

function isInThisCalendarMonth(d, now = new Date()) {
  if (!d) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isTodayLocal(d, now = new Date()) {
  if (!d) return false;
  return startOfLocalDay(d).getTime() === startOfLocalDay(now).getTime();
}

function isUpcomingRelativeToToday(apt, now = new Date()) {
  const d = appointmentInstant(apt);
  if (!d) {
    const label = String(apt?.date || '').toLowerCase();
    if (label.includes('today')) return false;
    return true;
  }
  return d.getTime() >= startOfTomorrowLocal(now).getTime();
}

function normalizeAppointmentType(t) {
  return String(t || '')
    .trim()
    .toLowerCase();
}

/**
 * Combined filter for appointments list (AND across dimensions).
 *
 * @param {object} opts
 * @param {Set<string>|string[]} opts.statuses — cancelled | completed | confirmed | unassigned | pending
 * @param {string} opts.dateMode — '' | today | upcoming | this_week | this_month
 * @param {Set<string>|string[]} opts.types — home_visit | in_facility | chat
 * @param {string} opts.doctorId — optional membership id
 */
export function appointmentMatchesFilters(apt, opts = {}) {
  const now = opts.now instanceof Date ? opts.now : new Date();
  const statuses = opts.statuses instanceof Set ? opts.statuses : new Set(opts.statuses || []);
  const types = opts.types instanceof Set ? opts.types : new Set(opts.types || []);
  const dateMode = opts.dateMode || '';
  const doctorId = opts.doctorId != null && opts.doctorId !== '' ? String(opts.doctorId) : '';

  const st = String(apt?.status || '').toLowerCase();
  if (statuses.size && !statuses.has(st)) return false;

  if (doctorId && String(apt?.doctor_id || '') !== doctorId) return false;

  if (types.size) {
    const ty = normalizeAppointmentType(apt?.type);
    let ok = false;
    if (types.has('home_visit') && ty.includes('home')) ok = true;
    if (types.has('in_facility') && (ty.includes('facility') || ty === 'in facility')) ok = true;
    if (
      types.has('chat') &&
      (ty.includes('chat') || ty.includes('online') || ty.includes('tele') || ty.includes('video'))
    ) {
      ok = true;
    }
    if (!ok) return false;
  }

  const inst = appointmentInstant(apt);

  if (dateMode === 'today') {
    if (!isTodayLocal(inst, now)) return false;
  } else if (dateMode === 'upcoming') {
    if (st === 'unassigned') return false;
    if (!isUpcomingRelativeToToday(apt, now)) return false;
  } else if (dateMode === 'this_week') {
    if (!inst || !isInThisCalendarWeek(inst, now)) return false;
  } else if (dateMode === 'this_month') {
    if (!inst || !isInThisCalendarMonth(inst, now)) return false;
  }

  return true;
}

export function toggleSetMember(set, id) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
