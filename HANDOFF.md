# GONEP Provider Portal — Engineering Handoff
> Last updated: 2026-05-18  
> Authors: Claude (Anthropic) + Ismael  
> Status: Active development — multiple features in flight

---

## 1. Project Overview

**Gonep** is a healthcare platform with three portals:

| Portal | Port | Codebase |
|--------|------|----------|
| Provider (hospital admin, doctors, staff) | 8082 | `Gonep-provider/` (React Native Web / Expo) |
| Patient | 8081 | Separate codebase (not in this session) |
| Backend API | 8000 | `backend/backend/` (Django + DRF) |

The provider portal is a **React Native Web** app that runs in the browser at `localhost:8082`. It uses a custom routing system (not React Navigation for pages — just `useState` for page tracking in `MainShell.js`). The sidebar + top bar shell is always visible; page content swaps in the main area.

---

## 2. Goals We Are Working Towards

### Immediate (this sprint)
1. **Global responsiveness pass** — every page must work on mobile (320 px) through desktop (1440 px). No hardcoded pixel widths that break narrow screens.
2. **Hybrid Onboarding System** — guided tour + checklist + contextual tooltips for `facility_admin` and `doctor` roles (architecture must support all future roles).
3. **Activity log filter** — collapse 4 pill-row filters behind a single filter icon button with a slide-in panel.
4. **Staff management fixes** — self-suspend prevention, email read-only for non-superadmins, doctor specialty dropdown in edit modal.
5. **Raw audit string display** — parse `RESCHEDULE|by=…|at=…` and `CANCEL_META|by=…|reason=…` tokens into human-readable sentences wherever appointment history is rendered.
6. **Inventory AddItemModal** — responsive layout + centered on all screen sizes.

### Longer term (next sprint)
- Patient portal parity for specialization catalogue (patients see standardised names).
- POS module completion.
- Analytics page (currently disabled/commented out in nav tree).
- Notification SSE integration on provider portal.

---

## 3. Architecture: What Exists

### Frontend (`Gonep-provider/`)
```
src/
  api/
    index.js              ← single import point, routes to mock/dev/prod
    httpLayer.js          ← all HTTP calls, createHttpLayer()
    dev/index.js          ← dev exports
    prod/index.js         ← prod exports
    mock/index.js         ← mock exports (for offline dev)
    transport/
      requestClient.js    ← fetch wrapper with CSRF retry
      csrfManager.js      ← CSRF token management
      sessionStore.js     ← session cookie store (now uses provider_sessionid)
  config/
    env.js                ← all ENDPOINTS constants + API_CONFIG
    roles.js              ← role definitions + getAllowedPages()
  theme/
    ThemeContext.js       ← useTheme() → { C, toggle, isDark }
    colors.js             ← light/dark color tokens
    responsive.js         ← useResponsive() → { width, isLarge, sidebarDocked }
  screens/
    MainShell.js          ← authenticated shell, owns routing + verification gate
    Auth/
      Authentication.js
      Onboarding/
        VerificationDashboard.js  ← full verification upload flow (post-login)
        GettingStartedOverlay.js  ← first-login overlay for facility_admin
    clinical/
      Appointments/AppointmentsScreen.js
      Availability/AvailabilityScreen.js
      EMR/EMRScreen.js
      Lab/LabScreen.js
    operations/
      Billing/BillingScreen.js
      Inventory/InventoryScreen.js + molecules/AddItemModal.js
      Staff/StaffScreen.js + molecules/StaffModals.js
      Logs/LogsScreen.js
      Specializations/SpecializationsScreen.js   ← NEW (this sprint)
      SupportTickets/SupportTicketsScreen.js
    account/
      NotificationsScreen.js
      ProfileScreen.js
      SettingsScreen.js
    pos/POSScreen.js
  organisms/
    Sidebar.js            ← navigation sidebar, locked when unverified
    TopBar.js
    ScreenContainer.js    ← standard scroll wrapper for page content
  atoms/
    Card.js               ← borderRadius:14, NO overflow:hidden (important!)
    Btn.js
    Input.js
    Icon.js               ← wraps feather + MaterialCommunityIcons
    Avatar.js
  molecules/
    SelectField.js        ← platform-aware select (web: native <select>)
    ResponsiveModal.js    ← centered modal, max-width, scrollable
    BottomSheet.js        ← used by AddItemModal
    PaginationControls.js
```

