// ─── constants/support.js ────────────────────────────────────────────────────

export const STATUS_COLOR   = { open: 'warning', in_progress: 'primary', resolved: 'success', closed: 'danger' };
export const STATUS_LABEL   = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
export const PRIORITY_COLOR = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };
export const TICKET_CATEGORIES = ['Bug', 'Feature Request', 'Access', 'Performance', 'Data Issue', 'Other'];
export const PRIORITIES     = ['low', 'medium', 'high', 'critical'];

export const canRespond   = role => role === 'it_admin' || role === 'hospital_admin';
export const canSeeTicket = (ticket, user) => {
  if (!user) return false;
  if (user.role === 'it_admin') return true;
  if (user.role === 'hospital_admin') return ticket.facility === (user.facility || 'Nairobi General Hospital');
  return ticket.raised_by === user.id;
};
