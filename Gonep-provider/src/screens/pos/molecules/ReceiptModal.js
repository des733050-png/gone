// ─── screens/pos/molecules/ReceiptModal.js ───────────────────────────────────
import React from 'react';
import { Modal, View, ScrollView, Text, StyleSheet, Platform } from 'react-native';
import { Btn } from '../../../atoms/Btn';
import { safeNum, fmt } from '../../../constants/pos';

export function ReceiptModal({ visible, tx, facility, cashier, onClose, onNewSale }) {
  if (!tx) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
          <View style={s.receipt}>
            <Text style={s.header}>{facility}</Text>
            <Text style={s.sub}>Official Receipt</Text>
            <View style={s.div} />

            <Text style={s.field}>Receipt #:  {tx.receipt_no}</Text>
            <Text style={s.field}>Cashier:    {cashier}</Text>
            <Text style={s.field}>Date:       {new Date(tx.created_at).toLocaleString('en-KE')}</Text>
            <View style={s.div} />

            <View style={s.lineHeader}>
              <Text style={[s.col1, s.th]}>Item</Text>
              <Text style={[s.colQty, s.th]}>Qty</Text>
              <Text style={[s.colPrice, s.th]}>Price</Text>
              <Text style={[s.colTotal, s.th]}>Total</Text>
            </View>
            {(tx.items || []).map((item, i) => (
              <View key={i} style={s.lineItem}>
                <Text style={s.col1} numberOfLines={1}>{item.name}</Text>
                <Text style={s.colQty}>{item.qty}</Text>
                <Text style={s.colPrice}>{fmt(item.unit_price)}</Text>
                <Text style={s.colTotal}>{fmt(item.line_total)}</Text>
              </View>
            ))}
            <View style={s.div} />

            <View style={s.totalRow}><Text style={s.tl}>Subtotal</Text><Text style={s.tv}>{fmt(tx.subtotal)}</Text></View>
            {safeNum(tx.discount_total) > 0 && (
              <View style={s.totalRow}>
                <Text style={s.tl}>Discount</Text>
                <Text style={[s.tv, { color: 'red' }]}>-{fmt(tx.discount_total)}</Text>
              </View>
            )}
            <View style={[s.totalRow, { marginTop: 4 }]}>
              <Text style={[s.tl, { fontWeight: '900', fontSize: 15 }]}>TOTAL</Text>
              <Text style={[s.tv, { fontWeight: '900', fontSize: 15 }]}>{fmt(tx.grand_total)}</Text>
            </View>
            <View style={s.div} />

            <Text style={s.payInfo}>Payment: {tx.payment_method}{tx.payment_ref ? ` · ${tx.payment_ref}` : ''}</Text>
            <Text style={s.thanks}>Thank you for visiting {facility}!</Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              {Platform.OS === 'web' && (
                <Btn label="Print" icon="printer" variant="secondary"
                  onPress={() => typeof window !== 'undefined' && window.print()}
                  style={{ flex: 1 }} />
              )}
              <Btn label="New sale" onPress={onNewSale} style={{ flex: 1 }} />
            </View>
            <Btn label="Close" variant="ghost" onPress={onClose} full style={{ marginTop: 8 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  receipt:    { backgroundColor: '#fff', borderRadius: 8, padding: 20, maxWidth: 340, width: '100%' },
  header:     { fontSize: 15, fontWeight: '900', textAlign: 'center', color: '#000' },
  sub:        { fontSize: 11, textAlign: 'center', color: '#555', marginBottom: 8 },
  div:        { borderBottomWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', marginVertical: 8 },
  field:      { fontSize: 11, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, color: '#333', marginBottom: 2 },
  lineHeader: { flexDirection: 'row', marginBottom: 3 },
  lineItem:   { flexDirection: 'row', marginBottom: 2 },
  col1:       { flex: 1, fontSize: 11, color: '#333' },
  colQty:     { width: 28, fontSize: 11, textAlign: 'right', color: '#333' },
  colPrice:   { width: 64, fontSize: 11, textAlign: 'right', color: '#333' },
  colTotal:   { width: 68, fontSize: 11, textAlign: 'right', color: '#000', fontWeight: '600' },
  th:         { fontWeight: '700', color: '#000' },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tl:         { fontSize: 12, color: '#333' },
  tv:         { fontSize: 12, color: '#000', fontWeight: '700' },
  payInfo:    { fontSize: 11, textAlign: 'center', color: '#555', marginTop: 6 },
  thanks:     { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6, color: '#000' },
});
