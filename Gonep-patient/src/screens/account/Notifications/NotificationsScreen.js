import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { T } from '../../../atoms/T';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Btn } from '../../../atoms/Btn';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { ScreenContainer } from '../../../organisms/ScreenContainer';

export function NotificationsScreen({
  notifications = [],
  loading = false,
  settings = {},
  onMarkRead,
  onMarkAllRead,
}) {
  const { C, typography } = useTheme();
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const markRead = async (notification) => {
    if (!notification || notification.read) return;
    try {
      await onMarkRead?.(notification);
    } catch (e) {
      setError(e?.message || 'Unable to mark notification as read.');
    }
  };
  const unreadCount = notifications.filter((item) => !item.read).length;
  const visibleNotifications = [...notifications].sort((a, b) => Number(a.read) - Number(b.read));

  const markAllRead = async () => {
    if (!unreadCount) return;
    try {
      setMarkingAll(true);
      await onMarkAllRead?.();
    } catch (e) {
      setError(e?.message || 'Unable to mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.headerRow}>
        <T style={{ color: C.textMuted, fontSize: typography.sm }}>{unreadCount} unread</T>
        <Btn
          label={markingAll ? 'Please wait...' : 'Mark all read'}
          size="sm"
          variant="ghost"
          disabled={!unreadCount || markingAll}
          onPress={markAllRead}
        />
      </View>
      {loading ? <SectionLoader label="Loading notifications..." /> : null}
      {!loading && notifications.length === 0 ? (
        <Card style={styles.card}>
          <T style={{ color: C.text, fontWeight: '700', fontSize: typography.body, marginBottom: 4 }}>No notifications yet</T>
          <T style={{ color: C.textMuted, fontSize: typography.sm }}>
            Alerts about appointments and orders will appear here.
          </T>
        </Card>
      ) : null}
      {error ? <T style={{ color: C.danger, fontSize: typography.sm, marginBottom: 10 }}>{error}</T> : null}
      {visibleNotifications.map((n) => (
        <TouchableOpacity key={n.id} activeOpacity={0.85} onPress={() => markRead(n)}>
          <Card
            hover
            style={[
              styles.card,
              !n.read ? { borderColor: C.primary, borderWidth: 1 } : null,
            ]}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: C.primaryLight },
                ]}
              >
                <Icon name={n.icon.name} lib={n.icon.lib} size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <T style={[styles.title, { color: C.text }]}>{n.title}</T>
                <T style={{ color: C.textMuted, fontSize: typography.sm, marginTop: 2, lineHeight: 18 }}>
                  {settings?.privacy_mode ? 'Content hidden in privacy mode.' : n.body}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {!n.read ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginBottom: 4 }} />
                ) : null}
                <T style={{ color: C.textMuted, fontSize: typography.xs }}>{n.time}</T>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  headerRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
});
