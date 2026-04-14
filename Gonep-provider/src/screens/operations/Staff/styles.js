// ─── screens/operations/Staff/styles.js ──────────────────────────────────────
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  filterRow:   { marginBottom: 12 },
  filterPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, marginRight: 8 },
  pillCount:   { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 99 },
  empty:       { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:   { fontSize: 14 },
});
