import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from '../../../../atoms/Card';
import { Icon } from '../../../../atoms/Icon';
import { useTheme } from '../../../../theme/ThemeContext';

export function Step2Doctor({ doctors, loading, selected, onSelect, specialty }) {
  const { C } = useTheme();

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.primary} />
        <Text style={[s.hint, { color: C.textMuted }]}>Loading doctors…</Text>
      </View>
    );
  }

  if (!doctors.length) {
    return (
      <View style={s.centered}>
        <Icon name="account-off" lib="mc" size={36} color={C.textMuted} />
        <Text style={[s.hint, { color: C.textMuted }]}>
          No doctors found{specialty ? ` in ${specialty}` : ''}.
        </Text>
      </View>
    );
  }

  return (
    <View style={s.list}>
      {doctors.map((doc) => {
        const isSelected = selected?.provider_code === doc.provider_code;
        const displayName = doc.full_name || doc.name || '';
        return (
          <Card key={doc.provider_code} hover style={[s.card, isSelected && { borderColor: C.primary, borderWidth: 2 }]}>
            <TouchableOpacity onPress={() => onSelect(doc)} activeOpacity={0.8}>
              <View style={s.row}>
                <View style={[s.avatar, { backgroundColor: C.primaryLight }]}>
                  <Text style={[s.avatarText, { color: C.primary }]}>
                    {(displayName || 'D')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.name, { color: C.text }]}>{displayName}</Text>
                  <Text style={[s.sub, { color: C.textMuted }]}>{doc.specialty}</Text>
                  {doc.facility_name ? (
                    <Text style={[s.facility, { color: C.textMuted }]}>{doc.facility_name}</Text>
                  ) : null}
                </View>
                {doc.has_slots !== false ? (
                  <Icon name="chevron-right" lib="feather" size={18} color={C.primary} />
                ) : (
                  <Text style={[s.noSlots, { color: C.textMuted }]}>No slots</Text>
                )}
              </View>
            </TouchableOpacity>
          </Card>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  centered: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  hint: { fontSize: 13, textAlign: 'center' },
  list: { gap: 10 },
  card: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  name: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12, marginBottom: 2 },
  facility: { fontSize: 11 },
  noSlots: { fontSize: 11 },
});
