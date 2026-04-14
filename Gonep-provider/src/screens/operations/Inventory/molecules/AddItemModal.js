// ─── screens/operations/Inventory/molecules/AddItemModal.js ──────────────────
import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { PillSelector } from '../../../../molecules/PillSelector';
import { FormField } from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import { addInventoryItem, appendLog } from '../../../../api';
import { CATEGORIES, UNITS } from '../../../../constants/inventory';

export function AddItemModal({ visible, onClose, onDone, user }) {
  const { C } = useTheme();
  const [name,      setName]     = useState('');
  const [category,  setCategory] = useState(CATEGORIES[0]);
  const [unit,      setUnit]     = useState(UNITS[0]);
  const [price,     setPrice]    = useState('');
  const [stock,     setStock]    = useState('');
  const [reorder,   setReorder]  = useState('100');
  const [ecommerce, setEcommerce]= useState(false);
  const [saving,    setSaving]   = useState(false);
  const [err,       setErr]      = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('Item name is required.'); return; }
    try {
      setSaving(true); setErr('');
      await addInventoryItem({
        name: name.trim(), category, unit,
        unit_price: parseFloat(price) || 0,
        stock:      parseInt(stock, 10) || 0,
        reorder:    parseInt(reorder, 10) || 0,
        ecommerce,
        addedBy: `${user.first_name} ${user.last_name}`,
      });
      appendLog({
        staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
        module: 'Inventory', action: 'New item added',
        detail: `${name.trim()} added to formulary`, type: 'inventory',
      });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to add item.'); }
    finally { setSaving(false); }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>Add to formulary</Text>
      <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>New drug or supply item</Text>

      <FormField label="Drug / item name *" value={name} onChangeText={v => { setName(v); setErr(''); }} placeholder="e.g. Lisinopril 10mg" error={err && !name} />

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Category</Text>
      <PillSelector options={CATEGORIES} selected={category} onSelect={setCategory} />

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Unit</Text>
      <PillSelector options={UNITS} selected={unit} onSelect={setUnit} />

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormField label="Opening stock" value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Reorder level" value={reorder} onChangeText={setReorder} keyboardType="number-pad" placeholder="100" />
        </View>
      </View>

      <FormField label="Unit price (KSh)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0" />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 14, borderColor: C.border }}>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>List on ecommerce</Text>
          <Text style={{ fontSize: 11, color: C.textMuted }}>Visible on Gonep pharmacy website</Text>
        </View>
        <Switch
          value={ecommerce}
          onValueChange={setEcommerce}
          trackColor={{ false: C.border, true: `${C.success}60` }}
          thumbColor={ecommerce ? C.success : C.textMuted}
        />
      </View>

      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Adding…' : 'Add to formulary'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
