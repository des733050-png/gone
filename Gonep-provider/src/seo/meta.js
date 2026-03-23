// ─── meta.js ─────────────────────────────────────────────────────────────────
// SEO config per page. Title pattern: "{Page} · {Role} Dashboard · GONEP"
// Role label is injected at render time in PageSeo.js.
// ─────────────────────────────────────────────────────────────────────────────
export const SEO_CONFIG = {
  default:       { title: 'Dashboard',             description: 'GONEP Provider Portal' },
  home:          { title: 'Dashboard',             description: 'Provider overview and key metrics' },
  appointments:  { title: 'Appointments',          description: 'Patient scheduling and visit management' },
  availability:  { title: 'Availability',          description: 'Doctor schedule and slot management' },
  pharmacy:      { title: 'Pharmacy & Rx',         description: 'Prescription queue and dispatch' },
  emr:           { title: 'EMR',                   description: 'Electronic medical records' },
  lab:           { title: 'Lab Results',           description: 'Lab results and critical flags' },
  billing:       { title: 'Billing',               description: 'Invoices and payments' },
  inventory:     { title: 'Inventory',             description: 'Stock management and formulary' },
  staff:         { title: 'Staff & Roles',         description: 'Team members, roles and permissions' },
  logs:          { title: 'Activity Logs',         description: 'Full audit trail' },
  analytics:     { title: 'Analytics',             description: 'Revenue, inventory and performance trends' },
  support:       { title: 'Support Tickets',       description: 'IT support requests and resolutions' },
  notifications: { title: 'Notifications',         description: 'Alerts and updates' },
  profile:       { title: 'My Profile',            description: 'Account details and credentials' },
  settings:      { title: 'Settings',              description: 'Application preferences' },
};

// ─── URL paths ────────────────────────────────────────────────────────────────
// Used in App.js React Navigation linking config.
// Each page id maps to a URL path (web only — native uses in-app navigation).
export const PAGE_PATHS = {
  home:          '/dashboard',
  appointments:  '/appointments',
  availability:  '/availability',
  pharmacy:      '/pharmacy',
  emr:           '/emr',
  lab:           '/lab',
  billing:       '/billing',
  inventory:     '/inventory',
  staff:         '/staff',
  logs:          '/logs',
  analytics:     '/analytics',
  support:       '/support',
  notifications: '/notifications',
  profile:       '/profile',
  settings:      '/settings',
};
