import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { ScreenContainer } from '../../../organisms/ScreenContainer';

export function SettingsScreen() {
  const { C } = useTheme();

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Notifications</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Appointment reminders</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Get notified before your appointment starts.
            </Text>
          </View>
          <Switch value />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Order updates</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Track changes to your medicine deliveries.
            </Text>
          </View>
          <Switch value />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
