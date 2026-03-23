import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getLabResults } from '../../../api';
import { isOwnDataOnly } from '../../../config/roles';

const statusColor = s => s === 'critical' ? 'danger' : s === 'high' ? 'warning' : 'success';

export function LabScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const ownOnly = isOwnDataOnly(user?.role);
  const [labs,   setLabs]   = useState([]);
  const [filter, setFilter] = useState(propFilter || 'all');

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

  useEffect(() => {
    getLabResults().then(data => {
      const all = (data || []);
      setLabs(ownOnly ? all.filter(l => l.doctor_id === user?.id) : all);
    });
  }, [user]);

  const filtered = labs.filter(l => {
    if (filter === 'critical') return l.critical;
    if (filter === 'normal')   return l.status === 'normal';
    return true;
  });

  const criticalCount = labs.filter(l => l.critical).length;

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[s.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your patients' results only</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {[
          { id: 'all',      label: 'All results' },
          { id: 'critical', label: `Critical (${criticalCount})` },
          { id: 'normal',   label: 'Normal' },
        ].map(f => (
          <Btn key={f.id} label={f.label} variant={filter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => setFilter(f.id)} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {filtered.map(l => (
        <Card key={l.id} style={[s.card, l.critical && { borderLeftWidth: 3, borderLeftColor: C.danger }]}>
          <View style={s.row}>
            <View style={[s.icon, { backgroundColor: l.critical ? C.dangerLight : C.primaryLight }]}>
              <Icon name="flask-outline" lib="mc" size={20} color={l.critical ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.test, { color: C.text }]}>{l.test}</Text>
              <Text style={[s.patient, { color: C.textSec }]}>{l.patient} · {l.date}</Text>
              <Text style={[s.result, { color: l.critical ? C.danger : C.text }]}>
                Result: {l.result}{' '}
                <Text style={{ color: C.textMuted, fontWeight: '400' }}>(Normal: {l.range})</Text>
              </Text>
            </View>
            <Badge label={l.status} color={statusColor(l.status)} />
          </View>
          {l.critical && (
            <View style={[s.critBanner, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
              <Icon name="alert-circle" lib="feather" size={13} color={C.danger} style={{ marginRight: 6 }} />
              <Text style={{ color: C.danger, fontSize: 12, flex: 1 }}>Critical — immediate review required</Text>
              <Btn label="Acknowledge" size="sm" variant="danger" />
            </View>
          )}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  scopeNote:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  card:       { marginBottom: 10, padding: 14 },
  row:        { flexDirection: 'row', alignItems: 'center' },
  icon:       { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  test:       { fontSize: 14, fontWeight: '700' },
  patient:    { fontSize: 12, marginTop: 2 },
  result:     { fontSize: 13, marginTop: 4, fontWeight: '500' },
  critBanner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 10 },
});
