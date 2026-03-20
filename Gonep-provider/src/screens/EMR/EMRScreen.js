import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';
import { Avatar } from '../../atoms/Avatar';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getPatients } from '../../api';

export function EMRScreen() {
  const { C } = useTheme();
  const [patients, setPatients] = useState([]);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { getPatients().then((d) => setPatients(d || [])); }, []);

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (selected) {
    return (
      <ScreenContainer scroll>
        <Btn label="← Back to Patients" onPress={() => setSelected(null)} variant="ghost" size="sm" style={{ marginBottom: 14, alignSelf: 'flex-start' }} />
        <Card style={{ marginBottom: 14 }}>
          <View style={styles.patientHeader}>
            <Avatar name={selected.name} size={56} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.patName, { color: C.text }]}>{selected.name}</Text>
              <View style={styles.badgeRow}>
                <Badge label={`Age ${selected.age}`} color="primary" />
                <Badge label={selected.gender === 'F' ? 'Female' : 'Male'} color="purple" />
                <Badge label={`Blood: ${selected.blood_group}`} color="danger" />
              </View>
              <Text style={[styles.lastVisit, { color: C.textMuted }]}>Last visit: {selected.last_visit}</Text>
            </View>
          </View>
          <View style={[styles.conditionsBox, { backgroundColor: C.bg }]}>
            <Text style={[styles.condTitle, { color: C.textSec }]}>Conditions:</Text>
            {selected.conditions.map((c) => (
              <View key={c} style={styles.condRow}>
                <Icon name="circle" lib="feather" size={8} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.condText, { color: C.text }]}>{c}</Text>
              </View>
            ))}
          </View>
        </Card>
        <Card style={{ marginBottom: 14 }}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Add Clinical Note</Text>
          <Input placeholder="Chief complaint, findings, plan…" value="" onChangeText={() => {}} />
          <Btn label="Save Note" size="sm" style={{ alignSelf: 'flex-start' }} />
        </Card>
        <Card>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Quick Actions</Text>
          <View style={styles.qaRow}>
            <Btn label="Write Prescription" variant="primary" size="sm" style={{ marginRight: 8 }} />
            <Btn label="Order Lab Test"     variant="secondary" size="sm" style={{ marginRight: 8 }} />
            <Btn label="Refer Patient"      variant="ghost" size="sm" />
          </View>
        </Card>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Input placeholder="Search patient by name…" value={search} onChangeText={setSearch} icon="search" />
      {filtered.map((p) => (
        <Card key={p.id} hover onPress={() => setSelected(p)} style={styles.patCard}>
          <View style={styles.patRow}>
            <Avatar name={p.name} size={44} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.patName, { color: C.text }]}>{p.name}</Text>
              <Text style={[styles.patSub, { color: C.textMuted }]}>Age {p.age} · {p.gender === 'F' ? 'Female' : 'Male'} · {p.blood_group}</Text>
              <Text style={[styles.patConditions, { color: C.textSec }]}>{p.conditions.join(', ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.patLastVisit, { color: C.textMuted }]}>{p.last_visit}</Text>
              <Icon name="chevron-right" lib="feather" size={18} color={C.primary} style={{ marginTop: 4 }} />
            </View>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  patCard: { marginBottom: 10, padding: 14 },
  patRow: { flexDirection: 'row', alignItems: 'center' },
  patName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  patSub: { fontSize: 12, marginBottom: 2 },
  patConditions: { fontSize: 12 },
  patLastVisit: { fontSize: 11 },
  patientHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  lastVisit: { fontSize: 11 },
  conditionsBox: { borderRadius: 10, padding: 10 },
  condTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  condRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  condText: { fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  qaRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
