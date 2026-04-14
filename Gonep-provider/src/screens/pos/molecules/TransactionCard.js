// ─── screens/pos/molecules/TransactionCard.js ────────────────────────────────
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '../../../atoms/Icon';
import { safeNum, fmt } from '../../../constants/pos';

export function TransactionCard({ tx, C }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => setOpen(v => !v)}
      style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}
    >
      {/* Summary row */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{tx.receipt_no}</Text>
          <Text style={{ fontSize: 11, color: C.textMuted }}>
            {new Date(tx.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
            {' · '}{tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? 's' : ''}
            {' · '}{tx.payment_method}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '900', color: C.primary, marginRight: 8 }}>
          {fmt(tx.grand_total)}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} lib="feather" size={14} color={C.textMuted} />
      </View>

      {/* Expanded detail */}
      {open && (
        <View style={[s.detail, { borderTopColor: C.divider }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>Transaction ID</Text>
            <Text style={{ fontSize: 10, color: C.textSec }}>{tx.id}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>Time</Text>
            <Text style={{ fontSize: 10, color: C.textSec }}>{new Date(tx.created_at).toLocaleString('en-KE')}</Text>
          </View>
          {(tx.items || []).map((item, i) => (
            <View key={i} style={[s.item, { borderBottomColor: C.divider }]}>
              <Text style={{ flex: 1, fontSize: 12, color: C.text }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted, marginHorizontal: 8 }}>×{item.qty}</Text>
              <Text style={{ fontSize: 11, color: C.textSec }}>{fmt(item.line_total)}</Text>
            </View>
          ))}
          {safeNum(tx.discount_total) > 0 && (
            <View style={s.item}>
              <Text style={{ flex: 1, fontSize: 12, color: C.textMuted }}>Discount</Text>
              <Text style={{ fontSize: 12, color: 'red' }}>-{fmt(tx.discount_total)}</Text>
            </View>
          )}
          <View style={[s.item, { borderBottomWidth: 0, marginTop: 4 }]}>
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: C.text }}>TOTAL</Text>
            <Text style={{ fontSize: 13, fontWeight: '900', color: C.primary }}>{fmt(tx.grand_total)}</Text>
          </View>
          <Text style={{ fontSize: 10, color: C.textMuted, marginTop: 6 }}>
            Payment: {tx.payment_method}{tx.payment_ref ? ` · ${tx.payment_ref}` : ''} · Cashier: {tx.cashier}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:   { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  item:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1 },
});
