// ─── screens/operations/Inventory/molecules/EditItemModal.js ─────────────────
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { PillSelector } from '../../../../molecules/PillSelector';
import { FormField } from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import { updateInventoryItem, appendLog } from '../../../../api';
import { CATEGORIES, UNITS } from '../../../../constants/inventory';

export function EditItemModal({ visible, item, onClose, onDone, user }) {
  const { C } = useTheme();
  const [name,     setName]    = useState(item?.name     || '');
  const [category, setCategory]= useState(item?.category || CATEGORIES[0]);
  const [unit,     setUnit]    = useState(item?.unit      || UNITS[0]);
  const [price,    setPrice]   = useState(item?.unit_price != null ? String(item.unit_price) : '');
  const [reorder,  setReorder] = useState(item?.reorder  != null  ? String(item.reorder)    : '100');
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('Item name is required.'); return; }
    const reorderN = parseInt(reorder, 10);
    if (isNaN(reorderN) || reorderN < 0) { setErr('Enter a valid reorder level.'); return; }
    try {
      setSaving(true); setErr('');
      await updateInventoryItem(item.id, { name: name.trim(), category, unit, unit_price: parseFloat(price) || 0, reorder: reorderN });
      appendLog({
        staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
        module: 'Inventory', action: 'Item edited',
        detail: `${name.trim()} — details updated`, type: 'inventory',
      });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to save changes.'); }
    finally { setSaving(false); }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 14 }}>Edit item</Text>

      <FormField label="Drug / item name *" value={name} onChangeText={v => { setName(v); setErr(''); }} />

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</Text>
      <PillSelector options={CATEGORIES} selected={category} onSelect={setCategory} />

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Unit</Text>
      <PillSelector options={UNITS} selected={unit} onSelect={setUnit} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormField label="Unit price (KSh)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Reorder level" value={reorder} onChangeText={setReorder} keyboardType="number-pad" placeholder="100" />
        </View>
      </View>

      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
