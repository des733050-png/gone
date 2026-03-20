import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { MOCK_PRESCRIPTIONS } from '../../mock/data';
import { isOwnDataOnly } from '../../config/roles';

export function PharmacyScreen({ user }) {
  const { C } = useTheme();
  const ownOnly = isOwnDataOnly(user?.role);
  const prescriptions = ownOnly
    ? MOCK_PRESCRIPTIONS.filter(p => p.doctor_id === user?.id)
    : MOCK_PRESCRIPTIONS;

  const statusColor = (s) => s === 'dispatched' ? 'success' : 'warning';

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[styles.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your prescriptions only</Text>
        </View>
      )}
      {prescriptions.map(rx => (
        <Card key={rx.id} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.icon, { backgroundColor: C.primaryLight }]}>
              <Icon name="pill" lib="mc" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.drug, { color: C.text }]}>{rx.drug}</Text>
              <Text style={[styles.sub, { color: C.textSec }]}>{rx.patient} · {rx.qty} {rx.qty === 1 ? 'unit' : 'units'}</Text>
              <Text style={[styles.inst, { color: C.textMuted }]}>{rx.instructions} · {rx.date}</Text>
            </View>
            <Badge label={rx.status === 'dispatched' ? 'Dispatched' : 'Pending'} color={statusColor(rx.status)} />
          </View>
          {rx.status === 'pending_dispatch' && (
            <View style={styles.actions}>
              <Btn label="Dispatch now" size="sm"
                icon={<Icon name="send" lib="feather" size={13} color="#fff" />} />
              <Btn label="Edit" variant="ghost" size="sm" style={{ marginLeft: 8 }} />
            </View>
          )}
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
  drug:      { fontSize: 14, fontWeight: '700' },
  sub:       { fontSize: 12, marginTop: 2 },
  inst:      { fontSize: 11, marginTop: 2 },
  actions:   { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
});
