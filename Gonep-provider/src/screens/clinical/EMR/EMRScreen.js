// ─── EMRScreen.js ─────────────────────────────────────────────────────────────
// Lists all accessible patients. Tapping a patient opens PatientDetailScreen
// as a full new screen (managed via local state — no router needed).
// Role-gated: doctors see own patients only; admin sees all.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { isOwnDataOnly } from '../../../config/roles';
import { getPatients } from '../../../api';
import { PatientDetailScreen } from './PatientDetailScreen';

// Role descriptions shown on the EMR list
const ROLE_SCOPE = {
  hospital_admin:  'All patients — full records',
  doctor:          'Your patients — full SOAP notes',
  lab_manager:     'All patients — no clinical notes',
  receptionist:    'All patients — basic info only',
  billing_manager: 'All patients — billing info only',
};

export function EMRScreen({ user }) {
  const { C } = useTheme();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [search, setSearch] = useState('');
  const [patientsData, setPatientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const ownOnly  = isOwnDataOnly(user?.role);
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getPatients()
      .then((rows) => {
        if (mounted) setPatientsData(rows || []);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Unable to load patient records.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const patients = useMemo(() => patientsData.filter(p => {
    const matchRole = ownOnly ? p.doctor_id === user?.id : true;
    const matchSearch = !search.trim() ||
      String(p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.conditions || []).some(c => c.toLowerCase().includes(search.toLowerCase()));
    return matchRole && matchSearch;
  }), [patientsData, ownOnly, search, user?.id]);

  // ── Patient detail screen ─────────────────────────────────────────────────
  if (selectedPatient) {
    return (
      <PatientDetailScreen
        patient={selectedPatient}
        user={user}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  // ── EMR list ──────────────────────────────────────────────────────────────
  return (
    <ScreenContainer scroll>
      {/* Scope note */}
      <View style={[styles.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
        <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
        <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>
          {ROLE_SCOPE[user?.role] || 'Patient records'}
        </Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Icon name="search" lib="feather" size={14} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or condition…"
          placeholderTextColor={C.textMuted}
          style={[styles.searchInput, { color: C.text }]}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="x" lib="feather" size={14} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && (
        <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading patient records...</Text>
      )}
      {!!error && (
        <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text>
      )}

      {!loading && !error && patients.length === 0 && (
        <View style={styles.empty}>
          <Icon name="users" lib="feather" size={36} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No patients found</Text>
        </View>
      )}

      {patients.map(p => (
        <Card key={p.id} hover onPress={() => setSelectedPatient(p)} style={styles.card}>
          <View style={styles.row}>
            {/* Avatar initial */}
            <View style={[styles.avatar, { backgroundColor: C.primaryLight }]}>
              <Text style={{ color: C.primary, fontWeight: '800', fontSize: 16 }}>{p.name[0]}</Text>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.name, { color: C.text }]}>{p.name}</Text>
              <Text style={[styles.sub, { color: C.textMuted }]}>
                Age {p.age} · {p.gender === 'F' ? 'Female' : 'Male'} · {p.blood_group}
              </Text>
              <Text style={[styles.visit, { color: C.textSec }]}>Last visit: {p.last_visit}</Text>

              {/* Conditions */}
              {(p.conditions || []).length > 0 && (
                <View style={styles.tags}>
                  {p.conditions.map(c => (
                    <View key={c} style={[styles.tag, { backgroundColor: C.primaryLight }]}>
                      <Text style={{ color: C.primary, fontSize: 10, fontWeight: '600' }}>{c}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Allergy warning */}
              {(p.allergies || []).length > 0 && (
                <View style={[styles.allergyRow, { backgroundColor: C.dangerLight }]}>
                  <Icon name="alert-triangle" lib="feather" size={10} color={C.danger} style={{ marginRight: 4 }} />
                  <Text style={{ color: C.danger, fontSize: 10, fontWeight: '600' }}>
                    Allergies: {p.allergies.join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {/* View arrow */}
            <View style={[styles.viewBtn, { backgroundColor: C.primaryLight }]}>
              <Icon name="chevron-right" lib="feather" size={16} color={C.primary} />
            </View>
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scopeNote:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 13 },
  card:        { marginBottom: 10, padding: 14 },
  row:         { flexDirection: 'row', alignItems: 'flex-start' },
  avatar:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  name:        { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  sub:         { fontSize: 12, marginBottom: 2 },
  visit:       { fontSize: 12, marginBottom: 6 },
  tags:        { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  tag:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  allergyRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  viewBtn:     { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 8, alignSelf: 'center' },
  empty:       { alignItems: 'center', paddingVertical: 48 },
});