### Routing System
- **No React Navigation for page routing** — page is a `useState` string in `MainShell.js`
- `goTo(id)` navigates; `SUB_TO_PAGE` maps sub-item ids to page + filter
- `page` + `pageFilter` are now persisted in `sessionStorage` (key: `gonep_provider_page` / `gonep_provider_filter`) so reloads stay on the current page

### State Management
- **No Redux / Zustand** — pure React `useState` + `useEffect` + Context
- `ThemeContext` — global theme (light/dark)
- `user` object in `App.js` — passed down as props, updated via `onUpdateUser`
- No global store for page-level state — each screen manages its own

### Auth & Role System
- `normalizeRole()` maps `facility_admin` → `hospital_admin` (internal name)
- `getAllowedPages(role)` returns array of allowed page IDs
- `ensure_provider_membership()` on backend enforces role
- `ensure_roles(membership, {ProviderSubRole.FACILITY_ADMIN})` for admin-only actions
- Verification gate: `MainShell` checks `user.verification_status` + `user.facility_status`; if not `VERIFIED`/not `suspended` → sidebar locked, `VerificationDashboard` shown instead of normal pages

### Modal System
- `ResponsiveModal` — the standard for full-page modals (centered, max-width 560, scrollable)
- `BottomSheet` — used for add/edit forms in Inventory
- Custom `Modal` + `StyleSheet.absoluteFillObject` — used ad-hoc in some screens
- **Key issue**: React Native Web applies `overflow:hidden` to any `View` with `borderRadius` → absolutely-positioned dropdowns inside rounded cards get clipped

---

## 4. What Was Changed in This Session (Full Log)

### Backend Changes

#### `backend/core/middleware.py` — NEW FILE
```
PortalSessionMiddleware
```
- Subclasses Django `SessionMiddleware`
- Uses `provider_sessionid` cookie for requests from `localhost:8082` (detected via `HTTP_ORIGIN` header)
- Uses `sessionid` for all other origins (patient portal, admin)
- Thread-safe: stores cookie name on `request._portal_session_cookie`, never mutates `settings`
- **Why**: Browsers scope cookies by domain, not port. Both portals on `localhost` shared the same `sessionid` cookie — logging into provider at port 8082 overwrote the cookie and logged out the patient portal at port 8081.

#### `backend/config/settings.py`
- Replaced `django.contrib.sessions.middleware.SessionMiddleware` with `core.middleware.PortalSessionMiddleware`

#### `backend/portal_api/utils.py`
- Added `ProviderVerificationStatus.PENDING` to the `can_upload_verification_documents` allowed set
- **Why**: Sequential multi-file uploads were failing with 409 because after the first file set status to PENDING, subsequent files got blocked

#### `backend/portal_api/provider_views.py`
- Fixed `ProviderVerificationSubmitView.post()` to **reuse** an existing PENDING submission instead of creating a new one per file upload
- Added `SpecializationListView` — `GET /api/v1/specializations/` (public, returns active master catalogue)
- Added `SpecializationRequestView` — `GET/POST /api/v1/provider/specialization-requests/`
- Rewrote `ProviderFacilitySpecialtiesView.post()` to accept `specialization_id` from master list (not free-text name)
- Added defensive `get()` method to `ProviderVerificationSubmitView` (returns current status on accidental GET)

#### `backend/core/models.py`
- Added `Specialization` model (UUID pk, name unique, slug, description, is_active)
- Added `SpecializationRequestStatus` TextChoices + `SpecializationRequest` model
- Modified `FacilitySpecialty` to add `specialization = FK(Specialization, null=True)`

#### `backend/core/migrations/0017_specialization_models.py` — NEW
- Creates `Specialization` table
- Creates `SpecializationRequest` table
- Adds `specialization` FK to `FacilitySpecialty`
- Seeds 30 Kenyan healthcare specializations
- Backfills existing `FacilitySpecialty` rows via case-insensitive name match
- **Migration has been run successfully** (`python manage.py migrate core 0017_specialization_models` → OK)

#### `backend/core/admin.py`
- Added `SpecializationAdmin` (superuser-only): list display, activate/deactivate actions, facility count annotation
- Added `SpecializationRequestAdmin` (superuser-only): approve_requests (auto-creates Specialization), reject_requests (requires review_note)
- Added `FacilityVerificationSubmissionInline` on `FacilityAdmin`

