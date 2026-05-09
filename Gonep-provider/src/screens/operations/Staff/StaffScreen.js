// ─── screens/operations/Staff/StaffScreen.js ─────────────────────────────────
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Icon } from '../../../atoms/Icon';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { PageHeader } from '../../../molecules/PageHeader';
import { SearchBar }  from '../../../molecules/SearchBar';
import { EmptyState } from '../../../molecules/EmptyState';
import { useStaff } from '../../../hooks/useStaff';
import { ROLE_LABELS } from '../../../config/roles';
import { ROLE_FILTER_OPTIONS } from '../../../constants/staff';
import { StaffCard }         from './molecules/StaffCard';
import { PosSection }        from './molecules/PosSection';
import { EditMemberModal, AddMemberModal } from './molecules/StaffModals';
import { s } from './styles';

// Hardcoded admin user for POS section — in production would come from auth context
const ADMIN_USER = {
  first_name: 'Admin', last_name: '', id: 'usr-HA-001',
  role: 'hospital_admin', facility: 'Nairobi General Hospital', hospital_id: 'hosp-001',
};

export function StaffScreen({ filter: propFilter, user }) {
  const { C } = useTheme();
  const staff = useStaff(propFilter, user);

  return (
    <ScreenContainer scroll>
      <PageHeader
        title="Staff & Roles"
        subtitle={`${staff.staffList.length} team members`}
        action={
          <Btn
            label="Add member"
            icon={<Icon name="user-plus" lib="feather" size={14} color="#fff" />}
            size="sm"
            onPress={() => staff.setAddModal(true)}
          />
        }
      />

      {/* Role filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingRight: 16 }}>
        {ROLE_FILTER_OPTIONS.map(r => {
          const active = staff.filter === r;
          return (
            <TouchableOpacity key={r} onPress={() => staff.setFilter(r)}
              style={[s.filterPill, {
                backgroundColor: active ? C.primary : C.surface,
                borderColor:     active ? C.primary : C.border,
              }]}>
              <Text style={{ color: active ? '#fff' : C.textSec, fontSize: 12, fontWeight: '600' }}>
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </Text>
              <View style={[s.pillCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : C.bg }]}>
                <Text style={{ color: active ? '#fff' : C.textMuted, fontSize: 10, fontWeight: '700' }}>
                  {staff.counts[r]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SearchBar
        value={staff.search}
        onChangeText={staff.setSearch}
        placeholder="Search by name or email…"
      />
      {staff.loading && <Text style={{ color: C.textMuted, marginBottom: 10 }}>Loading staff...</Text>}
      {!!staff.error && <Text style={{ color: C.danger, marginBottom: 10 }}>{staff.error}</Text>}

      {staff.filtered.map(member => (
        <StaffCard
          key={member.id}
          member={member}
          onEdit={() => staff.setEditModal({ visible: true, member })}
          onSuspend={() => staff.handleSuspend(member.id)}
          onReactivate={() => staff.handleReactivate(member.id)}
          onResetPassword={() => staff.handleResetPassword(member.id)}
        />
      ))}

      {staff.filtered.length === 0 && (
        <EmptyState icon="users" message="No staff members match your filters" />
      )}

      {/* POS terminal management */}
      <PosSection user={ADMIN_USER} />

      {/* Modals */}
      <AddMemberModal
        visible={staff.addModal}
        user={user}
        onClose={() => staff.setAddModal(false)}
        onAdd={staff.addMember}
      />
      {staff.editModal.member && (
        <EditMemberModal
          visible={staff.editModal.visible}
          member={staff.editModal.member}
          user={user}
          onClose={() => staff.setEditModal({ visible: false, member: null })}
          onSave={staff.editMember}
        />
      )}

      {/* Password reset reveal modal */}
      <Modal
        visible={!!staff.passwordReset}
        transparent
        animationType="fade"
        onRequestClose={staff.dismissPasswordReset}
      >
        <View style={pwm.backdrop}>
          <View style={[pwm.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[pwm.title, { color: C.text }]}>New temporary password</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
              For: <Text style={{ color: C.text, fontWeight: '700' }}>{staff.passwordReset?.memberName}</Text>{' '}
              ({staff.passwordReset?.email})
            </Text>
            <View style={[pwm.pwBox, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text selectable style={{ fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: 1 }}>
                {staff.passwordReset?.password || '—'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                try {
                  if (typeof navigator !== 'undefined' && navigator?.clipboard) {
                    navigator.clipboard.writeText(staff.passwordReset?.password || '');
                  }
                } catch (_) {}
              }}
              style={[pwm.copyBtn, { borderColor: C.primary }]}
            >
              <Icon name="copy" lib="feather" size={12} color={C.primary} />
              <Text style={{ color: C.primary, fontSize: 12, fontWeight: '700', marginLeft: 6 }}>
                Copy password
              </Text>
            </TouchableOpacity>
            {staff.passwordReset?.note ? (
              <Text style={{ color: C.warning, fontSize: 11, marginTop: 10 }}>{staff.passwordReset.note}</Text>
            ) : null}
            <Btn label="Done" onPress={staff.dismissPasswordReset} full style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const pwm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card:     { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 14, padding: 18 },
  title:    { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  pwBox:    { borderWidth: 1.5, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 8 },
  copyBtn:  { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
});
