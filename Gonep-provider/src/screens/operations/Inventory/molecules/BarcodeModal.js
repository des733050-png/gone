// ─── screens/operations/Inventory/molecules/BarcodeModal.js ──────────────────
// Handles Code128 and QR label preview, saved-discount config,
// and auto-generates + saves a barcode if the item has none.
import React, { useMemo, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { useTheme } from '../../../../theme/ThemeContext';
import { updateInventoryItem, appendLog } from '../../../../api';

export function BarcodeModal({ visible, item, onClose, onSave, user }) {
  const { C } = useTheme();

  const generatedBarcode = useMemo(() => {
    if (item?.barcode) return item.barcode;
    const base = '601' + String(Math.abs(item?.id?.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 0)).padStart(9, '0');
    return base.slice(0, 12);
  }, [item]);

  useEffect(() => {
    if (item && !item.barcode && generatedBarcode) {
      updateInventoryItem(item.id, { barcode: generatedBarcode }).catch(() => {});
    }
  }, [item, generatedBarcode]);

  const [discType,  setDiscType]  = useState(item?.saved_discount?.type  || 'percent');
  const [discValue, setDiscValue] = useState(String(item?.saved_discount?.value || 0));
  const [mode,      setMode]      = useState('barcode');
  const [saving,    setSaving]    = useState(false);

  if (!item) return null;

  const barcode = item.barcode || generatedBarcode || '0000000000000';
  const bars    = barcode.split('').map((ch, i) => ({
    width: [2, 1, 3, 1, 2, 2, 1, 3][parseInt(ch, 16) % 8],
    dark:  i % 2 === 0,
  }));

  const handleSaveDiscount = async () => {
    setSaving(true);
    await updateInventoryItem(item.id, { saved_discount: { type: discType, value: parseFloat(discValue) || 0 } });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Inventory', action: 'Item discount updated',
      detail: `${item.name} → ${discValue}${discType === 'percent' ? '%' : ' KSh'} off`, type: 'inventory',
    });
    setSaving(false);
    if (onSave) onSave();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 3 }}>Barcode & label</Text>
      <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>{item.name}</Text>

      {/* Mode toggle */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {[{ id: 'barcode', lbl: 'Code128' }, { id: 'qr', lbl: 'QR Code' }].map(m => (
          <TouchableOpacity key={m.id} onPress={() => setMode(m.id)}
            style={[s.pill, { flex: 1, backgroundColor: mode === m.id ? C.primary : C.surface, borderColor: mode === m.id ? C.primary : C.border }]}>
            <Text style={{ color: mode === m.id ? '#fff' : C.textSec, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>{m.lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Label preview */}
      <View style={[s.preview, { borderColor: C.border }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 6, color: '#000' }}>{item.name}</Text>
        {mode === 'barcode' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'center', height: 50 }}>
              {bars.map((b, i) => (
                <View key={i} style={{ width: b.width * 2, height: 50, backgroundColor: b.dark ? '#000' : '#fff' }} />
              ))}
            </View>
            <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 4, color: '#000' }}>{barcode}</Text>
          </>
        ) : (
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            {Array.from({ length: 7 }).map((_, row) => (
              <View key={row} style={{ flexDirection: 'row' }}>
                {Array.from({ length: 7 }).map((__, col) => {
                  const finder = (row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2);
                  const data   = (row + col + parseInt(barcode[row + col] || '0', 10)) % 2 === 0;
                  return <View key={col} style={{ width: 8, height: 8, backgroundColor: (finder || data) ? '#000' : '#fff' }} />;
                })}
              </View>
            ))}
          </View>
        )}
        <Text style={{ fontSize: 11, textAlign: 'center', color: '#000', marginTop: 4 }}>
          KSh {item.unit_price || '—'} / {item.unit}
        </Text>
      </View>

      {Platform.OS === 'web' && (
        <Btn label="Print label" size="sm" variant="secondary"
          onPress={() => typeof window !== 'undefined' && window.print()}
          style={{ marginBottom: 14 }} />
      )}

      {/* Saved discount */}
      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: C.textMuted, marginBottom: 8 }}>
        SAVED DISCOUNT (auto-applies on POS scan)
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {[{ id: 'percent', lbl: '% Percent' }, { id: 'fixed', lbl: 'KSh Fixed' }].map(dt => (
          <TouchableOpacity key={dt.id} onPress={() => setDiscType(dt.id)}
            style={[s.pill, { flex: 1, backgroundColor: discType === dt.id ? C.primary : C.surface, borderColor: discType === dt.id ? C.primary : C.border }]}>
            <Text style={{ color: discType === dt.id ? '#fff' : C.textSec, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>{dt.lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        value={discValue}
        onChangeText={setDiscValue}
        keyboardType="decimal-pad"
        placeholder={discType === 'percent' ? 'e.g. 10 for 10% off' : 'e.g. 50 for KSh 50 off'}
        style={[s.inp, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
        placeholderTextColor={C.textMuted}
      />
      {parseFloat(discValue) > 0 && (
        <View style={[s.discPreview, { backgroundColor: C.successLight, borderColor: C.success }]}>
          <Icon name="check-circle" lib="feather" size={13} color={C.success} />
          <Text style={{ color: C.success, fontSize: 12, marginLeft: 6 }}>
            {'At POS: '}
            {discType === 'percent' ? `${discValue}% discount auto-applied` : `KSh ${discValue} off auto-applied`}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Btn label="Close" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Saving…' : 'Save discount'} onPress={handleSaveDiscount} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  pill:        { paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  preview:     { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 14, alignItems: 'center', backgroundColor: '#fff' },
  inp:         { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 4 },
  discPreview: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8, marginBottom: 4 },
});
