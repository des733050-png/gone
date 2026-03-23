import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Avatar } from '../../../atoms/Avatar';
import { Icon } from '../../../atoms/Icon';
import { Input } from '../../../atoms/Input';
import { MOCK_STAFF } from '../../../mock/data';
import { ROLE_LABELS, ROLE_COLORS } from '../../../config/roles';
import { updateStaff, addStaffMember, suspendStaff, reactivateStaff, appendLog,
         getPosAccounts, createPosAccount, resetPosPassword } from '../../../api';
import { MOCK_POS_ACCOUNTS } from '../../../mock/data';

const ROLE_OPTS = ['doctor', 'billing_manager', 'lab_manager', 'receptionist'];
const ROLE_FILTER_OPTIONS = ['all', 'doctor', 'billing_manager', 'lab_manager', 'receptionist'];

const PERMS = {
  hospital_admin:  [{ l:'Full access',y:true},{l:'Billing',y:true},{l:'Staff mgmt',y:true},{l:'Settings',y:true}],
  doctor:          [{ l:'Own patients',y:true},{l:'Rx & EMR',y:true},{l:'Billing',y:false},{l:'Settings',y:false}],
  billing_manager: [{ l:'Billing',y:true},{l:'Invoices',y:true},{l:'Clinical',y:false},{l:'Settings',y:false}],
  lab_manager:     [{ l:'Lab results',y:true},{l:'Inventory',y:true},{l:'Billing',y:false},{l:'Settings',y:false}],
  receptionist:    [{ l:'Scheduling',y:true},{l:'Appointments',y:true},{l:'Clinical',y:false},{l:'Billing',y:false}],
};

const ROLE_DESC = {
  doctor:          'Appointments, Rx, EMR, own patients only',
  billing_manager: 'Billing and invoices only',
  lab_manager:     'Lab results, inventory, pharmacy',
  receptionist:    'Appointment scheduling only',
};

