// ─── screens/operations/Staff/StaffScreen.js ─────────────────────────────────
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
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

export function StaffScreen({ filter: propFilter }) {
  const { C } = useTheme();
  const staff = useStaff(propFilter);

  return (
    <ScreenContainer scroll>
      <PageHeader
        title="Staff & Roles"
        subtitle={`${staff.staffList.length} team members · Nairobi General Hospital`}
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

      {staff.filtered.map(member => (
        <StaffCard
          key={member.id}
          member={member}
          onEdit={() => staff.setEditModal({ visible: true, member })}
          onSuspend={() => staff.handleSuspend(member.id)}
          onReactivate={() => staff.handleReactivate(member.id)}
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
        onClose={() => staff.setAddModal(false)}
        onAdd={staff.addMember}
      />
      {staff.editModal.member && (
        <EditMemberModal
          visible={staff.editModal.visible}
          member={staff.editModal.member}
          onClose={() => staff.setEditModal({ visible: false, member: null })}
          onSave={staff.editMember}
        />
      )}
    </ScreenContainer>
  );
}
