// ─── screens/operations/Staff/molecules/StaffCard.js ─────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../../../atoms/Card';
import { Badge } from '../../../../atoms/Badge';
import { Btn } from '../../../../atoms/Btn';
import { Avatar } from '../../../../atoms/Avatar';
import { Icon } from '../../../../atoms/Icon';
import { useTheme } from '../../../../theme/ThemeContext';
import { ROLE_LABELS, ROLE_COLORS } from '../../../../config/roles';
import { PERMS } from '../../../../constants/staff';

export function StaffCard({ member, onEdit, onSuspend, onReactivate }) {
  const { C } = useTheme();

  const roleColorMap = {
    primary: C.primary,
    purple:  C.purple || '#8B5CF6',
    warning: C.warning,
    success: C.success,
    accent:  C.accent || C.secondary,
  };
  const color = roleColorMap[ROLE_COLORS[member.role]] || C.primary;
  const perms  = PERMS[member.role] || [];

  return (
    <Card style={[s.card, member.suspended && { opacity: 0.6 }]}>
      {/* Avatar + info row */}
      <View style={s.row}>
        <Avatar name={`${member.first_name} ${member.last_name}`} size={44} />
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={1}>
              {member.first_name} {member.last_name}
            </Text>
            <View style={[s.roleTag, { backgroundColor: `${color}18` }]}>
              <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{ROLE_LABELS[member.role]}</Text>
            </View>
            {member.suspended && <Badge label="Suspended" color="danger" />}
          </View>
          <Text style={[s.email, { color: C.textMuted }]} numberOfLines={1}>{member.email}</Text>
          {member.specialty && <Text style={[s.spec, { color: C.textSec }]}>{member.specialty}</Text>}
          {member.license   && <Text style={[s.lic,  { color: C.textMuted }]}>Lic: {member.license}</Text>}
        </View>
      </View>

      {/* Permission chips */}
      <View style={[s.permRow, { borderTopColor: C.divider }]}>
        {perms.map(p => (
          <View key={p.l} style={[s.permChip, { backgroundColor: p.y ? C.successLight : C.bg }]}>
            <Icon name={p.y ? 'check' : 'x'} lib="feather" size={10}
              color={p.y ? C.success : C.textMuted} style={{ marginRight: 3 }} />
            <Text style={{ color: p.y ? C.success : C.textMuted, fontSize: 10, fontWeight: '600' }}>{p.l}</Text>
          </View>
        ))}
      </View>

      {/* Admin actions — hidden for hospital_admin self-card */}
      {member.role !== 'hospital_admin' && (
        <View style={[s.actions, { borderTopColor: C.divider }]}>
          <Btn
            label="Edit" size="sm" variant="ghost"
            icon={<Icon name="edit-2" lib="feather" size={12} color={C.textSec} />}
            onPress={onEdit}
          />
          {member.suspended ? (
            <Btn
              label="Reactivate" size="sm" variant="success"
              icon={<Icon name="user-check" lib="feather" size={12} color="#fff" />}
              onPress={onReactivate}
              style={{ marginLeft: 8 }}
            />
          ) : (
            <Btn
              label="Suspend" size="sm" variant="danger"
              icon={<Icon name="user-x" lib="feather" size={12} color="#fff" />}
              onPress={onSuspend}
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  card:     { marginBottom: 10, padding: 14 },
  row:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  info:     { flex: 1 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  name:     { fontSize: 14, fontWeight: '700' },
  roleTag:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  email:    { fontSize: 12, marginBottom: 2 },
  spec:     { fontSize: 12, fontStyle: 'italic' },
  lic:      { fontSize: 11 },
  permRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTopWidth: 1 },
  permChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actions:  { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
});