#### `backend/portal_api/urls.py`
- Added `path("specializations/", SpecializationListView.as_view(), name="specializations")`
- Added `path("provider/specialization-requests/", SpecializationRequestView.as_view(), name="...")`

---

### Frontend Changes

#### `Gonep-provider/src/api/transport/sessionStore.js`
- Changed `SESSION_COOKIE` from `sessionid` to `provider_sessionid`
- `parseCookies()` and `buildCookieHeader()` now use `provider_sessionid`

#### `Gonep-provider/src/config/env.js`
- Added `specializations: .../api/v1/specializations/`
- Added `specializationRequests: .../api/v1/provider/specialization-requests/`

#### `Gonep-provider/src/api/httpLayer.js`
- Added `getSpecializations()`, `getSpecializationRequests()`, `createSpecializationRequest(payload)`

#### `Gonep-provider/src/api/prod/index.js` + `dev/index.js` + `mock/index.js` + `index.js`
- Exported the three new specialization API functions from all four layers
- `mock/index.js`: added 15 seeded mock specializations + in-memory request list

#### `Gonep-provider/src/screens/MainShell.js`
- Added `sessionStorage` persistence for `page` + `pageFilter` (keys: `gonep_provider_page`, `gonep_provider_filter`)
- `useState` initialiser reads from `sessionStorage` on first render → page survives reload
- `useEffect([page, pageFilter])` writes back on every navigation
- Added on-mount `getCurrentUser()` call when `isLocked=true` (catches admin approval while offline)
- Added 5-minute + window-focus status re-check for verified accounts (catches admin-applied SUSPENDED)

#### `Gonep-provider/App.js`
- `PostLoginShell.handleLogout()` now clears `sessionStorage` page keys on logout

#### `Gonep-provider/src/screens/Auth/Onboarding/VerificationDashboard.js`
- Added `localOnServer` state for per-card immediate locking during sequential uploads
- Added `effectiveOnServer` (union of server-confirmed + locally-locked)
- Added `submissionComplete` computed flag
- Added `refreshing` state + green styled "Check verification status" button
- Added pre-flight status check at top of `submitDocuments()` to catch stale `canUpload`
- Per-file lock: after each successful upload, the card immediately shows as locked

#### `Gonep-provider/src/screens/operations/Specializations/SpecializationsScreen.js` — FULL REWRITE
New features:
- Loads master catalogue + facility specialties + pending requests in parallel
- **Assign panel**: searchable `SpecializationPicker` dropdown filtered to unassigned entries
- **Unassign**: trash button per row, guarded against removing when doctors assigned
- **Requests panel**: status chips (pending/approved/rejected) with review notes
- **Request-new form**: name + reason, inline validation, submits `createSpecializationRequest`
- **`SpecializationPicker`** — platform-aware:
  - Web: native HTML `<select>` with custom chevron SVG (no overflow/clipping issues)
  - Native: `Modal`-based centered dialog (not bottom sheet) constrained by `paddingHorizontal: Math.max(20, (screenW-380)/2)`

---

## 5. Known Issues / Bugs / Failed Attempts

### ❌ Attempt 1: Absolute-positioned dropdown inside Card
**What we tried**: Custom dropdown using `position: 'absolute'` inside a rounded `Card` component.  
**Why it failed**: React Native Web applies `overflow: hidden` to any `View` with `borderRadius`. The dropdown was rendered but appeared transparent/invisible because it was clipped by the parent card's overflow boundary.  
**Solution**: Platform-split — `<select>` on web, `Modal` on native.

### ❌ Attempt 2: Bottom-sheet modal for native picker
**What we tried**: `position: 'absolute', bottom: 0, left: 0, right: 0` as a sibling to the backdrop inside Modal.  
**Why it failed**: Two absolute-positioned siblings in a Modal root have undefined layout in some RN environments — the sheet extended beyond device width.  
**Solution**: Changed to centered dialog with `flex: 1, justifyContent: 'center'` root + `paddingHorizontal` constraint.

### ❌ Attempt 3: `We'll` apostrophe in single-quoted string
**What happened**: `SpecializationsScreen.js` had `showToast('Request submitted. We'll review it shortly.')` — the apostrophe in `We'll` broke the JS string literal. Metro returned a 500 JSON error instead of the compiled bundle.  
**Fix**: Changed to double-quoted string `"Request submitted. We'll review it shortly."`.

