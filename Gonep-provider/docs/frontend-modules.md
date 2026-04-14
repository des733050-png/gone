# GONEP Provider — Frontend Modules

This file explains what each module does and why it is structured this way.

## Screen sections and files

### Clinical  (`src/screens/clinical/`)
| Screen | File | Purpose |
|--------|------|---------|
| Dashboard | `Dashboard/DashboardScreen.js` | Role-filtered KPI grid, critical lab banners, quick actions |
| Appointments | `Appointments/AppointmentsScreen.js` | Filterable list; unassigned assign flow; doctor/receptionist gating |
| Availability | `Availability/AvailabilityScreen.js` | Doctor slot management; receptionist/admin multi-doctor view |
| EMR | `EMR/EMRScreen.js` | Patient list with search and allergy warnings |
| Patient Detail | `EMR/PatientDetailScreen.js` | 6-tab patient record: overview, SOAP notes, Rx, lab, visits, timeline |
| Lab | `Lab/LabScreen.js` | Lab results with critical-flag filter; acknowledge button |
| Pharmacy | `Pharmacy/PharmacyScreen.js` | Prescription queue; dispatch flow; filter by status |

### Operations (`src/screens/operations/`)
| Screen | File | Purpose |
|--------|------|---------|
| Billing | `Billing/BillingScreen.js` | Invoice list; mark paid; send reminder; filter by status |
| Inventory | `Inventory/InventoryScreen.js` | Stock management; add/reduce/edit/history/discontinue; ecommerce toggle |
| Staff | `Staff/StaffScreen.js` | Member list; add/edit/suspend; permission chips; POS terminal management |
| Logs | `Logs/LogsScreen.js` | Activity audit trail; filterable by module/date/staff |
| Analytics | `Analytics/AnalyticsScreen.js` | Revenue, inventory, billing, website earnings — admin + billing mgr only |
| Support Tickets | `SupportTickets/SupportTicketsScreen.js` | Raise / respond / resolve — visibility gated by role |

### Account (`src/screens/account/`)
| Screen | File | Purpose |
|--------|------|---------|
| Notifications | `Notifications/NotificationsScreen.js` | Actionable notifications; mark read; badge refresh |
| Profile | `Profile/ProfileScreen.js` | View / edit own profile; role badge |
| Settings | `Settings/SettingsScreen.js` | Appearance, notifications, clinical edit window, security, about |

### Auth (`src/screens/Auth/`)
| Screen | File | Purpose |
|--------|------|---------|
| Auth | `Auth/AuthScreen.js` | Login form; IS_MOCK-gated demo autofill panel; forgot password |
| Onboarding | `Onboarding/HospitalOnboardingScreen.js` | 3-step hospital/pharmacy registration |

### POS (`src/screens/pos/`)
| Screen | File | Purpose |
|--------|------|---------|
| POSScreen | `POSScreen.js` | Full-screen cart / receipt / history / shift summary; bypasses MainShell |

## Organisms
| Component | Purpose |
|-----------|---------|
| `Sidebar.js` | Section labels, collapsible groups, sub-items, role pill, theme toggle |
| `TopBar.js` | Page title, notification badge, user menu (Sign Out lives here) |
| `ScreenContainer.js` | Scroll + safe-area wrapper for all content screens |

## Atoms
`Btn`, `Card`, `Badge`, `Icon`, `Avatar`, `Input`

## Hooks
| Hook | Purpose |
|------|---------|
| `useInventory` | Fetches + filters active inventory; exposes `reload()` |
| `useAppointments` | Fetches appointments; exposes `reload()`, `error` |

## How core functions work

### `MainShell` core functions

- `goTo(id)`
  - Accepts either a page ID or sub-item ID.
  - If a sub-item is received, it resolves `SUB_TO_PAGE` and sets both `page` and `pageFilter`.
  - Also closes overlay sidebar on mobile for better UX.
- `renderPage()`
  - Single switch for all page components.
  - Injects role/user/filter props into each screen.
- `refreshUnread()`
  - Calls `getNotifications()`.
  - Computes unread count and updates topbar/sidebar badge state.

**Why this pattern**

- One navigation behavior source avoids inconsistencies between sidebar, topbar, and screen filters.

### API facade functions (`src/api/index.js`)

- Example exports: `getInventory`, `addStock`, `getSupportTickets`, `savePosTransaction`.
- They are re-exported from the active env layer (`mock`, `dev`, or `prod`).

**Why this pattern**

- Screen code never changes when switching backend environments.

### Hook functions (`useInventory`, `useAppointments`)

- Run a fetch sequence (loading -> success/error).
- Expose `reload()` so screens can refresh after mutations.

**Why hooks, not direct calls in screens**

- Shared logic remains in one place.
- Screens focus on UI and interaction, not transport/lifecycle code.

## Easy mental model

- `App.js`: authentication + boot.
- `MainShell.js`: navigation + role gating + shell controls.
- `src/screens/*`: feature behavior per domain.
- `src/api/*`: data source abstraction.
- `src/mock/*`: local in-memory backend simulation.
