import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { MOCK_PATIENTS } from '../../mock/data';
import { isOwnDataOnly } from '../../config/roles';

export function EMRScreen({ user }) {
  const { C } = useTheme();
  const ownOnly = isOwnDataOnly(user?.role);
  const patients = ownOnly
    ? MOCK_PATIENTS.filter(p => p.doctor_id === user?.id)
    : MOCK_PATIENTS;

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[styles.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your patients only</Text>
        </View>
      )}
      {patients.map(p => (
        <Card key={p.id} hover style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: C.primaryLight }]}>
              <Text style={{ color: C.primary, fontWeight: '800', fontSize: 16 }}>{p.name[0]}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.name, { color: C.text }]}>{p.name}</Text>
              <Text style={[styles.sub, { color: C.textMuted }]}>
                Age {p.age} · {p.gender === 'M' ? 'Male' : 'Female'} · Blood group {p.blood_group}
              </Text>
              <Text style={[styles.visit, { color: C.textSec }]}>Last visit: {p.last_visit}</Text>
              <View style={styles.tags}>
                {p.conditions.map(c => (
                  <View key={c} style={[styles.tag, { backgroundColor: C.primaryLight }]}>
                    <Text style={{ color: C.primary, fontSize: 10, fontWeight: '600' }}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scopeNote: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  card:      { marginBottom: 10, padding: 14 },
  row:       { flexDirection: 'row', alignItems: 'flex-start' },
  avatar:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name:      { fontSize: 15, fontWeight: '700' },
  sub:       { fontSize: 12, marginTop: 2 },
  visit:     { fontSize: 12, marginTop: 2 },
  tags:      { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  tag:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});
