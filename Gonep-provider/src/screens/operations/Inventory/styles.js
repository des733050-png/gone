// ─── screens/operations/Inventory/styles.js ──────────────────────────────────
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  itemCard:    { marginBottom: 12, padding: 14 },
  itemRow:     { flexDirection: 'row', alignItems: 'center' },
  itemIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemSub:     { fontSize: 12, marginBottom: 2 },
  itemStock:   { fontSize: 12 },
  ecomRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  actionBtnTxt:{ fontSize: 12, fontWeight: '600' },
  infoBanner:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
});
