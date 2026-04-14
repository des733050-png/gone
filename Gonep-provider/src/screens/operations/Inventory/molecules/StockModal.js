// ─── screens/operations/Inventory/molecules/StockModal.js ────────────────────
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { PillSelector } from '../../../../molecules/PillSelector';
import { FormField } from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import { addStock, reduceStock, appendLog } from '../../../../api';
import { ADD_REASONS, REDUCE_REASONS } from '../../../../constants/inventory';

export function StockModal({ visible, mode, item, onClose, onDone, user }) {
  const { C } = useTheme();
  const [qty,    setQty]    = useState('');
  const [reason, setReason] = useState(mode === 'add' ? ADD_REASONS[0] : REDUCE_REASONS[0]);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const isAdd   = mode === 'add';
  const reasons = isAdd ? ADD_REASONS : REDUCE_REASONS;

  const handleSave = async () => {
    const n = parseInt(qty, 10);
    if (!n || n < 1) { setErr('Enter a valid quantity (minimum 1).'); return; }
    if (!isAdd && n > item.stock) { setErr(`Cannot reduce by more than current stock (${item.stock}).`); return; }
    try {
      setSaving(true); setErr('');
      await (isAdd ? addStock : reduceStock)({ id: item.id, qty: n, reason, by: `${user.first_name} ${user.last_name}` });
      appendLog({
        staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
        module: 'Inventory', action: isAdd ? 'Stock received' : 'Stock reduced',
        detail: `${item.name} ${isAdd ? '+' : '-'}${n} ${item.unit} (${reason})`, type: 'inventory',
      });
      onDone(); onClose();
    } catch (e) { setErr(e?.message || 'Failed to update stock.'); }
    finally { setSaving(false); }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>
        {isAdd ? 'Receive stock' : 'Reduce stock'}
      </Text>
      {item && (
        <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
          {item.name} · Current stock: {item.stock} {item.unit}
        </Text>
      )}
      <FormField
        label={`Quantity (${item?.unit}) *`}
        value={qty}
        onChangeText={v => { setQty(v); setErr(''); }}
        keyboardType="number-pad"
        placeholder="0"
        error={!!err}
      />
      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Reason *
      </Text>
      <PillSelector options={reasons} selected={reason} onSelect={setReason} />
      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Saving…' : isAdd ? 'Confirm receipt' : 'Confirm reduction'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
