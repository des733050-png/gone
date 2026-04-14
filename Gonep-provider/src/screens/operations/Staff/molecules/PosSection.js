// ─── screens/operations/Staff/molecules/PosSection.js ────────────────────────
import React, { useState } from 'react';
import { View, Text, Modal, TextInput, StyleSheet } from 'react-native';
import { Card } from '../../../../atoms/Card';
import { Badge } from '../../../../atoms/Badge';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { useTheme } from '../../../../theme/ThemeContext';
import { createPosAccount, resetPosPassword, appendLog } from '../../../../api';
import { MOCK_POS_ACCOUNTS } from '../../../../mock/data';

export function PosSection({ user }) {
  const { C } = useTheme();
  const [posAccounts, setPosAccounts] = useState(MOCK_POS_ACCOUNTS.map(a => ({ ...a })));
  const [addModal,    setAddModal]    = useState(false);
  const [name,        setName]        = useState('');
  const [email,       setEmail]       = useState('');
  const [saving,      setSaving]      = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    const a = await createPosAccount({
      name: name.trim(), email: email.trim(),
      facility: user.facility, hospital_id: user.hospital_id,
      role: 'pos', created_by: user.id,
    });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Staff', action: 'POS account created', detail: name.trim(), type: 'staff',
    });
    setPosAccounts(prev => [...prev, a]);
    setName(''); setEmail(''); setAddModal(false); setSaving(false);
  };

  const handleReset = async (id) => {
    await resetPosPassword(id);
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Staff', action: 'POS password reset',
      detail: posAccounts.find(a => a.id === id)?.name, type: 'staff',
    });
  };

  const toggleActive = (id) =>
    setPosAccounts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));

  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>POS Terminals</Text>
        <Btn label="+ New POS" size="sm" onPress={() => setAddModal(true)} />
      </View>

      {posAccounts.map(pos => (
        <Card key={pos.id} style={{ marginBottom: 8, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[s.posIcon, { backgroundColor: C.primaryLight }]}>
              <Icon name="monitor" lib="feather" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{pos.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>{pos.email}</Text>
              <Text style={{ fontSize: 10, color: C.textMuted }}>Created {pos.created_at?.slice(0, 10)}</Text>
            </View>
            <Badge label={pos.active ? 'Active' : 'Inactive'} color={pos.active ? 'success' : 'danger'} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.divider }}>
            <Btn label="Reset password" size="sm" variant="ghost" onPress={() => handleReset(pos.id)} />
            <Btn
              label={pos.active ? 'Deactivate' : 'Activate'}
              size="sm"
              variant={pos.active ? 'danger' : 'success'}
              onPress={() => toggleActive(pos.id)}
            />
          </View>
        </Card>
      ))}

      <Modal visible={addModal} transparent animationType="slide">
        <View style={[s.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <View style={[s.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[s.title, { color: C.text }]}>New POS terminal</Text>
            <TextInput
              value={name} onChangeText={setName}
              placeholder="Terminal name (e.g. Main Reception Till)"
              style={[s.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
              placeholderTextColor={C.textMuted}
            />
            <TextInput
              value={email} onChangeText={setEmail}
              placeholder="Login email for this terminal"
              style={[s.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Btn label="Cancel" variant="ghost" onPress={() => setAddModal(false)} style={{ flex: 1 }} />
              <Btn label={saving ? 'Creating…' : 'Create terminal'} onPress={handleCreate} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  posIcon:  { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 32 },
  title:    { fontSize: 15, fontWeight: '800', marginBottom: 14 },
  inp:      { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 },
});
