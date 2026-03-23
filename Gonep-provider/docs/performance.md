# GONEP Provider — Performance Guide

## Frontend and scale
The provider portal is a client-side SPA. Concurrent user capacity is a
**backend concern** (connection pooling, database scaling, load balancers).
The frontend's performance goal is: feel instant regardless of how many other
users are hitting the server simultaneously.

## Memoisation strategy

### useMemo
Used in `MainShell.js` for:
- `allowedPages` — recalculates only when `user.role` changes (rare)
- `navTree` — recalculates only when role or allowedPages changes
- `pageMeta` — recalculates only when page or unread count changes

### useCallback
Used for:
- `goTo` — stable reference, avoids re-renders in Sidebar/TopBar
- `refreshUnread` — stable, passed to NotificationsScreen
- `loadConsultations`, `handleCancelRx` in PatientDetailScreen

### React.memo
Atom components (`Btn`, `Card`, `Badge`, `Icon`, `Avatar`) are pure —
consider wrapping in `React.memo` if profiling shows them re-rendering
unnecessarily during list scrolls.

## Lazy loading
Currently all screens are imported eagerly. For large deployments:
```js
// Replace eager imports with:
const AnalyticsScreen = React.lazy(() => import('./operations/Analytics'));
// Wrap <Suspense fallback={<SkeletonLoader />}> in MainShell renderPage()
```
Prioritise lazy-loading Analytics (chart rendering is heavy) and POS (separate bundle).

## List performance
FlatList is used in POSScreen product list — always preferable to ScrollView
for long lists. If inventory grows large (1000+ items), add `initialNumToRender`
and `windowSize` props to the FlatList.

For patient lists and appointment lists, the current ScrollView + map is fine
for realistic data sizes (< 200 items per screen in a single hospital).

## Animation budget
Keep UI animations under 16ms per frame (60fps target):
- Use `useNativeDriver: true` on all Animated transforms/opacity
- Avoid animating layout props (width/height) — animate transform: scale instead
- Modal slide-up animations already use `animationType="slide"` which is native-driven

## Caching
Input field values are preserved in component state for the session. There is
no cross-session caching of server data. In production, consider:
- SWR or React Query for stale-while-revalidate on frequently-accessed data
- Cache notifications unread count in localStorage between page visits
- Cache user profile in localStorage to avoid a round-trip on every load

## Bundle size
The mock layer (`src/mock/`) is conditionally required only when `IS_MOCK=true`.
Metro bundler tree-shakes unused branches, so mock data does not appear in
production bundles.

Charts in AnalyticsScreen are custom View/SVG compositions — no charting library
is imported, keeping the bundle ~150KB smaller than an equivalent recharts build.
