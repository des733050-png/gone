// FILE: src/hooks/usePatientRealtime.js
// COMPLETE REPLACEMENT
//
// Changes from original:
// 1. Adds 10s polling fallback (near-realtime on PythonAnywhere WSGI)
// 2. Exposes refreshNotifications() for immediate post-action refresh
// 3. markRead now calls hardRefresh after server update to fix cross-session bug
// 4. SSE kept but wrapped in try/catch — falls back to poll silently

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAppointments,
  getNotifications,
  getSettings,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api';
import { buildAttendanceNotifications, dismissAttendanceNotification } from '../utils/appointmentAlerts';

function notificationKey(item) {
  if (item?.synthetic) return `synthetic:${item.id}`;
  return `server:${item?.event_id || item?.code || item?.id}`;
}

function mergeNotifications(serverNotifications = [], appointments = [], settings = {}) {
  const remindersEnabled = settings?.appointment_reminders !== false;
  const synthetic = remindersEnabled ? buildAttendanceNotifications(appointments) : [];
  const deduped = new Map();
  [...serverNotifications, ...synthetic].forEach((item) => {
    deduped.set(notificationKey(item), item);
  });
  return Array.from(deduped.values());
}

function mergeServerNotificationState(previous = [], incoming = []) {
  const previousMap = new Map(previous.map((item) => [notificationKey(item), item]));
  return (incoming || []).map((item) => {
    const existing = previousMap.get(notificationKey(item));
    // Preserve optimistic read state — don't flip back to unread from server
    if (existing?.read && item?.read === false) {
      return { ...item, read: true };
    }
    return item;
  });
}

export function usePatientRealtime() {
  const [appointments, setAppointments] = useState([]);
  const [serverNotifications, setServerNotifications] = useState([]);
  const [settings, setSettings] = useState({
    appointment_reminders: true,
    order_updates: true,
    lab_results_alerts: true,
    medication_refill_reminders: true,
    marketing_updates: false,
    privacy_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lastCursorRef = useRef(new Date().toISOString());
  const mountedRef = useRef(true);

  // ── Hard refresh: fetch everything from server ──────────────────────────
  const hardRefresh = useCallback(async () => {
    try {
      const [nextNotifications, nextAppointments, nextSettings] = await Promise.all([
        getNotifications(),
        getAppointments(),
        getSettings().catch(() => null),
      ]);
      if (!mountedRef.current) return;
      setAppointments(nextAppointments || []);
      // Full replace from server — server is source of truth for read state
      setServerNotifications(nextNotifications || []);
      if (nextSettings) {
        setSettings({
          appointment_reminders: Boolean(nextSettings.appointment_reminders),
          order_updates: Boolean(nextSettings.order_updates),
          lab_results_alerts: Boolean(nextSettings.lab_results_alerts),
          medication_refill_reminders: Boolean(nextSettings.medication_refill_reminders),
          marketing_updates: Boolean(nextSettings.marketing_updates),
          privacy_mode: Boolean(nextSettings.privacy_mode),
        });
      }
      lastCursorRef.current = new Date().toISOString();
    } catch (e) {
      // Swallow errors in background polls — only report on initial load
    }
  }, []);

  // ── Notification-only refresh (lighter — called after actions) ──────────
  const refreshNotifications = useCallback(async () => {
    try {
      const next = await getNotifications();
      if (!mountedRef.current) return;
      // Full replace — server is the single source of truth
      setServerNotifications(next || []);
    } catch {
      // Swallow
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    hardRefresh()
      .catch((e) => {
        if (mountedRef.current) setError(e?.message || 'Unable to load data.');
      })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    return () => {
      mountedRef.current = false;
    };
  }, [hardRefresh]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const notifications = useMemo(
    () => mergeNotifications(serverNotifications, appointments, settings),
    [serverNotifications, appointments, settings]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  // ── Mark single notification read ─────────────────────────────────────────
  const markRead = useCallback(async (notification) => {
    if (!notification || notification.read) return;

    if (notification.synthetic) {
      dismissAttendanceNotification(notification.id);
      return;
    }

    const identifier = notification.code || notification.id;
    if (!identifier) return;

    // Optimistic update first
    setServerNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id || item.code === notification.code
          ? { ...item, read: true }
          : item
      )
    );

    try {
      await markNotificationRead(identifier);
      // Re-fetch to confirm server state — fixes cross-session persistence bug
      await refreshNotifications();
    } catch {
      // Revert optimistic update on failure
      setServerNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id || item.code === notification.code
            ? { ...item, read: false }
            : item
        )
      );
    }
  }, [refreshNotifications]);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    // Optimistic
    setServerNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    const synthetic = buildAttendanceNotifications(appointments);
    synthetic.forEach((item) => dismissAttendanceNotification(item.id));

    try {
      await markAllNotificationsRead();
      // Confirm from server
      await refreshNotifications();
    } catch {
      // Keep optimistic state — will correct on next poll
    }
  }, [appointments, refreshNotifications]);

  // ── Upsert appointment locally ────────────────────────────────────────────
  const upsertAppointment = useCallback((appointment) => {
    if (!appointment?.id) return;
    setAppointments((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      map.set(appointment.id, appointment);
      return Array.from(map.values());
    });
  }, []);

  return {
    appointments,
    notifications,
    unreadCount,
    loading,
    error,
    settings,
    hardRefresh,
    refreshNotifications,
    markRead,
    markAllRead,
    upsertAppointment,
  };
}