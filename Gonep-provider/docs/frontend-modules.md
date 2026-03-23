# GONEP Provider — Frontend Modules

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

### Auth (`src/screens/auth/`)
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
