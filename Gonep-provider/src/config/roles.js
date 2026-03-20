/**
 * GONEP Provider — Role Permission System
 *
 * Roles:
 *   hospital_admin   — full access, created on hospital approval
 *   doctor           — own patients/appointments/Rx/lab only, no billing, no settings, no other doctors' data
 *   billing_manager  — billing screen only
 *   lab_manager      — lab + inventory + pharmacy view only
 *   receptionist     — appointments scheduling only (built-in to every hospital, auto-created)
 */

export const ROLES = {
  HOSPITAL_ADMIN:   'hospital_admin',
  DOCTOR:           'doctor',
  BILLING_MANAGER:  'billing_manager',
  LAB_MANAGER:      'lab_manager',
  RECEPTIONIST:     'receptionist',
};

/**
 * Which nav items each role can see.
 * Keys match the page ids in MainShell NAV_ITEMS.
 */
const ROLE_NAV = {
  hospital_admin:  ['home', 'appointments', 'pharmacy', 'emr', 'lab', 'billing', 'inventory', 'staff', 'notifications', 'profile', 'settings'],
  doctor:          ['home', 'appointments', 'pharmacy', 'emr', 'lab', 'notifications', 'profile'],
  billing_manager: ['home', 'billing', 'notifications', 'profile'],
  lab_manager:     ['home', 'lab', 'inventory', 'pharmacy', 'notifications', 'profile'],
  receptionist:    ['home', 'appointments', 'notifications', 'profile'],
};

/** Returns the list of allowed page ids for a given role. */
export function getAllowedPages(role) {
  return ROLE_NAV[role] || ROLE_NAV.doctor;
}

/** Returns true if a role can access a specific page. */
export function canAccess(role, pageId) {
  return getAllowedPages(role).includes(pageId);
}

/**
 * For doctors: they only see their own patients / appointments.
 * This flag drives data filtering in screens.
 */
export function isOwnDataOnly(role) {
  return role === ROLES.DOCTOR;
}

/** Human-readable role labels */
export const ROLE_LABELS = {
  hospital_admin:  'Hospital Admin',
  doctor:          'Doctor',
  billing_manager: 'Billing Manager',
  lab_manager:     'Lab & Pharmacy Manager',
  receptionist:    'Receptionist',
};

/** Role badge colors (maps to theme color keys) */
export const ROLE_COLORS = {
  hospital_admin:  'primary',
  doctor:          'purple',
  billing_manager: 'warning',
  lab_manager:     'success',
  receptionist:    'accent',
};
