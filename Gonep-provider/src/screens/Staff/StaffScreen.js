import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { MOCK_STAFF } from '../../mock/data';
import { ROLE_LABELS, ROLE_COLORS } from '../../config/roles';

const ROLE_FILTER_OPTIONS = ['all', 'doctor', 'billing_manager', 'lab_manager', 'receptionist'];

export function StaffScreen() {
  const { C } = useTheme();
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newRole, setNewRole]   = useState('doctor');

  const roleColorMap = {
    primary: C.primary, purple: C.purple || '#8B5CF6',
    warning: C.warning, success: C.success, accent: C.accent || C.secondary,
  };

  const filtered = MOCK_STAFF.filter(s => {
    const matchRole   = filter === 'all' || s.role === filter;
    const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTER_OPTIONS.reduce((acc, r) => {
    acc[r] = r === 'all' ? MOCK_STAFF.length : MOCK_STAFF.filter(s => s.role === r).length;
    return acc;
  }, {});

  return (
    <ScreenContainer scroll>

      {/* Header */}
      <View style={styles.pageHead}>
        <View>
          <Text style={[styles.pageTitle, { color: C.text }]}>Staff & Roles</Text>
          <Text style={[styles.pageSub,   { color: C.textMuted }]}>
            {MOCK_STAFF.length} team members · Nairobi General Hospital
          </Text>
        </View>
        <Btn
          label="Add member"
          icon={<Icon name="user-plus" lib="feather" size={14} color="#fff" />}
          size="sm"
          onPress={() => setShowModal(true)}
        />
      </View>

      {/* Role filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingRight: 16 }}>
        {ROLE_FILTER_OPTIONS.map(r => {
          const active = filter === r;
          return (
            <TouchableOpacity
              key={r}
              onPress={() => setFilter(r)}
              style={[
                styles.filterPill,
                { backgroundColor: active ? C.primary : C.surface, borderColor: active ? C.primary : C.border },
              ]}
            >
              <Text style={{ color: active ? '#fff' : C.textSec, fontSize: 12, fontWeight: '600' }}>
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </Text>
              <View style={[styles.pillCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : C.bg }]}>
                <Text style={{ color: active ? '#fff' : C.textMuted, fontSize: 10, fontWeight: '700' }}>{counts[r]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Icon name="search" lib="feather" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          placeholder="Search by name or email…"
          placeholderTextColor={C.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="x" lib="feather" size={14} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Staff list */}
      {filtered.map(member => {
        const color = roleColorMap[ROLE_COLORS[member.role]] || C.primary;
        return (
          <Card key={member.id} style={styles.staffCard}>
            <View style={styles.staffRow}>
              <Avatar name={`${member.first_name} ${member.last_name}`} size={44} />
              <View style={styles.staffInfo}>
                <View style={styles.staffNameRow}>
                  <Text style={[styles.staffName, { color: C.text }]} numberOfLines={1}>
                    {member.first_name} {member.last_name}
                  </Text>
                  <View style={[styles.roleTag, { backgroundColor: `${color}18` }]}>
                    <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{ROLE_LABELS[member.role]}</Text>
                  </View>
                </View>
                <Text style={[styles.staffEmail, { color: C.textMuted }]} numberOfLines={1}>{member.email}</Text>
                {member.specialty && (
                  <Text style={[styles.staffSpec, { color: C.textSec }]}>{member.specialty}</Text>
                )}
                {member.license && (
                  <Text style={[styles.staffLic, { color: C.textMuted }]}>Lic: {member.license}</Text>
                )}
                {member.affiliated_hospitals && member.affiliated_hospitals.length > 1 && (
                  <Text style={[styles.staffAffil, { color: C.primary }]}>
                    Affiliated with {member.affiliated_hospitals.length} hospitals
                  </Text>
                )}
              </View>
              <TouchableOpacity style={[styles.menuBtn, { borderColor: C.border }]}>
                <Icon name="more-vertical" lib="feather" size={16} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Permissions summary */}
            <View style={[styles.permRow, { borderTopColor: C.divider }]}>
              {getPermissionSummary(member.role).map(p => (
                <View key={p.label} style={[styles.permChip, { backgroundColor: p.allowed ? C.successLight : C.bg }]}>
                  <Icon
                    name={p.allowed ? 'check' : 'x'}
                    lib="feather"
                    size={10}
                    color={p.allowed ? C.success : C.textMuted}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={{ color: p.allowed ? C.success : C.textMuted, fontSize: 10, fontWeight: '600' }}>
                    {p.label}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <View style={styles.empty}>
          <Icon name="users" lib="feather" size={36} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>No staff members match your filters</Text>
        </View>
      )}

      {/* Add member modal */}
      {showModal && (
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModal(false)} activeOpacity={1}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <View style={[styles.modal, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.modalHead}>
                <Text style={[styles.modalTitle, { color: C.text }]}>Add team member</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Icon name="x" lib="feather" size={18} color={C.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSub, { color: C.textMuted }]}>
                Select a role. The new member will receive an invitation email with login instructions.
              </Text>

              <Text style={[styles.fieldLabel, { color: C.textSec }]}>Role</Text>
              <View style={styles.roleGrid}>
                {['doctor', 'billing_manager', 'lab_manager', 'receptionist'].map(r => {
                  const color2 = roleColorMap[ROLE_COLORS[r]] || C.primary;
                  const active = newRole === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setNewRole(r)}
                      style={[styles.roleOption, {
                        borderColor: active ? color2 : C.border,
                        backgroundColor: active ? `${color2}12` : C.surface,
                      }]}
                    >
                      <Text style={{ color: active ? color2 : C.textSec, fontWeight: '700', fontSize: 12 }}>
                        {ROLE_LABELS[r]}
                      </Text>
                      <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>
                        {ROLE_DESC[r]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.accessNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
                <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>
                  {ACCESS_NOTES[newRole]}
                </Text>
              </View>

              <Btn label="Send invitation" full style={{ marginTop: 12 }} onPress={() => setShowModal(false)} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </ScreenContainer>
  );
}

// Permission summary chips for each role
function getPermissionSummary(role) {
  const map = {
    hospital_admin:  [
      { label: 'Full access',    allowed: true  },
      { label: 'Billing',        allowed: true  },
      { label: 'Staff mgmt',     allowed: true  },
      { label: 'Settings',       allowed: true  },
    ],
    doctor:          [
      { label: 'Own patients',   allowed: true  },
      { label: 'Rx & EMR',       allowed: true  },
      { label: 'Billing',        allowed: false },
      { label: 'Settings',       allowed: false },
    ],
    billing_manager: [
      { label: 'Billing',        allowed: true  },
      { label: 'Invoices',       allowed: true  },
      { label: 'Clinical',       allowed: false },
      { label: 'Settings',       allowed: false },
    ],
    lab_manager:     [
      { label: 'Lab results',    allowed: true  },
      { label: 'Inventory',      allowed: true  },
      { label: 'Billing',        allowed: false },
      { label: 'Settings',       allowed: false },
    ],
    receptionist:    [
      { label: 'Scheduling',     allowed: true  },
      { label: 'Appointments',   allowed: true  },
      { label: 'Clinical',       allowed: false },
      { label: 'Billing',        allowed: false },
    ],
  };
  return map[role] || [];
}

const ROLE_DESC = {
  doctor:          'Appointments, Rx, EMR, own patients only',
  billing_manager: 'Billing and invoices only',
  lab_manager:     'Lab results, inventory, pharmacy',
  receptionist:    'Appointment scheduling only',
};

const ACCESS_NOTES = {
  doctor:          'This doctor will only see their own patients, appointments, and prescriptions. Billing and settings are hidden.',
  billing_manager: 'Access is limited to the Billing screen. All clinical and administrative screens are hidden.',
  lab_manager:     'Can manage lab results, inventory stock, and pharmacy items. Cannot access billing or clinical records.',
  receptionist:    'Can view and schedule appointments, including unassigned ones. No access to clinical or financial data.',
};

const styles = StyleSheet.create({
  pageHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle:    { fontSize: 20, fontWeight: '800' },
  pageSub:      { fontSize: 12, marginTop: 2 },
  filterRow:    { marginBottom: 12 },
  filterPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, marginRight: 8 },
  pillCount:    { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99 },
  searchWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  searchInput:  { flex: 1, fontSize: 14 },
  staffCard:    { marginBottom: 10, padding: 14 },
  staffRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  staffInfo:    { flex: 1 },
  staffNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  staffName:    { fontSize: 14, fontWeight: '700' },
  roleTag:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  staffEmail:   { fontSize: 12, marginBottom: 2 },
  staffSpec:    { fontSize: 12, fontStyle: 'italic' },
  staffLic:     { fontSize: 11 },
  staffAffil:   { fontSize: 11, marginTop: 2 },
  menuBtn:      { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  permRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  permChip:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  empty:        { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:    { fontSize: 14 },
  modalOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 50, justifyContent: 'center', alignItems: 'center', flex: 1 },
  modal:        { width: 360, borderRadius: 16, borderWidth: 1, padding: 20, maxWidth: '90%' },
  modalHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle:   { fontSize: 16, fontWeight: '700' },
  modalSub:     { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  fieldLabel:   { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  roleGrid:     { gap: 8, marginBottom: 12 },
  roleOption:   { borderWidth: 1.5, borderRadius: 10, padding: 10 },
  accessNote:   { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10 },
});