function EditMemberModal({ visible, member, onClose, onSave }) {
  const { C } = useTheme();
  const [form,   setForm]   = useState({ ...member });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await updateStaff(member.id, form);
    appendLog({ staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin', module: 'Staff', action: 'Staff details edited', detail: `${form.first_name} ${form.last_name}`, type: 'staff' });
    setSaving(false);
    onSave(form);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <ScrollView>
          <View style={{ flex: 1, justifyContent: 'flex-end', minHeight: 500 }}>
            <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={s.handle} />
              <Text style={[s.sheetTitle, { color: C.text }]}>Edit member</Text>
              <Input label="First name" value={form.first_name} onChangeText={v => set('first_name', v)} icon="user" />
              <Input label="Last name"  value={form.last_name}  onChangeText={v => set('last_name', v)} />
              <Input label="Phone"      value={form.phone || ''} onChangeText={v => set('phone', v)} icon="phone" keyboardType="phone-pad" />
              {form.specialty !== undefined && (
                <Input label="Specialty" value={form.specialty || ''} onChangeText={v => set('specialty', v)} icon="activity" />
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function AddMemberModal({ visible, onClose, onAdd }) {
  const { C } = useTheme();
  const [role,      setRole]      = useState('doctor');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [specialty, setSpecialty] = useState('');
  const [license,   setLicense]   = useState('');
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  const handleAdd = async () => {
    if (!firstName.trim() || !email.trim()) { setErr('Name and email are required.'); return; }
    setSaving(true);
    const member = await addStaffMember({ role, first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), phone, specialty: specialty || null, license: license || null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001' });
    appendLog({ staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin', module: 'Staff', action: 'Account created', detail: `${firstName} ${lastName} — ${ROLE_LABELS[role]}`, type: 'staff' });
    setSaving(false);
    onAdd(member);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <ScrollView>
          <View style={{ flex: 1, justifyContent: 'flex-end', minHeight: 600 }}>
            <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={s.handle} />
              <Text style={[s.sheetTitle, { color: C.text }]}>Add team member</Text>
              <Text style={[s.sheetSub, { color: C.textMuted }]}>They'll receive an invitation email.</Text>

              <Text style={[s.fieldLbl, { color: C.textMuted }]}>Role</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {ROLE_OPTS.map(r => (
                  <TouchableOpacity key={r} onPress={() => setRole(r)}
                    style={[s.rolePill, { backgroundColor: role === r ? C.primary : C.surface, borderColor: role === r ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: role === r ? '#fff' : C.textSec, fontSize: 11, fontWeight: '700' }}>{ROLE_LABELS[r]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={[s.accessNote, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
                <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>{ROLE_DESC[role]}</Text>
              </View>

              <Input label="First name *" value={firstName} onChangeText={setFirstName} icon="user" />
              <Input label="Last name"    value={lastName}  onChangeText={setLastName} />
              <Input label="Email *"      value={email}     onChangeText={setEmail} icon="mail" keyboardType="email-address" />
              <Input label="Phone"        value={phone}     onChangeText={setPhone} icon="phone" keyboardType="phone-pad" />
              {role === 'doctor' && (
                <>
                  <Input label="Specialty"     value={specialty} onChangeText={setSpecialty} icon="activity" />
                  <Input label="KMA licence no." value={license} onChangeText={setLicense}   icon="award" />
                </>
              )}

              {err ? <Text style={[s.errTxt, { color: C.danger }]}>{err}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Adding…' : 'Send invitation'} onPress={handleAdd} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── POS account section ─────────────────────────────────────────────────────
function PosSection({ user, C }) {
  const [posAccounts, setPosAccounts] = React.useState(MOCK_POS_ACCOUNTS.map(a => ({...a})));
  const [addModal,    setAddModal]    = React.useState(false);
  const [name,        setName]        = React.useState('');
  const [email,       setEmail]       = React.useState('');
  const [saving,      setSaving]      = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const a = await createPosAccount({
      name: name.trim(), email: email.trim(),
      facility: user.facility, hospital_id: user.hospital_id,
      role: 'pos', created_by: user.id,
    });
    appendLog({ staff: user.first_name + ' ' + user.last_name, staff_id: user.id, role: user.role,
      module: 'Staff', action: 'POS account created', detail: name.trim(), type: 'staff' });
    setPosAccounts(prev => [...prev, a]);
    setName(''); setEmail(''); setAddModal(false); setSaving(false);
  };

  const handleReset = async (id) => {
    await resetPosPassword(id);
    appendLog({ staff: user.first_name + ' ' + user.last_name, staff_id: user.id, role: user.role,
      module: 'Staff', action: 'POS password reset', detail: posAccounts.find(a=>a.id===id)?.name, type: 'staff' });
  };

  const { useTheme: ut } = require('../../../theme/ThemeContext');

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>POS Terminals</Text>
        <Btn label="+ New POS" size="sm" onPress={() => setAddModal(true)} />
      </View>
      {posAccounts.map(pos => (
        <Card key={pos.id} style={{ marginBottom: 8, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[ps.posIcon, { backgroundColor: C.primaryLight }]}>
              <Icon name="monitor" lib="feather" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{pos.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>{pos.email}</Text>
              <Text style={{ fontSize: 10, color: C.textMuted }}>Created {pos.created_at?.slice(0,10)}</Text>
            </View>
            <Badge label={pos.active ? 'Active' : 'Inactive'} color={pos.active ? 'success' : 'danger'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.divider }}>
            <Btn label="Reset password" size="sm" variant="ghost" onPress={() => handleReset(pos.id)} />
            <Btn label={pos.active ? 'Deactivate' : 'Activate'} size="sm" variant={pos.active ? 'danger' : 'success'}
              onPress={() => setPosAccounts(prev => prev.map(a => a.id===pos.id?{...a,active:!a.active}:a))} />
          </View>
        </Card>
      ))}
      {addModal && (
        <Modal visible transparent animationType="slide">
          <View style={ps.backdrop}>
            <View style={[ps.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[ps.title, { color: C.text }]}>New POS terminal</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Terminal name (e.g. Main Reception Till)"
                style={[ps.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} />
              <TextInput value={email} onChangeText={setEmail} placeholder="Login email for this terminal"
                style={[ps.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]} placeholderTextColor={C.textMuted} keyboardType="email-address" />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="ghost" onPress={() => setAddModal(false)} style={{ flex: 1 }} />
                <Btn label={saving ? 'Creating…' : 'Create terminal'} onPress={handleCreate} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const ps = StyleSheet.create({
  posIcon:  { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 32 },
  title:    { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  inp:      { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 },
});

export function StaffScreen({ filter: propFilter }) {
  const { C } = useTheme();
  const [staffList,  setStaffList]  = useState(MOCK_STAFF.map(m => ({ ...m, suspended: false })));
  const [filter,     setFilter]     = useState(propFilter || 'all');
  const [search,     setSearch]     = useState('');
  const [addModal,   setAddModal]   = useState(false);
  const [editModal,  setEditModal]  = useState({ visible: false, member: null });

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

  const roleColorMap = { primary: C.primary, purple: C.purple || '#8B5CF6', warning: C.warning, success: C.success, accent: C.accent || C.secondary };

  const filtered = staffList.filter(m => {
    const matchRole   = filter === 'all' || m.role === filter;
    const matchSearch = !search || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const counts = ROLE_FILTER_OPTIONS.reduce((acc, r) => {
    acc[r] = r === 'all' ? staffList.length : staffList.filter(m => m.role === r).length;
    return acc;
  }, {});

  const handleSuspend = async (id) => {
    await suspendStaff(id);
    const m = staffList.find(x => x.id === id);
    appendLog({ staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin', module: 'Staff', action: 'Account suspended', detail: `${m?.first_name} ${m?.last_name}`, type: 'staff' });
    setStaffList(prev => prev.map(x => x.id === id ? { ...x, suspended: true } : x));
  };

  const handleReactivate = async (id) => {
    await reactivateStaff(id);
    const m = staffList.find(x => x.id === id);
    appendLog({ staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin', module: 'Staff', action: 'Account reactivated', detail: `${m?.first_name} ${m?.last_name}`, type: 'staff' });
    setStaffList(prev => prev.map(x => x.id === id ? { ...x, suspended: false } : x));
  };

  return (
    <ScreenContainer scroll>
      <View style={s.pageHead}>
        <View>
          <Text style={[s.pageTitle, { color: C.text }]}>Staff & Roles</Text>
          <Text style={[s.pageSub, { color: C.textMuted }]}>{staffList.length} team members · Nairobi General Hospital</Text>
        </View>
        <Btn label="Add member" icon={<Icon name="user-plus" lib="feather" size={14} color="#fff" />} size="sm" onPress={() => setAddModal(true)} />
      </View>

      {/* Role filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ paddingRight: 16 }}>
        {ROLE_FILTER_OPTIONS.map(r => {
          const active = filter === r;
          return (
            <TouchableOpacity key={r} onPress={() => setFilter(r)}
              style={[s.filterPill, { backgroundColor: active ? C.primary : C.surface, borderColor: active ? C.primary : C.border }]}>
              <Text style={{ color: active ? '#fff' : C.textSec, fontSize: 12, fontWeight: '600' }}>
                {r === 'all' ? 'All' : ROLE_LABELS[r]}
              </Text>
              <View style={[s.pillCount, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : C.bg }]}>
                <Text style={{ color: active ? '#fff' : C.textMuted, fontSize: 10, fontWeight: '700' }}>{counts[r]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={[s.searchWrap, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Icon name="search" lib="feather" size={15} color={C.textMuted} style={{ marginRight: 8 }} />
        <TextInput style={[s.searchInput, { color: C.text }]} placeholder="Search by name or email…"
          placeholderTextColor={C.textMuted} value={search} onChangeText={setSearch} />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="x" lib="feather" size={14} color={C.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {filtered.map((member, i) => {
        const color = roleColorMap[ROLE_COLORS[member.role]] || C.primary;
        const perms = PERMS[member.role] || [];
        return (
          <Card key={member.id} style={[s.staffCard, member.suspended && { opacity: 0.6 }]}>
            <View style={s.staffRow}>
              <Avatar name={`${member.first_name} ${member.last_name}`} size={44} />
              <View style={s.staffInfo}>
                <View style={s.staffNameRow}>
                  <Text style={[s.staffName, { color: C.text }]} numberOfLines={1}>{member.first_name} {member.last_name}</Text>
                  <View style={[s.roleTag, { backgroundColor: `${color}18` }]}>
                    <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{ROLE_LABELS[member.role]}</Text>
                  </View>
                  {member.suspended && <Badge label="Suspended" color="danger" />}
                </View>
                <Text style={[s.staffEmail, { color: C.textMuted }]} numberOfLines={1}>{member.email}</Text>
                {member.specialty && <Text style={[s.staffSpec, { color: C.textSec }]}>{member.specialty}</Text>}
                {member.license  && <Text style={[s.staffLic,  { color: C.textMuted }]}>Lic: {member.license}</Text>}
              </View>
            </View>

            {/* Permission chips */}
            <View style={[s.permRow, { borderTopColor: C.divider }]}>
              {perms.map(p => (
                <View key={p.l} style={[s.permChip, { backgroundColor: p.y ? C.successLight : C.bg }]}>
                  <Icon name={p.y ? 'check' : 'x'} lib="feather" size={10} color={p.y ? C.success : C.textMuted} style={{ marginRight: 3 }} />
                  <Text style={{ color: p.y ? C.success : C.textMuted, fontSize: 10, fontWeight: '600' }}>{p.l}</Text>
                </View>
              ))}
            </View>

            {/* Admin actions */}
            {member.role !== 'hospital_admin' && (
              <View style={[s.adminActions, { borderTopColor: C.divider }]}>
                <Btn label="Edit" size="sm" variant="ghost"
                  icon={<Icon name="edit-2" lib="feather" size={12} color={C.textSec} />}
                  onPress={() => setEditModal({ visible: true, member })} />
                {member.suspended ? (
                  <Btn label="Reactivate" size="sm" variant="success"
                    icon={<Icon name="user-check" lib="feather" size={12} color="#fff" />}
                    onPress={() => handleReactivate(member.id)} style={{ marginLeft: 8 }} />
                ) : (
                  <Btn label="Suspend" size="sm" variant="danger"
                    icon={<Icon name="user-x" lib="feather" size={12} color="#fff" />}
                    onPress={() => handleSuspend(member.id)} style={{ marginLeft: 8 }} />
                )}
              </View>
            )}
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <View style={s.empty}>
          <Icon name="users" lib="feather" size={36} color={C.textMuted} />
          <Text style={[s.emptyText, { color: C.textMuted }]}>No staff members match your filters</Text>
        </View>
      )}

      {/* ── POS terminal management (admin only) ── */}
      {true && <PosSection user={{ first_name: 'Admin', last_name: '', id: 'usr-HA-001', role: 'hospital_admin', facility: 'Nairobi General Hospital', hospital_id: 'hosp-001' }} C={C} />}

      <AddMemberModal visible={addModal} onClose={() => setAddModal(false)}
        onAdd={m => setStaffList(prev => [m, ...prev])} />

      {editModal.member && (
        <EditMemberModal
          visible={editModal.visible}
          member={editModal.member}
          onClose={() => setEditModal({ visible: false, member: null })}
          onSave={updated => setStaffList(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))}
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  pageHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  pageTitle:   { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  pageSub:     { fontSize: 12 },
  filterRow:   { marginBottom: 12 },
  filterPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, marginRight: 8 },
  pillCount:   { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 14 },
  staffCard:   { marginBottom: 10, padding: 14 },
  staffRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  staffInfo:   { flex: 1 },
  staffNameRow:{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  staffName:   { fontSize: 14, fontWeight: '700' },
  roleTag:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  staffEmail:  { fontSize: 12, marginBottom: 2 },
  staffSpec:   { fontSize: 12, fontStyle: 'italic' },
  staffLic:    { fontSize: 11 },
  permRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10, borderTopWidth: 1 },
  permChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  adminActions:{ flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  empty:       { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:   { fontSize: 14 },
  // Modals
  backdrop:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:  { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sheetSub:    { fontSize: 12, marginBottom: 14 },
  fieldLbl:    { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  rolePill:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  accessNote:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  errTxt:      { fontSize: 12, marginBottom: 10 },
});
