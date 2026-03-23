# GONEP Provider — State Management

## Philosophy
No global state manager (no Redux, no Zustand). State is co-located at the
screen level and lifted only where necessary. This keeps screens independently
testable and makes the data flow easy to trace.

## Pattern: hook → screen → API layer
```
Screen
  ↓ calls hook (e.g. useInventory)
  ↓ hook calls api/index.js
  ↓ api/index.js delegates to mock/dev/prod layer
  ↓ data returned, hook sets local state
  ↓ screen re-renders
```

## Mock state architecture
`src/mock/api.js` holds module-level mutable arrays (`_prescriptions`,
`_inventory`, `_consultations`, etc.). These are initialised lazily from the
`MOCK_*` constants in `data.js` on first access. Mutations update these arrays
in-place, so subsequent `fetch*` calls return the updated data — exactly
mirroring real server state within a session.

Why module-level instead of React state?
→ Multiple screens may read the same data (e.g. inventory appears in both the
  Inventory screen and the POS product list). Module-level state is a single
  source of truth across all screens without needing a context or store.

## Props vs context
- `user` and `goTo` are passed down from `MainShell` via props.
- Theme (`C`, `isDark`, `toggle`) is provided via `ThemeContext`.
- No other context is used — all other data is fetched locally per screen.

## Filter prop pattern
When a sidebar sub-item is tapped (e.g. "Unassigned" under Appointments),
`MainShell` resolves it via `SUB_TO_PAGE` to a page ID + filter string, then
passes `filter={pageFilter}` to the rendered screen. Each screen syncs this
with a `useEffect` so live navigation from sub-items always overrides the
screen's local filter state.

## Reload pattern
Hooks expose a `reload` function alongside their data:
```js
const { inventory, loading, error, reload } = useInventory();
```
After a mutation (e.g. addStock → API call → success), call `reload()` to
re-fetch and re-render without a full remount.

## Optimistic updates
Some mutations update local state immediately before the API resolves (e.g.
marking a notification read, dispatching an Rx). The API call runs in
the background. If it fails, the error is surfaced but the UI state is not
automatically rolled back — this is acceptable for mock mode and should be
hardened in production.

## Theme state
`ThemeContext` is the only piece of genuinely global state. It is a single
React context wrapping the entire app. It holds `isDark`, `toggle()`, and
`setUserKey(email)`. Persistence to storage happens inside the context itself,
not in screens. See `ThemeContext.js` for the storage key strategy.
