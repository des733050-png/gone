import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { Badge } from '../../atoms/Badge';
import { ScreenContainer } from '../../organisms/ScreenContainer';

export function SettingsScreen() {
  const { C, isDark, toggle } = useTheme();
  const [pushNotifs, setPushNotifs] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [locationShare, setLocationShare] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  const sections = [
    {
      title: 'Appearance',
      items: [
        { label: 'Dark Mode', desc: 'Switch theme', control: <Switch value={isDark} onValueChange={toggle} trackColor={{ false: C.border, true: `${C.warning}80` }} thumbColor={isDark ? C.warning : '#fff'} /> },
      ],
    },
    {
      title: 'Notifications',
      items: [
        { label: 'Push Notifications', desc: 'New delivery request alerts', control: <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ false: C.border, true: `${C.warning}80` }} thumbColor={pushNotifs ? C.warning : '#fff'} /> },
        { label: 'Sound Alerts', desc: 'Audio for incoming requests', control: <Switch value={soundAlerts} onValueChange={setSoundAlerts} trackColor={{ false: C.border, true: `${C.warning}80` }} thumbColor={soundAlerts ? C.warning : '#fff'} /> },
      ],
    },
    {
      title: 'Delivery',
      items: [
        { label: 'Location Sharing', desc: 'Share live location with patients', control: <Switch value={locationShare} onValueChange={setLocationShare} trackColor={{ false: C.border, true: `${C.primary}80` }} thumbColor={locationShare ? C.primary : '#fff'} /> },
        { label: 'Auto-Accept Nearby', desc: 'Auto-accept requests within 1km', control: <Switch value={autoAccept} onValueChange={setAutoAccept} trackColor={{ false: C.border, true: `${C.primary}80` }} thumbColor={autoAccept ? C.primary : '#fff'} /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Change Password', desc: 'Update your password', control: <Btn label="Change" variant="ghost" size="sm" /> },
        { label: 'Bank Details', desc: 'Equity Bank · ****4521', control: <Btn label="Edit" variant="ghost" size="sm" /> },
        { label: 'App Version', desc: 'Gonep Rider v1.0.0', control: <Badge label="Up to date" color="success" /> },
      ],
    },
  ];

  return (
    <ScreenContainer scroll>
      {sections.map((section) => (
        <View key={section.title} style={{ marginBottom: 20 }}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>{section.title.toUpperCase()}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {section.items.map((item, i) => (
              <View key={item.label} style={[styles.settingRow, { borderBottomColor: C.divider, borderBottomWidth: i < section.items.length - 1 ? 1 : 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: C.text }]}>{item.label}</Text>
                  <Text style={[styles.settingDesc, { color: C.textMuted }]}>{item.desc}</Text>
                </View>
                {item.control}
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  settingDesc: { fontSize: 12 },
});
