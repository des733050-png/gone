/**
 * GONEP Provider — Role Permission System
 *
 * Roles:
 *   hospital_admin   — full clinical + operational access; created on hospital approval
 *   doctor           — own patients / appointments / Rx / lab only; no billing; no settings
 *   billing_manager  — billing + read-only inventory + analytics (billing + inventory)
 *   lab_manager      — lab + inventory (full) + pharmacy view
 *   receptionist     — appointments scheduling + availability
 *   pos              — POS terminal only; full-screen cart/receipt interface; no clinical access
 *
 * Adding a new role:
 *   1. Add to ROLES constant below.
 *   2. Add allowed pages to ROLE_NAV.
 *   3. Add label to ROLE_LABELS.
 *   4. Add color key to ROLE_COLORS.
 *   5. Wire in MainShell.js ALL_NAV_TREE (roles arrays on relevant sections).
 *   6. Handle in MainShell.js renderPage switch.
 *
 * Why ROLE_NAV drives nav and not just the components?
 *   Centralising nav permissions here means MainShell can filter the entire
 *   sidebar from a single source of truth — no conditional imports needed
 *   in screen files.
 */

export const ROLES = {
  HOSPITAL_ADMIN:  'hospital_admin',
  DOCTOR:          'doctor',
  BILLING_MANAGER: 'billing_manager',
  LAB_MANAGER:     'lab_manager',
  RECEPTIONIST:    'receptionist',
  POS:             'pos',
};

/**
 * Which nav page ids each role can access.
 * Keys must match the id fields in MainShell ALL_NAV_TREE.
 *
 * 'analytics' is intentionally limited to hospital_admin and billing_manager.
 * 'inventory' is added to billing_manager as read-only (enforced in InventoryScreen
 *   by checking user.role — billing sees no action buttons).
 * 'support' is available to all non-POS roles.
 * 'pos' is a special page that replaces the entire shell for the POS role.
 */
const ROLE_NAV = {
  hospital_admin:  ['home', 'appointments', 'availability', 'pharmacy', 'emr', 'lab', 'billing', 'inventory', 'staff', 'logs', 'analytics', 'support', 'notifications', 'profile', 'settings'],
  doctor:          ['home', 'appointments', 'availability', 'pharmacy', 'emr', 'lab', 'support', 'notifications', 'profile'],
  billing_manager: ['home', 'billing', 'inventory', 'analytics', 'support', 'notifications', 'profile'],
  lab_manager:     ['home', 'lab', 'inventory', 'pharmacy', 'support', 'notifications', 'profile'],
  receptionist:    ['home', 'appointments', 'availability', 'support', 'notifications', 'profile'],
  pos:             ['pos'], // POS role renders a completely different shell
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
 * Roles that only see their own patients / appointments.
 * Drives data filtering in EMRScreen, AppointmentsScreen, LabScreen, PharmacyScreen.
 */
export function isOwnDataOnly(role) {
  return role === ROLES.DOCTOR;
}

/** Human-readable role labels — used in sidebar, TopBar user menu, StaffScreen chips */
export const ROLE_LABELS = {
  hospital_admin:  'Hospital Admin',
  doctor:          'Doctor',
  billing_manager: 'Billing Manager',
  lab_manager:     'Lab & Pharmacy Mgr',
  receptionist:    'Receptionist',
  pos:             'POS Terminal',
};

/**
 * Role badge colors — maps to theme color keys.
 * Keys must match properties in the theme (C.primary, C.purple, etc.)
 */
export const ROLE_COLORS = {
  hospital_admin:  'primary',
  doctor:          'purple',
  billing_manager: 'warning',
  lab_manager:     'success',
  receptionist:    'accent',
  pos:             'secondary',
};
