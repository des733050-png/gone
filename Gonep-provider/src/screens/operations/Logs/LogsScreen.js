import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getActivityLogs } from '../../../api';
import { ROLE_LABELS } from '../../../config/roles';

const MODULES = ['All', 'Appointments', 'Prescription', 'Inventory', 'Billing', 'Staff', 'EMR', 'Availability', 'Support'];
const DATE_FILTERS = ['All time', 'Today', 'Yesterday', 'This week', 'This month'];

const ROLE_FILTER_IDS = [
  { id: 'all', label: 'All roles' },
  { id: 'doctor', label: ROLE_LABELS.doctor },
  { id: 'receptionist', label: ROLE_LABELS.receptionist },
  { id: 'facility_admin', label: ROLE_LABELS.facility_admin },
  { id: 'billing_manager', label: ROLE_LABELS.billing_manager },
  { id: 'lab_manager', label: ROLE_LABELS.lab_manager },
];

const MODULE_COLORS = {
  Appointments: 'primary',
  Prescription: 'success',
  Inventory: 'warning',
  Billing: 'danger',
  Staff: 'purple',
  EMR: 'primary',
  Availability: 'success',
  Support: 'primary',
};

const ROLE_COLORS_MAP = {
  hospital_admin: '#1A6FE8',
  facility_admin: '#1A6FE8',
  doctor: '#8B5CF6',
  billing_manager: '#F59E0B',
  lab_manager: '#10B981',
  receptionist: '#F97316',
};

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function mondayOfWeekContaining(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function sundayEndOfWeekContaining(d) {
  const mon = mondayOfWeekContaining(d);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return sun;
}

/** Best-effort instant for log rows (prefers API `occurred_at`). */
function logOccurredAt(log) {
  if (log.occurred_at) {
    const d = new Date(log.occurred_at);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const now = new Date();
  const ts = String(log.ts || '');
  const m = ts.match(/(\d{1,2}):(\d{2})/);
  if (ts.startsWith('Today')) {
    const d = new Date(now);
    if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
  }
  if (ts.startsWith('Yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d;
  }
  const parsed = Date.parse(`${ts} ${now.getFullYear()}`);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

function roleMatchesFilter(logRole, filterId) {
  if (filterId === 'all') return true;
  const r = String(logRole || '');
  if (filterId === 'facility_admin') return r === 'facility_admin' || r === 'hospital_admin';
  return r === filterId;
}

export function LogsScreen({ user: _user }) {
  const { C } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modFilter, setModFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All time');
  const [staffFilter, setStaffFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('all');

  const staffNames = ['All', ...new Set(logs.map(s => s.staff).filter(Boolean))];

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getActivityLogs();
      setLogs(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(log => {
    const modOk = modFilter === 'All' || log.module === modFilter;
    const staffOk = staffFilter === 'All' || log.staff === staffFilter;
    const roleOk = roleMatchesFilter(log.role, roleFilter);

    const now = new Date();
    const od = logOccurredAt(log);
    let dateOk = dateFilter === 'All time';
    if (!dateOk && dateFilter === 'Today') {
      dateOk = (od && startOfLocalDay(od).getTime() === startOfLocalDay(now).getTime()) || String(log.ts || '').startsWith('Today');
    } else if (!dateOk && dateFilter === 'Yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      dateOk =
        (od && startOfLocalDay(od).getTime() === startOfLocalDay(y).getTime()) ||
        String(log.ts || '').startsWith('Yesterday');
    } else if (!dateOk && dateFilter === 'This week') {
      if (od) {
        const t = od.getTime();
        dateOk = t >= mondayOfWeekContaining(now).getTime() && t <= sundayEndOfWeekContaining(now).getTime();
      }
    } else if (!dateOk && dateFilter === 'This month') {
      if (od) {
        dateOk = od.getFullYear() === now.getFullYear() && od.getMonth() === now.getMonth();
      }
    }

    return modOk && staffOk && dateOk && roleOk;
  });

  return (
    <ScreenContainer scroll>
      <View style={s.header}>
        <View>
          <Text style={[s.title, { color: C.text }]}>Activity logs</Text>
          <Text style={[s.sub, { color: C.textMuted }]}>{filtered.length} events · Nairobi General Hospital</Text>
        </View>
        <TouchableOpacity onPress={load}>
          <Icon name="refresh-cw" lib="feather" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {MODULES.map(m => (
          <TouchableOpacity key={m} onPress={() => setModFilter(m)}
            style={[s.pill, { backgroundColor: modFilter === m ? C.primary : C.surface, borderColor: modFilter === m ? C.primary : C.border, marginRight: 6 }]}>
            <Text style={{ color: modFilter === m ? '#fff' : C.textSec, fontWeight: '600', fontSize: 11 }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {DATE_FILTERS.map(d => (
          <TouchableOpacity key={d} onPress={() => setDateFilter(d)}
            style={[s.pill, { backgroundColor: dateFilter === d ? C.primary : C.surface, borderColor: dateFilter === d ? C.primary : C.border, marginRight: 6 }]}>
            <Text style={{ color: dateFilter === d ? '#fff' : C.textSec, fontWeight: '600', fontSize: 11 }}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {ROLE_FILTER_IDS.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => setRoleFilter(r.id)}
            style={[
              s.pill,
              {
                backgroundColor: roleFilter === r.id ? C.textSec : C.surface,
                borderColor: roleFilter === r.id ? C.textSec : C.border,
                marginRight: 6,
              },
            ]}
          >
            <Text style={{ color: roleFilter === r.id ? '#fff' : C.textSec, fontWeight: '600', fontSize: 11 }}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {staffNames.map(n => (
          <TouchableOpacity key={n} onPress={() => setStaffFilter(n)}
            style={[s.pill, { backgroundColor: staffFilter === n ? C.textSec : C.surface, borderColor: staffFilter === n ? C.textSec : C.border, marginRight: 6 }]}>
            <Text style={{ color: staffFilter === n ? '#fff' : C.textSec, fontWeight: '600', fontSize: 11 }}>{n === 'All' ? 'All staff' : n.split(' ').pop()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && (
        <Text style={{ color: C.textMuted, textAlign: 'center', marginVertical: 20 }}>Loading logs…</Text>
      )}

      {!loading && filtered.length === 0 && (
        <View style={s.empty}>
          <Icon name="clipboard" lib="feather" size={36} color={C.textMuted} />
          <Text style={[s.emptyTxt, { color: C.textMuted }]}>No events match your filters</Text>
        </View>
      )}

      {filtered.map(log => {
        const roleColor = ROLE_COLORS_MAP[log.role] || C.textMuted;
        const badgeColor = MODULE_COLORS[log.module] || 'primary';
        return (
          <Card key={log.id} style={[s.logCard, { borderLeftColor: roleColor }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <Badge label={log.module} color={badgeColor} />
                  <Text style={[s.action, { color: C.text }]}>{log.action}</Text>
                </View>
                <Text style={[s.detail, { color: C.textSec }]}>{log.detail}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                  <Text style={[s.staffName, { color: roleColor }]}>{log.staff}</Text>
                  <View style={[s.roleChip, { backgroundColor: `${roleColor}18` }]}>
                    <Text style={{ color: roleColor, fontSize: 10, fontWeight: '700' }}>{ROLE_LABELS[log.role] || log.role}</Text>
                  </View>
                  <Text style={[s.ts, { color: C.textMuted }]}>{log.ts}</Text>
                </View>
              </View>
            </View>
          </Card>
        );
      })}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  title:     { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  sub:       { fontSize: 12 },
  pill:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  logCard:   { marginBottom: 8, padding: 12, borderLeftWidth: 3 },
  action:    { fontSize: 13, fontWeight: '700' },
  detail:    { fontSize: 12, lineHeight: 17 },
  staffName: { fontSize: 11, fontWeight: '700' },
  roleChip:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  ts:        { fontSize: 10 },
  empty:     { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTxt:  { fontSize: 14 },
});
