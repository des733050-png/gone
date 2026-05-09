import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../../theme/ThemeContext';

export function Step2Doctor({ doctors, loading, selected, onSelect, specialty }) {
  const { C } = useTheme();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={C.primary} />
        <Text style={[styles.hint, { color: C.textMuted }]}>Loading doctors…</Text>
      </View>
    );
  }

  if (!doctors.length) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.hint, { color: C.textMuted }]}>
          No doctors found{specialty ? ` in ${specialty?.name || specialty}` : ''}.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {doctors.map((doc) => {
        const isSelected = selected?.doctor_id === doc.doctor_id || selected?.provider_code === doc.provider_code;
        return (
          <TouchableOpacity
            key={doc.provider_code || doc.doctor_id}
            onPress={() => onSelect(doc)}
            style={[
              styles.card,
              { borderColor: isSelected ? C.primary : C.border, backgroundColor: C.card },
            ]}
          >
            <View style={styles.cardInner}>
              <View style={[styles.avatar, { backgroundColor: C.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: C.primary }]}>
                  {(doc.full_name || 'Dr')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: C.text }]}>{doc.full_name}</Text>
                <Text style={[styles.cardSub, { color: C.textMuted }]}>{doc.specialty}</Text>
              </View>
              {!doc.has_slots && (
                <View style={[styles.noSlotsBadge, { backgroundColor: C.warning + '20' }]}>
                  <Text style={[styles.noSlotsText, { color: C.warning }]}>No slots</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  hint: { fontSize: 13, textAlign: 'center' },
  list: { gap: 10 },
  card: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  noSlotsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  noSlotsText: { fontSize: 11, fontWeight: '600' },
});
