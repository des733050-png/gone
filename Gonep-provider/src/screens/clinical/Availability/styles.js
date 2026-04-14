// ─── screens/clinical/Availability/styles.js ─────────────────────────────────
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  schedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  docCard:     { marginBottom: 10, padding: 14 },
  docName:     { fontSize: 14, fontWeight: '700' },
  infoBanner:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
});
