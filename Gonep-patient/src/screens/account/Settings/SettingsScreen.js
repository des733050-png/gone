import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getSettings, updateSettings } from '../../../api';

export function SettingsScreen() {
  const { C } = useTheme();
  const [settings, setSettings] = useState({
    appointment_reminders: true,
    order_updates: true,
    lab_results_alerts: true,
    medication_refill_reminders: true,
    marketing_updates: false,
    privacy_mode: false,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getSettings();
        if (mounted && data) {
          setSettings({
            appointment_reminders: Boolean(data.appointment_reminders),
            order_updates: Boolean(data.order_updates),
            lab_results_alerts: Boolean(data.lab_results_alerts),
            medication_refill_reminders: Boolean(data.medication_refill_reminders),
            marketing_updates: Boolean(data.marketing_updates),
            privacy_mode: Boolean(data.privacy_mode),
          });
        }
      } catch (e) {
        if (mounted) setError(e?.message || 'Unable to load settings.');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = async (key) => {
    const previous = settings;
    const next = { ...previous, [key]: !previous[key] };
    setSettings(next);
    setError('');
    try {
      await updateSettings(next);
    } catch (e) {
      setError(e?.message || 'Unable to save settings.');
      setSettings(previous);
    }
  };

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
          <Switch
            value={settings.appointment_reminders}
            onValueChange={() => toggle('appointment_reminders')}
          />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Order updates</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Track changes to your medicine deliveries.
            </Text>
          </View>
          <Switch value={settings.order_updates} onValueChange={() => toggle('order_updates')} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Lab result alerts</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Notify me when a new lab or diagnostic result is posted.
            </Text>
          </View>
          <Switch value={settings.lab_results_alerts} onValueChange={() => toggle('lab_results_alerts')} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Medication refill reminders</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Remind me when it may be time to refill prescriptions.
            </Text>
          </View>
          <Switch
            value={settings.medication_refill_reminders}
            onValueChange={() => toggle('medication_refill_reminders')}
          />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Marketing updates</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Receive offers and product announcements from Gonep.
            </Text>
          </View>
          <Switch value={settings.marketing_updates} onValueChange={() => toggle('marketing_updates')} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: C.text }]}>Privacy mode</Text>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              Hide sensitive details in notification previews.
            </Text>
          </View>
          <Switch value={settings.privacy_mode} onValueChange={() => toggle('privacy_mode')} />
        </View>
        {error ? <Text style={{ color: C.danger, fontSize: 12 }}>{error}</Text> : null}
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