### ⚠️ Partial: Raw audit string display
**Status**: The `AppointmentsScreen` list view and EMR patient tabs already call `stripApptMetadata()` / `apptDisplayReason()` which strip `RESCHEDULE|…` and `CANCEL_META|…` tokens. **However**, the appointment detail modal's history/timeline section has NOT been verified to apply the same parsing. This needs a targeted audit of `AppointmentsScreen.js` detail modal and `EMR/molecules/PatientTabSections.js`.

### ⚠️ Not Started: Responsiveness global pass
All screens use `flexDirection: 'row'` layouts that compress on narrow mobile. The `useResponsive` hook exists (`src/theme/responsive.js`) but is barely used outside `Sidebar` + `ScreenContainer`. None of the page-level screens have mobile breakpoint handling.

### ⚠️ Not Started: Hybrid Onboarding System
Fully planned, architecture designed, not implemented yet (see Section 7).

### ⚠️ Not Started: Activity log filter icon
Currently 4 horizontal ScrollView pill rows inline. Needs collapsing behind a filter icon.

### ⚠️ Not Started: Staff self-suspend prevention
`StaffCard` checks `member.role !== 'hospital_admin'` but not `member.id === currentUser.id`.

### ⚠️ Not Started: Inventory AddItemModal responsiveness
Uses `BottomSheet` molecule — no max-width centering on desktop, two-column row doesn't stack on mobile.

---

## 6. Next Steps (Ordered by Priority)

### Step 1 — Global Responsiveness Pass
**Approach**: Add `const { width } = useResponsive()` + `const isMobile = width < 640` to each screen. Switch section-header rows to `flexDirection: isMobile ? 'column' : 'row'` where needed. Fix the most egregious mobile breakages first.

**Files to touch**:
- `SpecializationsScreen.js` — section headers overflow on mobile (highest priority, user reported)
- `LogsScreen.js` — 4 inline filter rows need collapse
- `StaffScreen.js` — card row layout
- `BillingScreen.js` — table row overflow
- `InventoryScreen.js` — table row overflow + `AddItemModal.js`
- `DashboardScreen.js` — stats grid (2→1 col on mobile)
- `AppointmentsScreen.js` — appointment cards
- `EMRScreen.js` — patient cards (mostly fine already)

### Step 2 — Activity Log Filter Icon
Replace inline pill rows in `LogsScreen.js` with:
- Filter icon button (top-right) with dot badge when any filter active
- Pressing opens a `BottomSheet` / `ResponsiveModal` containing the same 4 filter groups as vertical pill lists
- "Clear all" + "Apply" buttons

### Step 3 — Staff Fixes
In `StaffScreen.js` / `StaffCard`:
- Add `isCurrentUser = member.id === currentUser?.id` guard → hide Suspend button, keep only Reset Password + Edit
- In `StaffModals.js → EditMemberModal`: render email `<Input>` with `editable={user?.is_superuser}` + lock icon hint
- Replace `SpecialtyCatalogBlock` horizontal pills in `EditMemberModal` with `SpecializationPicker` dropdown

### Step 4 — Raw Audit String Fix
Audit and fix remaining places where `RESCHEDULE|…` / `CANCEL_META|…` tokens appear:
- `AppointmentsScreen.js` detail modal history section
- `EMR/molecules/PatientTabSections.js` timeline view
- Apply `stripApptMetadata()` + format into readable sentences

### Step 5 — Inventory AddItemModal
Wrap `BottomSheet` content in `maxWidth: 560` centered container. Stack the two-column row on mobile.

### Step 6 — Hybrid Onboarding System (see Section 7)

---

## 7. Hybrid Onboarding System — Full Architecture Plan

### Concept
A three-layer system built on top of the existing routing and UI without introducing new frameworks:

| Layer | What it does | When it fires |
|-------|-------------|---------------|
| **Guided Tour** | Step-by-step walkthrough with dark overlay + spotlight on real UI elements | First login per role; manually via Settings |
| **Checklist** | Persistent task list per user stored in `sessionStorage` + backend | Always visible until dismissed |
| **Contextual Tooltips** | Small, dismissable hints that appear when a feature is first visited | First visit to each page section |

