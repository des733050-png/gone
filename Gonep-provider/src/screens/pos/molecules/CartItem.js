// ─── screens/pos/molecules/CartItem.js ───────────────────────────────────────
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '../../../atoms/Icon';
import { calcLineTotal, fmt } from '../../../constants/pos';

export function CartItem({ item, onQty, onDisc, onRemove, C }) {
  const lineTotal = calcLineTotal(item.unit_price, item.qty, item.disc_type, item.disc_value);
  return (
    <View style={[s.row, { borderBottomColor: C.divider }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={{ fontSize: 10, color: C.textMuted }}>{fmt(item.unit_price)} / unit</Text>
      </View>

      {/* Qty stepper */}
      <View style={s.stepper}>
        <TouchableOpacity style={[s.stepBtn, { borderColor: C.border }]} onPress={() => onQty(item.id, -1)}>
          <Text style={{ color: C.text, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
        <Text style={[s.stepVal, { color: C.text }]}>{item.qty}</Text>
        <TouchableOpacity style={[s.stepBtn, { borderColor: C.border }]} onPress={() => onQty(item.id, 1)}>
          <Text style={{ color: C.text, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Discount toggle % / fixed */}
      <View style={s.discRow}>
        <TouchableOpacity
          onPress={() => onDisc(item.id, 'type', item.disc_type === 'percent' ? 'fixed' : 'percent')}
          style={[s.discTypeBtn, {
            backgroundColor: item.disc_type === 'percent' ? C.primaryLight : C.warningLight,
            borderColor:     item.disc_type === 'percent' ? C.primary      : C.warning,
          }]}
        >
          <Text style={{ color: item.disc_type === 'percent' ? C.primary : C.warning, fontSize: 10, fontWeight: '700' }}>
            {item.disc_type === 'percent' ? '%' : 'KSh'}
          </Text>
        </TouchableOpacity>
        <TextInput
          value={String(item.disc_value === 0 ? '' : item.disc_value)}
          onChangeText={v => onDisc(item.id, 'value', v)}
          keyboardType="decimal-pad"
          placeholder="0"
          style={[s.discInput, { color: C.text, borderColor: C.border }]}
          placeholderTextColor={C.textMuted}
        />
      </View>

      <Text style={[s.lineTotal, { color: C.text }]}>{fmt(lineTotal)}</Text>

      <TouchableOpacity onPress={() => onRemove(item.id)} style={{ padding: 4 }}>
        <Icon name="x" lib="feather" size={14} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 8, borderBottomWidth: 1 },
  name:        { fontSize: 11, fontWeight: '600' },
  lineTotal:   { fontSize: 11, fontWeight: '800', minWidth: 50, textAlign: 'right' },
  stepper:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  stepBtn:     { width: 20, height: 20, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepVal:     { fontSize: 12, fontWeight: '700', minWidth: 18, textAlign: 'center' },
  discRow:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  discTypeBtn: { width: 26, height: 22, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  discInput:   { width: 36, borderWidth: 1, borderRadius: 5, fontSize: 11, padding: 2, textAlign: 'center' },
});
