# GONEP Provider — Development Notes

## Switching environments
Edit `.env` (or use npm run scripts — see `.env.example`):
```
EXPO_PUBLIC_API_MODE=mock        # no backend needed, all data from src/mock
EXPO_PUBLIC_API_MODE=development # real backend at EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_API_MODE=staging
EXPO_PUBLIC_API_MODE=production
```

The `src/api/index.js` router reads `API_CONFIG.MODE` at startup and requires
exactly one of `./mock`, `./dev`, or `./prod`. No other code needs to change.

## Mock mode
`MOCK_DELAY_MS` in `src/mock/data.js` controls simulated latency:
- `0`   — instant, for rapid UI iteration
- `400` — realistic API latency, good for testing skeletons/loaders

All mock state is in-memory and resets on page refresh. Mutations (e.g. adding
stock, dispatching Rx) update the in-memory arrays and are reflected immediately
in subsequent reads — this mirrors the real API behaviour.

## Adding a new screen
1. Create `src/screens/{section}/{ScreenName}/ScreenName.js` and `index.js`
2. Export from the section barrel (`src/screens/{section}/index.js`)
3. Add to `ALL_NAV_TREE` in `MainShell.js` (with correct `roles` array)
4. Add to `PAGE_META_BASE` in `MainShell.js`
5. Add `case 'newpage': return <NewScreen user={user} />` to `renderPage`
6. Add to `ROLE_NAV` in `src/config/roles.js`
7. Add mock data + API function in `src/mock/data.js` + `src/mock/api.js`
8. Export from `src/api/mock/index.js`, `dev/index.js`, `prod/index.js`, `index.js`

## Demo accounts (mock only)
Seven demo accounts are shown in the login screen **only when IS_MOCK is true**.
They are tree-shaken in all other modes. This is enforced by the IS_MOCK import
from `src/config/env.js` — a build-time constant baked by Metro bundler.

| Role | Email | Notes |
|------|-------|-------|
| Hospital Admin | admin@nairobi-general.co.ke | Full access |
| Doctor | doctor@nairobi-general.co.ke | Own patients only |
| Billing Manager | billing@nairobi-general.co.ke | Billing + inventory (read) + analytics |
| Lab & Pharm Mgr | lab@nairobi-general.co.ke | Lab + inventory (full) |
| Receptionist | reception@nairobi-general.co.ke | Scheduling only |
| IT Admin | it@gonep.co.ke | Support tickets (all) + staff + logs |
| POS Terminal | pos1@nairobi-general.co.ke | Full-screen POS, no sidebar |

Password for all mock accounts: `password123` (set in `DEMO_PASSWORD` env var).

## Theme persistence
Theme preference is saved to `localStorage` (web) or `AsyncStorage` (native)
under the key `gonep_theme_{user.email}`. On login, `App.js` calls
`setUserKey(user.email)` which triggers a load from storage. If the saved value
is `'dark'`, dark mode activates immediately before the shell renders.

## POS role
POS accounts are created by hospital_admin in the Staff screen. When a POS user
logs in, `MainShell.js` detects `user.role === 'pos'` and renders `POSScreen`
directly (full-screen, no sidebar). POS transactions auto-deduct stock via the
`savePosTransaction` API call on checkout.

## Consultation edit window
The admin-configurable edit window is stored in clinical settings (default 24 hrs).
`Settings → Clinical Settings` lets hospital_admin change it. The change is logged
to the activity log. `PatientDetailScreen` loads the current value on mount and
passes it to `isWithinWindow()` for per-note edit button gating.
