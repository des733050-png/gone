import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getPrescriptions, dispatchPrescription, appendLog } from '../../../api';
import { isOwnDataOnly } from '../../../config/roles';

const statusColor = s => s === 'dispatched' ? 'success' : 'warning';

export function PharmacyScreen({ user, filter: propFilter }) {
  const { C } = useTheme();
  const ownOnly = isOwnDataOnly(user?.role);
  const [rxs,    setRxs]    = useState([]);
  const [filter, setFilter] = useState(propFilter || 'all');

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

  useEffect(() => {
    getPrescriptions().then(data => {
      const all = (data || []);
      setRxs(ownOnly ? all.filter(r => r.doctor_id === user?.id) : all);
    });
  }, [user]);

  const filtered = rxs.filter(r => {
    if (filter === 'pending_dispatch') return r.status === 'pending_dispatch';
    if (filter === 'dispatched')       return r.status === 'dispatched';
    return true;
  });

  const pendingCount    = rxs.filter(r => r.status === 'pending_dispatch').length;
  const dispatchedCount = rxs.filter(r => r.status === 'dispatched').length;

  const handleDispatch = async (id) => {
    await dispatchPrescription(id);
    const rx = rxs.find(r => r.id === id);
    appendLog({ staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role, module: 'Prescription', action: 'Rx dispatched', detail: `${rx?.drug} for ${rx?.patient}`, type: 'rx' });
    setRxs(prev => prev.map(r => r.id === id ? { ...r, status: 'dispatched' } : r));
  };

  const canDispatch = user?.role === 'lab_manager' || user?.role === 'hospital_admin';

  return (
    <ScreenContainer scroll>
      {ownOnly && (
        <View style={[s.scopeNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
          <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
          <Text style={{ color: C.primary, fontSize: 12 }}>Showing your prescriptions only</Text>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {[
          { id: 'all',              label: 'All' },
          { id: 'pending_dispatch', label: `Pending (${pendingCount})` },
          { id: 'dispatched',       label: `Dispatched (${dispatchedCount})` },
        ].map(f => (
          <Btn key={f.id} label={f.label} variant={filter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => setFilter(f.id)} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {filtered.map(rx => {
        const pend = rx.status === 'pending_dispatch';
        return (
          <Card key={rx.id} style={s.card}>
            <View style={s.row}>
              <View style={[s.icon, { backgroundColor: C.primaryLight }]}>
                <Icon name="pill" lib="mc" size={20} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[s.drug, { color: C.text }]}>{rx.drug}</Text>
                <Text style={[s.sub, { color: C.textSec }]}>{rx.patient} · {rx.qty} {rx.qty === 1 ? 'unit' : 'units'}</Text>
                <Text style={[s.inst, { color: C.textMuted }]}>{rx.instructions} · {rx.date}</Text>
              </View>
              <Badge label={pend ? 'Pending' : 'Dispatched'} color={statusColor(rx.status)} />
            </View>
            {pend && canDispatch && (
              <View style={s.actions}>
                <Btn label="Dispatch now" size="sm" onPress={() => handleDispatch(rx.id)}
                  icon={<Icon name="send" lib="feather" size={13} color="#fff" />} />
                <Btn label="Edit" variant="ghost" size="sm" style={{ marginLeft: 8 }} />
              </View>
            )}
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  scopeNote: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14 },
  card:      { marginBottom: 10, padding: 14 },
  row:       { flexDirection: 'row', alignItems: 'center' },
  icon:      { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  drug:      { fontSize: 14, fontWeight: '700' },
  sub:       { fontSize: 12, marginTop: 2 },
  inst:      { fontSize: 11, marginTop: 2 },
  actions:   { flexDirection: 'row', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
});
