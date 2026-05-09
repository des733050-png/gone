import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import {
  getFacilitySpecialties,
  createFacilitySpecialty,
  updateFacilitySpecialty,
  deleteFacilitySpecialty,
} from '../../../api';

export function SpecializationsScreen() {
  const { C } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFacilitySpecialties();
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createFacilitySpecialty({ name });
      setNewName('');
      setCreating(false);
      setToast('Specialization created.');
      await load();
    } catch {
      setToast('Failed to create. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (item) => {
    const name = editName.trim();
    if (!name || name === item.name) { setEditId(null); return; }
    setEditSaving(true);
    try {
      await updateFacilitySpecialty(item.id, { name });
      setEditId(null);
      setToast('Specialization updated.');
      await load();
    } catch {
      setToast('Failed to update. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (item) => {
    setDeleting(prev => ({ ...prev, [item.id]: true }));
    try {
      await deleteFacilitySpecialty(item.id);
      setToast('Specialization deleted.');
      await load();
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('400') || msg.includes('doctors')) {
        setToast('Cannot delete: doctors are assigned to this specialization.');
      } else {
        setToast('Failed to delete. Please try again.');
      }
    } finally {
      setDeleting(prev => ({ ...prev, [item.id]: false }));
    }
  };

  return (
    <ScreenContainer scroll>
      {!!toast && (
        <View style={[s.toast, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={{ color: C.text, fontSize: 13 }}>{toast}</Text>
        </View>
      )}

      <View style={s.header}>
        <Text style={[s.count, { color: C.textMuted }]}>{items.length} specialization{items.length !== 1 ? 's' : ''}</Text>
        {!creating && (
          <Btn
            label="+ Add"
            size="sm"
            onPress={() => { setCreating(true); setNewName(''); }}
          />
        )}
      </View>

      {creating && (
        <Card style={s.createCard}>
          <Text style={[s.label, { color: C.textMuted }]}>New specialization name</Text>
          <TextInput
            style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.surface }]}
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Cardiology"
            placeholderTextColor={C.textMuted}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <View style={s.row}>
            <Btn label="Cancel" variant="ghost" size="sm" onPress={() => setCreating(false)} style={{ flex: 1 }} />
            <Btn
              label="Create"
              size="sm"
              loading={saving}
              disabled={!newName.trim() || saving}
              onPress={handleCreate}
              style={{ flex: 1, marginLeft: 8 }}
            />
          </View>
        </Card>
      )}

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : items.length === 0 && !creating ? (
        <View style={s.centered}>
          <Icon name="tag" lib="feather" size={36} color={C.textMuted} />
          <Text style={[s.emptyText, { color: C.textMuted }]}>No specializations yet</Text>
        </View>
      ) : (
        items.map((item) => {
          const isEditing = editId === item.id;
          const isDeleting = deleting[item.id];
          return (
            <Card key={item.id} style={s.item}>
              {isEditing ? (
                <View style={s.editRow}>
                  <TextInput
                    style={[s.editInput, { borderColor: C.primary, color: C.text, backgroundColor: C.surface }]}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                    onSubmitEditing={() => handleEditSave(item)}
                  />
                  <TouchableOpacity
                    onPress={() => handleEditSave(item)}
                    disabled={editSaving}
                    style={[s.iconBtn, { backgroundColor: C.primary }]}
                  >
                    {editSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Icon name="check" lib="feather" size={16} color="#fff" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditId(null)}
                    style={[s.iconBtn, { backgroundColor: C.border }]}
                  >
                    <Icon name="x" lib="feather" size={16} color={C.text} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.itemRow}>
                  <View style={[s.dot, { backgroundColor: C.primary }]} />
                  <Text style={[s.itemName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                  {item.doctor_count != null && (
                    <Text style={[s.docCount, { color: C.textMuted }]}>{item.doctor_count} dr</Text>
                  )}
                  <TouchableOpacity
                    onPress={() => { setEditId(item.id); setEditName(item.name); }}
                    style={s.iconBtn}
                  >
                    <Icon name="edit-2" lib="feather" size={15} color={C.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    disabled={isDeleting}
                    style={s.iconBtn}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color={C.danger} />
                      : <Icon name="trash-2" lib="feather" size={15} color={C.danger} />}
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        })
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  toast: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  count: { fontSize: 12, fontWeight: '600' },
  createCard: { marginBottom: 12, padding: 16, gap: 10 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14,
  },
  row: { flexDirection: 'row', gap: 8 },
  centered: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14 },
  item: { marginBottom: 8, padding: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  itemName: { flex: 1, fontSize: 14, fontWeight: '500' },
  docCount: { fontSize: 12 },
  iconBtn: { padding: 6, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, borderWidth: 1.5, borderRadius: 8, padding: 8, fontSize: 14 },
});
