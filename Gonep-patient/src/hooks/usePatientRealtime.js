import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAppointments,
  getNotifications,
  getSettings,
  markAllNotificationsRead,
  markNotificationRead,
  subscribePatientEvents,
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
  const merged = (incoming || []).map((item) => {
    const existing = previousMap.get(notificationKey(item));
    if (existing?.read && item?.read === false) {
      return { ...item, read: true };
    }
    return item;
  });
  return merged;
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

  const hardRefresh = useCallback(async () => {
    const [nextNotifications, nextAppointments, nextSettings] = await Promise.all([
      getNotifications(),
      getAppointments(),
      getSettings().catch(() => null),
    ]);
    setAppointments(nextAppointments || []);
    setServerNotifications((prev) => mergeServerNotificationState(prev, nextNotifications || []));
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
  }, []);

  useEffect(() => {
    let mounted = true;
    hardRefresh()
      .catch((e) => {
        if (mounted) setError(e?.message || 'Unable to load realtime data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [hardRefresh]);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    let fallbackInterval = null;

    const start = () => {
      cleanup = subscribePatientEvents({
        cursor: lastCursorRef.current,
        onEvent: ({ type, payload }) => {
          if (cancelled || !payload) return;
          lastCursorRef.current = new Date().toISOString();
          if (type === 'notification') {
            setServerNotifications((prev) => {
              const map = new Map(prev.map((item) => [notificationKey(item), item]));
              const key = notificationKey(payload);
              const current = map.get(key);
              if (current?.read && payload?.read === false) {
                map.set(key, { ...payload, read: true });
              } else {
                map.set(key, payload);
              }
              return Array.from(map.values());
            });
          } else if (type === 'appointment') {
            setAppointments((prev) => {
              const map = new Map(prev.map((item) => [item.id, item]));
              map.set(payload.id, payload);
              return Array.from(map.values());
            });
          }
        },
        onError: () => {
          if (cancelled || fallbackInterval) return;
          fallbackInterval = setInterval(() => {
            hardRefresh().catch(() => {});
          }, 45000);
        },
      });
    };

    start();
    return () => {
      cancelled = true;
      cleanup?.();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [hardRefresh]);

  const notifications = useMemo(
    () => mergeNotifications(serverNotifications, appointments, settings),
    [serverNotifications, appointments, settings]
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const markRead = useCallback(async (notification) => {
    if (!notification || notification.read) return;
    if (notification.synthetic) {
      dismissAttendanceNotification(notification.id);
      return;
    }
    const identifier = notification.code || notification.id;
    if (!identifier) return;
    await markNotificationRead(identifier);
    setServerNotifications((prev) =>
      prev.map((item) =>
        item.id === notification.id || item.code === notification.code
          ? { ...item, read: true }
          : item
      )
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    const synthetic = buildAttendanceNotifications(appointments);
    synthetic.forEach((item) => dismissAttendanceNotification(item.id));
    setServerNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, [appointments]);

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
    markRead,
    markAllRead,
    upsertAppointment,
  };
}
