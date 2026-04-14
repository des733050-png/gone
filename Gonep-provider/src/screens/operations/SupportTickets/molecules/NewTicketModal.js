// ─── screens/operations/SupportTickets/molecules/NewTicketModal.js ───────────
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { PillSelector } from '../../../../molecules/PillSelector';
import { FormField }    from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import { appendLog } from '../../../../api';
import { TICKET_CATEGORIES, PRIORITIES } from '../../../../constants/support';

export function NewTicketModal({ visible, user, onClose, onCreate }) {
  const { C } = useTheme();
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [category, setCategory] = useState('Bug');
  const [priority, setPriority] = useState('medium');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !desc.trim()) { setErr('Title and description are required.'); return; }
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const ticket = {
      id: `tkt-${Date.now()}`,
      title: title.trim(), description: desc.trim(),
      category, priority, status: 'open',
      raised_by:      user.id,
      raised_by_name: `${user.first_name} ${user.last_name}`,
      raised_by_role: user.role,
      facility:       user.facility || 'Nairobi General Hospital',
      created_at:     new Date().toISOString(),
      responses:      [],
    };
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Support', action: 'Ticket raised', detail: title.trim(), type: 'support',
    });
    setSaving(false);
    onCreate(ticket);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 }}>
        Raise a support ticket
      </Text>
      <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
        Your request goes directly to the IT Admin team.
      </Text>

      <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 }}>
        Category
      </Text>
      <PillSelector options={TICKET_CATEGORIES} selected={category} onSelect={setCategory} />

      <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 }}>
        Priority
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
        {PRIORITIES.map(p => (
          <Btn key={p} label={p} size="sm"
            variant={priority === p ? 'primary' : 'ghost'}
            onPress={() => setPriority(p)}
            style={{ flex: 1, textTransform: 'capitalize' }}
          />
        ))}
      </View>

      <FormField
        label="Title *"
        value={title}
        onChangeText={v => { setTitle(v); setErr(''); }}
        placeholder="Brief description of the issue…"
      />
      <FormField
        label="Description *"
        value={desc}
        onChangeText={v => { setDesc(v); setErr(''); }}
        placeholder="Steps to reproduce, what you expected, what happened…"
        multiline
        numberOfLines={4}
      />

      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Submitting…' : 'Submit ticket'} onPress={handleCreate} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
