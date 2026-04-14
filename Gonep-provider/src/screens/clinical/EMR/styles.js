// ─── screens/clinical/EMR/styles.js ──────────────────────────────────────────
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  // Page header
  pageHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 15, fontWeight: '800' },
  headerSub:  { fontSize: 11, marginTop: 1 },
  // Tab bar
  tabBar:     { borderBottomWidth: 1, flexGrow: 0 },
  tab:        { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4 },
  tabLabel:   { fontSize: 13 },
});
