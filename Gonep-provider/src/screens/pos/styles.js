// ─── screens/pos/styles.js ───────────────────────────────────────────────────
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  root:          { flex: 1 },
  toast:         { position: 'absolute', top: 60, left: '10%', right: '10%', zIndex: 100, borderRadius: 10, padding: 10, alignItems: 'center' },
  // Header
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  facilityName:  { fontSize: 14, fontWeight: '900' },
  cashierName:   { fontSize: 10, marginTop: 1 },
  shiftStat:     { fontSize: 12, fontWeight: '700' },
  logoutBtn:     { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Tab bar
  tabBar:        { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:      { fontSize: 11 },
  // Product pane
  productPane:   { flex: 1.3, borderRightWidth: 1 },
  searchBox:     { flexDirection: 'row', alignItems: 'center', margin: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  searchInput:   { flex: 1, fontSize: 13 },
  productRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, borderBottomWidth: 1 },
  productName:   { fontSize: 12, fontWeight: '600' },
  productPrice:  { fontSize: 12, fontWeight: '800' },
  savedDiscPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  // Cart pane
  cartPane:      { flex: 1, flexDirection: 'column' },
  cartHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  cartTitle:     { fontSize: 13, fontWeight: '700' },
  cartEmpty:     { alignItems: 'center', paddingVertical: 30 },
  cartFooter:    { borderTopWidth: 1, padding: 10 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  payBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 7 },
  payRefInput:   { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 12, marginTop: 8 },
  // Shift summary
  shiftKpi:      { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14 },
  txCard:        { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
