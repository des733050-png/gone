import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { T } from '../../../atoms/T';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../../api';

export function NotificationsScreen({ onRead }) {
  const { C, typography } = useTheme();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getNotifications()
      .then((n) => { if (mounted) setNotifs(n || []); })
      .catch((err) => { if (mounted) setError(err?.message || 'Unable to load notifications.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const markAll = useCallback(async () => {
    if (markingAll) return;
    try {
      setMarkingAll(true);
      await markAllNotificationsRead();
      setNotifs((prev) => prev.map((x) => ({ ...x, read: true })));
      if (onRead) onRead();
    } catch (e) {
      setError(e?.message || 'Unable to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  }, [onRead, markingAll]);

  const markOne = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifs((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      if (onRead) onRead();
    } catch (e) {
      setError(e?.message || 'Unable to mark as read.');
    }
  }, [onRead]);

  const unread   = notifs.filter((n) => !n.read).length;
  const visible  = [...notifs].sort((a, b) => Number(a.read) - Number(b.read));

  const colorMap = {
    warning: C.warning,
    success: C.success,
    primary: C.primary,
    danger:  C.danger,
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T style={[styles.title, { color: C.text, fontFamily: typography.fontFamily }]}>Notifications</T>
          {unread > 0 && <Badge label={`${unread} new`} color="danger" />}
        </View>
        <Btn
          label={markingAll ? 'Please wait…' : 'Mark all read'}
          size="sm"
          variant="ghost"
          disabled={!unread || markingAll}
          onPress={markAll}
        />
      </View>

      {loading && <SectionLoader label="Loading notifications…" />}
      {!!error && <T style={{ color: C.danger, fontSize: typography.sm, marginBottom: 10 }}>{error}</T>}

      {!loading && !error && visible.length === 0 && (
        <Card style={{ padding: 14 }}>
          <T style={{ color: C.text, fontWeight: '700', fontSize: typography.body, marginBottom: 4 }}>
            No notifications yet
          </T>
          <T style={{ color: C.textMuted, fontSize: typography.sm }}>
            Alerts about platform updates and activity will appear here.
          </T>
        </Card>
      )}

      {visible.map((n) => {
        const accent = colorMap[n.color] || C.primary;
        const iconName = n.icon?.name || n.icon || 'bell';
        const iconLib  = n.icon?.lib  || n.lib  || 'feather';

        return (
          <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => markOne(n.id)}>
            <Card
              hover
              style={[
                styles.card,
                !n.read ? { borderColor: accent, borderWidth: 1.5 } : { opacity: 0.75 },
              ]}
            >
              <View style={styles.row}>
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
                  <Icon name={iconName} lib={iconLib} size={18} color={accent} />
                </View>

                {/* Content */}
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <T style={[styles.notifTitle, { color: C.text }]}>{n.title}</T>
                  <T style={{ color: C.textMuted, fontSize: typography.sm, marginTop: 2, lineHeight: 18 }}>
                    {n.msg || n.body || ''}
                  </T>
                </View>

                {/* Right: unread dot + time */}
                <View style={{ alignItems: 'flex-end' }}>
                  {!n.read && (
                    <View style={[styles.unreadDot, { backgroundColor: accent }]} />
                  )}
                  <T style={{ color: C.textMuted, fontSize: typography.xs }}>{n.time}</T>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title:       { fontSize: 18, fontWeight: '700' },
  card:        { marginBottom: 10 },
  row:         { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTitle:  { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
});
