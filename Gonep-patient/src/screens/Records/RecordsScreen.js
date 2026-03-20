import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Icon } from '../../atoms/Icon';
import { Btn } from '../../atoms/Btn';
import { ScreenContainer } from '../../organisms/ScreenContainer';

const RECORDS = [
  {
    id: 'rec-001',
    type: 'Lab Result',
    title: 'Full Blood Count + HbA1c',
    date: 'Feb 20, 2026',
    provider: 'Nairobi General Hospital',
    icon: 'flask-outline',
    color: '#06B6D4',
  },
  {
    id: 'rec-002',
    type: 'Prescription',
    title: 'Hypertension Management Rx',
    date: 'Feb 10, 2026',
    provider: 'Dr. Amina Wanjiku',
    icon: 'pill',
    color: '#1A6FE8',
  },
];

export function RecordsScreen() {
  const { C } = useTheme();

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      {RECORDS.map((r) => (
        <Card key={r.id} hover style={styles.card}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${r.color}20` },
              ]}
            >
              <Icon name={r.icon} lib="mc" size={20} color={r.color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={[styles.title, { color: C.text }]}>{r.title}</Text>
              <Text style={[styles.sub, { color: C.textMuted }]}>
                {r.provider} · {r.date}
              </Text>
            </View>
            <Btn label="Open" variant="ghost" size="sm" />
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
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
  },
});

