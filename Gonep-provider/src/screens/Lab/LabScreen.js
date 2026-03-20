import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { MOCK_LAB } from '../../mock/data';
import { isOwnDataOnly } from '../../config/roles';

export function LabScreen({ user }) {
  const { C } = useTheme();
  const ownOnly = isOwnDataOnly(user?.role);
  const labs = ownOnly
    ? MOCK_LAB.filter(l => l.doctor_id === user?.id)
    : MOCK_LAB;

  const statusColor = (s) => s === 'critical' ? 'danger' : s === 'high' ? 'warning' : 'success';

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[styles.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your patients' results only</Text>
        </View>
      )}
      {labs.map(l => (
        <Card key={l.id} style={[styles.card, l.critical && { borderLeftWidth: 3, borderLeftColor: C.danger }]}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: l.critical ? C.dangerLight : C.primaryLight }]}>
              <Icon name="flask-outline" lib="mc" size={20} color={l.critical ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.test, { color: C.text }]}>{l.test}</Text>
              <Text style={[styles.patient, { color: C.textSec }]}>{l.patient} · {l.date}</Text>
              <Text style={[styles.result, { color: l.critical ? C.danger : C.text }]}>
                Result: {l.result} <Text style={{ color: C.textMuted }}>(Normal: {l.range})</Text>
              </Text>
            </View>
            <Badge label={l.status} color={statusColor(l.status)} />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scopeNote: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  card:      { marginBottom: 10, padding: 14 },
  row:       { flexDirection: 'row', alignItems: 'center' },
  icon:      { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  test:      { fontSize: 14, fontWeight: '700' },
  patient:   { fontSize: 12, marginTop: 2 },
  result:    { fontSize: 13, marginTop: 4, fontWeight: '500' },
});
