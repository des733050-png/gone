import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Btn } from '../../atoms/Btn';
import { Badge } from '../../atoms/Badge';
import { ScreenContainer } from '../../organisms/ScreenContainer';

export function SettingsScreen() {
  const { C, isDark, toggle } = useTheme();
  const [pushNotifs, setPushNotifs]   = useState(true);
  const [emailReports, setEmailReports] = useState(true);
  const [critAlerts, setCritAlerts]   = useState(true);
  const [twoFA, setTwoFA]             = useState(false);

  const sections = [
    {
      title: 'Appearance',
      items: [{ label: 'Dark Mode', desc: 'Switch theme', control: <Switch value={isDark} onValueChange={toggle} trackColor={{ false: C.border, true: `${C.primary}80` }} thumbColor={isDark ? C.primary : '#fff'} /> }],
    },
    {
      title: 'Notifications',
      items: [
        { label: 'Push Notifications', desc: 'Appointment and order alerts', control: <Switch value={pushNotifs} onValueChange={setPushNotifs} trackColor={{ false: C.border, true: `${C.primary}80` }} thumbColor={pushNotifs ? C.primary : '#fff'} /> },
        { label: 'Critical Lab Alerts', desc: 'Immediate alerts for critical results', control: <Switch value={critAlerts} onValueChange={setCritAlerts} trackColor={{ false: C.border, true: `${C.danger}80` }} thumbColor={critAlerts ? C.danger : '#fff'} /> },
        { label: 'Email Reports', desc: 'Weekly clinical summary via email', control: <Switch value={emailReports} onValueChange={setEmailReports} trackColor={{ false: C.border, true: `${C.primary}80` }} thumbColor={emailReports ? C.primary : '#fff'} /> },
      ],
    },
    {
      title: 'Security',
      items: [
        { label: 'Two-Factor Auth', desc: 'Extra login security', control: <Switch value={twoFA} onValueChange={setTwoFA} trackColor={{ false: C.border, true: `${C.success}80` }} thumbColor={twoFA ? C.success : '#fff'} /> },
        { label: 'Change Password', desc: 'Update your account password', control: <Btn label="Change" variant="ghost" size="sm" /> },
      ],
    },
    {
      title: 'About',
      items: [
        { label: 'App Version', desc: 'Gonep Provider v1.0.0', control: <Badge label="Up to date" color="success" /> },
        { label: 'License', desc: user => 'KMA-GP-20392', control: <Badge label="Active" color="success" /> },
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
                  <Text style={[styles.settingDesc, { color: C.textMuted }]}>{typeof item.desc === 'function' ? item.desc() : item.desc}</Text>
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
