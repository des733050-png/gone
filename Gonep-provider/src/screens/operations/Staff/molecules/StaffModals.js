// ─── screens/operations/Staff/molecules/StaffModals.js ───────────────────────
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { Input } from '../../../../atoms/Input';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { useTheme } from '../../../../theme/ThemeContext';
import { updateStaff, addStaffMember, appendLog } from '../../../../api';
import { ROLE_LABELS } from '../../../../config/roles';
import { ROLE_OPTS, ROLE_DESC } from '../../../../constants/staff';

// ─── EditMemberModal ──────────────────────────────────────────────────────────
export function EditMemberModal({ visible, member, onClose, onSave }) {
  const { C } = useTheme();
  const [form,   setForm]   = useState({ ...member });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await updateStaff(member.id, form);
    appendLog({
      staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin',
      module: 'Staff', action: 'Staff details edited',
      detail: `${form.first_name} ${form.last_name}`, type: 'staff',
    });
    setSaving(false);
    onSave(form);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 14 }}>Edit member</Text>
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
    </BottomSheet>
  );
}

// ─── AddMemberModal ───────────────────────────────────────────────────────────
export function AddMemberModal({ visible, onClose, onAdd }) {
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
    const member = await addStaffMember({
      role, first_name: firstName.trim(), last_name: lastName.trim(),
      email: email.trim(), phone, specialty: specialty || null,
      license: license || null, facility: 'Nairobi General Hospital', hospital_id: 'hosp-001',
    });
    appendLog({
      staff: 'Admin', staff_id: 'usr-HA-001', role: 'hospital_admin',
      module: 'Staff', action: 'Account created',
      detail: `${firstName} ${lastName} — ${ROLE_LABELS[role]}`, type: 'staff',
    });
    setSaving(false);
    onAdd(member);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>Add team member</Text>
      <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>They'll receive an invitation email.</Text>

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Role</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {ROLE_OPTS.map(r => (
          <TouchableOpacity key={r} onPress={() => setRole(r)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6,
              backgroundColor: role === r ? C.primary : C.surface,
              borderColor:     role === r ? C.primary : C.border,
            }}>
            <Text style={{ color: role === r ? '#fff' : C.textSec, fontSize: 11, fontWeight: '700' }}>
              {ROLE_LABELS[r]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: C.primaryLight, borderColor: C.primaryMid }}>
        <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
        <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>{ROLE_DESC[role]}</Text>
      </View>

      <Input label="First name *" value={firstName} onChangeText={setFirstName} icon="user" />
      <Input label="Last name"    value={lastName}  onChangeText={setLastName} />
      <Input label="Email *"      value={email}     onChangeText={setEmail} icon="mail" keyboardType="email-address" />
      <Input label="Phone"        value={phone}     onChangeText={setPhone} icon="phone" keyboardType="phone-pad" />
      {role === 'doctor' && (
        <>
          <Input label="Specialty"       value={specialty} onChangeText={setSpecialty} icon="activity" />
          <Input label="KMA licence no." value={license}   onChangeText={setLicense}   icon="award" />
        </>
      )}
      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Adding…' : 'Send invitation'} onPress={handleAdd} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
