import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { Btn } from '../../atoms/Btn';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getLabResults } from '../../api';

export function LabScreen() {
  const { C } = useTheme();
  const [labs, setLabs]       = useState([]);
  const [filter, setFilter]   = useState('all');

  useEffect(() => { getLabResults().then((d) => setLabs(d || [])); }, []);

  const filtered = filter === 'all' ? labs : labs.filter((l) => l.status === filter);

  const statusColor = { normal: 'success', high: 'warning', critical: 'danger' };
  const statusLabel = { normal: '✓ Normal', high: '↑ High', critical: '⚠ Critical' };

  return (
    <ScreenContainer scroll>
      <View style={styles.filtersRow}>
        {['all', 'critical', 'high', 'normal'].map((f) => (
          <Btn key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} variant={filter === f ? 'primary' : 'ghost'}
            size="sm" onPress={() => setFilter(f)} style={{ marginRight: 6 }} />
        ))}
      </View>
      {labs.filter((l) => l.critical).length > 0 && filter !== 'normal' && (
        <Card style={[styles.critBanner, { backgroundColor: C.dangerLight, borderColor: `${C.danger}60` }]}>
          <Icon name="alert-circle" lib="feather" size={16} color={C.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.critText, { color: C.danger }]}>{labs.filter((l) => l.critical).length} critical result(s) require immediate attention</Text>
        </Card>
      )}
      {filtered.map((l) => (
        <Card key={l.id} style={[styles.labCard, l.critical && { borderColor: `${C.danger}60`, borderWidth: 2 }]}>
          <View style={styles.labRow}>
            <View style={[styles.labIcon, { backgroundColor: l.critical ? C.dangerLight : l.status === 'high' ? C.warningLight : C.successLight }]}>
              <Icon name="flask-outline" lib="mc" size={22} color={l.critical ? C.danger : l.status === 'high' ? C.warning : C.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.labTest, { color: C.text }]}>{l.test}</Text>
              <Text style={[styles.labPatient, { color: C.textMuted }]}>{l.patient} · {l.date}</Text>
              <View style={styles.labResultRow}>
                <Text style={[styles.labResult, { color: l.critical ? C.danger : l.status === 'high' ? C.warning : C.success }]}>{l.result}</Text>
                <Text style={[styles.labRange, { color: C.textMuted }]}> (ref: {l.range})</Text>
              </View>
            </View>
            <Badge label={statusLabel[l.status] || l.status} color={statusColor[l.status] || 'primary'} />
          </View>
          {l.critical && (
            <Btn label="Notify Patient" variant="danger" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }}
              icon={<Icon name="phone" lib="feather" size={14} color="#fff" />} />
          )}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  critBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1 },
  critText: { fontSize: 13, fontWeight: '600', flex: 1 },
  labCard: { marginBottom: 10, padding: 14 },
  labRow: { flexDirection: 'row', alignItems: 'flex-start' },
  labIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  labTest: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  labPatient: { fontSize: 12, marginBottom: 4 },
  labResultRow: { flexDirection: 'row', alignItems: 'baseline' },
  labResult: { fontSize: 16, fontWeight: '800' },
  labRange: { fontSize: 11 },
});
