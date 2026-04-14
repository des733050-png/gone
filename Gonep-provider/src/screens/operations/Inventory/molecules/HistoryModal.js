// ─── screens/operations/Inventory/molecules/HistoryModal.js ──────────────────
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { useTheme } from '../../../../theme/ThemeContext';

export function HistoryModal({ visible, item, onClose }) {
  const { C } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="70%">
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>Stock history</Text>
      {item && (
        <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
          {item.name} · Current: {item.stock} {item.unit}
        </Text>
      )}
      <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
        {(item?.history || []).length === 0 && (
          <Text style={{ color: C.textMuted, textAlign: 'center', marginVertical: 20, fontSize: 13 }}>
            No history available
          </Text>
        )}
        {(item?.history || []).map((h, i) => {
          const isPos = h.qty_change > 0;
          return (
            <View key={i} style={[s.row, { borderBottomColor: C.divider }]}>
              <View style={[s.dot, { backgroundColor: isPos ? C.success : C.danger }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{h.action}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isPos ? C.success : C.danger }}>
                    {isPos ? '+' : ''}{h.qty_change}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>By {h.by} · {h.date}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Btn label="Close" variant="ghost" onPress={onClose} style={{ marginTop: 14 }} full />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
});