### Files to Create
```
src/
  onboarding/
    OnboardingContext.js      ← React context (state + actions)
    useOnboarding.js          ← hook for consuming context
    OnboardingEngine.js       ← core step engine (nextStep, prevStep, skip, resume)
    OnboardingOverlay.js      ← dark backdrop + spotlight highlight component
    OnboardingTooltip.js      ← floating tooltip card (Next/Back/Skip/counter)
    OnboardingChecklist.js    ← collapsible checklist widget
    ContextualTooltip.js      ← small dismissable hint bubble
    flows/
      facility_admin.js       ← step definitions for hospital_admin role
      doctor.js               ← step definitions for doctor role
      _template.js            ← template for future roles
```

### Onboarding State Shape
```js
{
  userId: string,
  role: string,
  tourCompleted: boolean,
  tourCurrentStep: number,
  tourDismissed: boolean,
  completedSteps: string[],   // step IDs completed
  checklistItems: [           // per role
    { id, label, completed, pageId }
  ],
  tooltipsDismissed: string[] // tooltip IDs permanently dismissed
}
```

### Persistence
1. **Immediate**: `localStorage` keyed by `gonep_onboarding_{userId}`
2. **Sync**: On step completion, PATCH to `ENDPOINTS.providerMe` with `onboarding_state` field (needs backend model addition — add `onboarding_state = JSONField(default=dict)` to `ProviderMembership`)

### `data-onboarding-id` Targets to Add
Only these elements need tagging (minimal surface area):

| Target | Element | Step |
|--------|---------|------|
| `sidebar-navigation` | `Sidebar.js` ScrollView root | Tour step 1 |
| `dashboard-overview` | `DashboardScreen.js` root View | Tour step 2 |
| `verification-upload` | `VerificationDashboard.js` upload section | Facility admin step 3 |
| `appointments-list` | `AppointmentsScreen.js` list | Doctor step 2 |
| `emr-patient-list` | `EMRScreen.js` patient list | Doctor step 3 |
| `staff-management` | `StaffScreen.js` root | Facility admin step 4 |
| `specializations-screen` | `SpecializationsScreen.js` root | Facility admin step 5 |

### Facility Admin Flow (`flows/facility_admin.js`)
```js
[
  { id: 'fa-1', title: 'Welcome to GONEP', description: 'This is your provider portal. Let us show you around.', target: 'dashboard-overview', placement: 'center' },
  { id: 'fa-2', title: 'Navigation sidebar', description: 'All modules are accessible from here. Clinical, Operations, Account.', target: 'sidebar-navigation', placement: 'right' },
  { id: 'fa-3', title: 'Complete verification', description: 'Upload your facility documents to unlock full access.', target: 'verification-upload', placement: 'bottom' },
  { id: 'fa-4', title: 'Manage your team', description: 'Add doctors, billing managers, and other staff here.', target: 'staff-management', placement: 'top' },
  { id: 'fa-5', title: 'Specializations', description: 'Assign clinical specializations so patients can find your doctors.', target: 'specializations-screen', placement: 'top' },
]
```

### Doctor Flow (`flows/doctor.js`)
```js
[
  { id: 'doc-1', title: 'Your clinical dashboard', description: 'Overview of today\'s appointments and pending tasks.', target: 'dashboard-overview', placement: 'center' },
  { id: 'doc-2', title: 'Appointments', description: 'View, confirm, and manage patient bookings.', target: 'appointments-list', placement: 'bottom' },
  { id: 'doc-3', title: 'Patient records (EMR)', description: 'Access complete patient histories and upload clinical notes.', target: 'emr-patient-list', placement: 'bottom' },
]
```

### Integration with Existing GettingStartedOverlay
The existing `GettingStartedOverlay` (shown once to facility_admin after verification) is the **checklist layer** — it should be migrated to use `OnboardingChecklist` component. The `onboarding_completed` flag on the backend already tracks dismissal.

### Trigger Rules
- Auto-start tour on first login: check `localStorage` for `gonep_onboarding_{userId}` — if absent, start tour after 1s delay (lets dashboard paint first)
- Settings page: add "Restart onboarding tour" button that calls `resumeOnboarding()` from context
- Role switch: clear onboarding state for new role, restart

---

## 8. Backend Models Still Needed (for Onboarding)

Add to `ProviderMembership` in `core/models.py`:
```python
onboarding_state = models.JSONField(default=dict, blank=True)
```

