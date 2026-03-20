import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { getNotifications } from '../../api';
import { ScreenContainer } from '../../organisms/ScreenContainer';

export function NotificationsScreen() {
  const { C } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getNotifications();
      if (mounted) {
        setNotifications(data || []);
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      {notifications.map((n) => (
        <Card key={n.id} hover style={styles.card}>
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
              <Text style={[styles.title, { color: C.text }]}>{n.title}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>{n.body}</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>{n.time}</Text>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: '700',
  },
});

