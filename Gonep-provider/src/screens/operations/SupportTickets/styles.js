// ─── screens/operations/SupportTickets/styles.js ─────────────────────────────
import { StyleSheet } from 'react-native';

export const s = StyleSheet.create({
  ticketCard:  { marginBottom: 10, padding: 14 },
  ticketIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ticketTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  ticketDesc:  { fontSize: 12, lineHeight: 17 },
});