Migration needed. The frontend already reads/writes `user.onboarding_completed` — the new field is additive and doesn't break anything.

---

## 9. Environment Setup

### Running the backend
```bash
cd backend/backend
python manage.py runserver 0.0.0.0:8000
```

### Running the provider portal
```bash
cd Gonep-provider
npx expo start --web --port 8082
```

### Running both
Both must run simultaneously. The frontend calls `http://localhost:8000` for all API requests.

### Current migration state
- Latest applied: `0017_specialization_models` ✅
- Pending: none

### Key env vars (`.env` in `Gonep-provider/`)
```
EXPO_PUBLIC_API_MODE=development
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
EXPO_PUBLIC_PROVIDER_BASE_PATH=/api/v1/provider
```

---

## 10. Files Currently In Flight (Actively Being Modified)

| File | Status | Note |
|------|--------|------|
| `Gonep-provider/src/screens/operations/Specializations/SpecializationsScreen.js` | ✅ Done | Platform-aware picker, request form, full rewrite |
| `Gonep-provider/src/screens/MainShell.js` | ✅ Done | sessionStorage page persistence, status polling |
| `Gonep-provider/App.js` | ✅ Done | Logout clears sessionStorage |
| `Gonep-provider/src/api/httpLayer.js` | ✅ Done | 3 new specialization functions |
| `Gonep-provider/src/api/*/index.js` (4 files) | ✅ Done | Exports added |
| `Gonep-provider/src/config/env.js` | ✅ Done | 2 new endpoint constants |
| `Gonep-provider/src/api/transport/sessionStore.js` | ✅ Done | provider_sessionid cookie name |
| `backend/core/middleware.py` | ✅ Done | PortalSessionMiddleware |
| `backend/config/settings.py` | ✅ Done | Middleware swap |
| `backend/portal_api/provider_views.py` | ✅ Done | 3 new views, submission reuse fix |
| `backend/portal_api/urls.py` | ✅ Done | 2 new URL patterns |
| `backend/portal_api/utils.py` | ✅ Done | PENDING allowed in can_upload |
| `backend/core/models.py` | ✅ Done | Specialization + SpecializationRequest models |
| `backend/core/admin.py` | ✅ Done | Specialization + SpecializationRequest admin |
| `backend/core/migrations/0017_specialization_models.py` | ✅ Done + Applied | Seeds 30 specializations |
| `Gonep-provider/src/screens/operations/Logs/LogsScreen.js` | ⏳ Pending | Filter icon UI |
| `Gonep-provider/src/screens/operations/Staff/StaffScreen.js` | ⏳ Pending | Self-suspend guard |
| `Gonep-provider/src/screens/operations/Staff/molecules/StaffModals.js` | ⏳ Pending | Email lock, specialty dropdown |
| `Gonep-provider/src/screens/operations/Inventory/molecules/AddItemModal.js` | ⏳ Pending | Responsive centering |
| All screens (responsiveness) | ⏳ Pending | Mobile breakpoint pass |
| `src/onboarding/` (new directory) | ⏳ Pending | Entire onboarding system |

---

## 11. Conventions to Follow

- **Theme colors**: always via `const { C } = useTheme()`. Never hardcode hex values except in `colors.js`.
- **Responsive breakpoints**: use `const { width } = useResponsive()`. `isMobile = width < 640`, `isTablet = width < 900`.
- **Modals**: use `ResponsiveModal` for full-page dialogs; custom `Modal` only for pickers/bottom sheets.
- **API calls**: always import from `../../../api` (the index), never from `dev/` or `prod/` directly.
- **Icons**: `<Icon name="..." lib="feather|mc" size={N} color={C.xxx} />`
- **Dropdowns**: web = native `<select>` via `React.createElement`; native = `Modal`-based picker.
- **Overflow-hidden trap**: React Native Web clips absolutely-positioned children inside any `View` with `borderRadius`. Always use Modal or portal for overlays that must escape their container.
- **Session cookies**: provider portal always uses `provider_sessionid`. Never revert to `sessionid`.
- **Commit style**: conventional commits — `feat:`, `fix:`, `refactor:`, `chore:`.

---

*End of handoff document. All code changes are committed and running. The next engineer should start with the global responsiveness pass (Section 6, Step 1) then the onboarding system (Section 7).*
