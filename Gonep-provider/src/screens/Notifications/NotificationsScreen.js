import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getNotifications } from '../../api';

export function NotificationsScreen() {
  const { C } = useTheme();
  const [notifs, setNotifs] = useState([]);

  useEffect(() => { getNotifications().then((n) => setNotifs(n || [])); }, []);

  const markAll = () => setNotifs((n) => n.map((x) => ({ ...x, read: true })));
  const markOne = (id) => setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  const unread  = notifs.filter((n) => !n.read).length;
  const colorMap = { warning: C.warning, success: C.success, primary: C.primary, danger: C.danger };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[styles.title, { color: C.text }]}>Notifications</Text>
          {unread > 0 && <Badge label={`${unread} new`} color="danger" />}
        </View>
        <Btn label="Mark all read" onPress={markAll} variant="ghost" size="sm" />
      </View>
      {notifs.map((n) => (
        <Card key={n.id} hover onPress={() => markOne(n.id)}
          style={[styles.card, { borderLeftColor: n.read ? C.border : colorMap[n.color] || C.primary, borderLeftWidth: 3, opacity: n.read ? 0.7 : 1 }]}>
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: `${colorMap[n.color] || C.primary}20` }]}>
              <Icon name={n.icon} lib={n.lib || 'feather'} size={20} color={colorMap[n.color] || C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.notifTop}>
                <Text style={[styles.notifTitle, { color: C.text }]}>{n.title}</Text>
                {!n.read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
              </View>
              <Text style={[styles.notifMsg, { color: C.textSec }]}>{n.msg}</Text>
              <Text style={[styles.notifTime, { color: C.textMuted }]}>{n.time}</Text>
            </View>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700' },
  card: { marginBottom: 10, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  notifTitle: { fontSize: 13, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifMsg: { fontSize: 13, lineHeight: 18, marginBottom: 3 },
  notifTime: { fontSize: 11 },
});
