# Patient Realtime Flow Baseline

## Previous duplicate trigger points
- `MainShell` fetched both appointments and notifications every 30 seconds.
- `NotificationsScreen` fetched appointments and notifications again on mount.
- `DashboardScreen` and `AppointmentsScreen` each fetched appointments on mount.

## New single-source trigger points
- `usePatientRealtime` is the only owner of appointment + notification fetching.
- `hardRefresh()` performs explicit full refresh when needed.
- `subscribePatientEvents()` applies event updates from backend stream.
- `AppointmentDetailsScreen` sends local appointment updates to the store after user actions.

## Guard rails
- Synthetic and backend notifications use deterministic key namespaces.
- Reminder-derived synthetic notifications honor `appointment_reminders` setting.
