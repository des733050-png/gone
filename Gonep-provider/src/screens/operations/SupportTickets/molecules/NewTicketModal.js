// ─── screens/operations/SupportTickets/molecules/NewTicketModal.js ───────────
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { ResponsiveModal } from '../../../../molecules/ResponsiveModal';
import { PillSelector } from '../../../../molecules/PillSelector';
import { FormField } from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import { TICKET_CATEGORIES, PRIORITIES } from '../../../../constants/support';

export function NewTicketModal({ visible, user: _user, onClose, onCreate }) {
  const { C } = useTheme();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('Bug');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTitle('');
    setDesc('');
    setCategory('Bug');
    setPriority('medium');
    setSaving(false);
    setErr('');
  }, [visible]);

  const handleCreate = async () => {
    if (!title.trim() || !desc.trim()) {
      setErr('Title and description are required.');
      return;
    }
    try {
      setSaving(true);
      setErr('');
      await onCreate({
        title: title.trim(),
        description: desc.trim(),
        category,
        priority,
        status: 'open',
      });
      onClose();
    } catch (error) {
      setErr(error?.message || 'Unable to submit ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>Raise a support ticket</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            Your request goes directly to the IT Admin team.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Icon name="x" lib="feather" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Category</Text>
        <PillSelector options={TICKET_CATEGORIES} selected={category} onSelect={setCategory} />

        <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <Btn
              key={p}
              label={p}
              size="sm"
              variant={priority === p ? 'primary' : 'ghost'}
              onPress={() => setPriority(p)}
              style={{ flex: 1, textTransform: 'capitalize' }}
            />
          ))}
        </View>

        <FormField
          label="Title *"
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setErr('');
          }}
          placeholder="Brief description of the issue…"
        />
        <FormField
          label="Description *"
          value={desc}
          onChangeText={(v) => {
            setDesc(v);
            setErr('');
          }}
          placeholder="Steps to reproduce, what you expected, what happened…"
          multiline
          numberOfLines={4}
        />
      </ScrollView>

      {err ? <Text style={[styles.error, { color: C.danger }]}>{err}</Text> : null}

      <View style={styles.footer}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn
          label={saving ? 'Submitting…' : 'Submit ticket'}
          onPress={handleCreate}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
    </ResponsiveModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  headerSide: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  scroll: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
});
