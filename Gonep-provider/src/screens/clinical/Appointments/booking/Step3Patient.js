import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Input } from '../../../../atoms/Input';
import { useTheme } from '../../../../theme/ThemeContext';

export function Step3Patient({ search, onSearchChange, results, loading, error, selected, onSelect, onClear }) {
  const { C } = useTheme();

  return (
    <View style={styles.container}>
      {selected ? (
        /* ── Selected patient chip ── */
        <View style={[styles.selectedChip, { backgroundColor: C.primary + '12', borderColor: C.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chipName, { color: C.primary }]}>{selected.name}</Text>
            <View style={styles.metaRow}>
              {selected.phone ? (
                <View style={styles.metaItem}>
                  <Text style={[styles.metaIcon, { color: C.primary + 'aa' }]}>📞</Text>
                  <Text style={[styles.metaText, { color: C.primary + 'bb' }]}>{selected.phone}</Text>
                </View>
              ) : null}
              {selected.email ? (
                <View style={styles.metaItem}>
                  <Text style={[styles.metaIcon, { color: C.primary + 'aa' }]}>✉</Text>
                  <Text style={[styles.metaText, { color: C.primary + 'bb' }]}>{selected.email}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} hitSlop={8}>
            <Text style={[styles.clearText, { color: C.primary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Input
            label="Search patient"
            placeholder="Name, phone, or email…"
            value={search}
            onChangeText={onSearchChange}
            icon="search"
          />

          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          )}

          {error ? <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text> : null}

          {!loading && results.length > 0 && (
            <View style={[styles.dropdown, { backgroundColor: C.card, borderColor: C.border }]}>
              {results.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => onSelect(p)}
                  style={[styles.dropdownItem, { borderBottomColor: C.border }]}
                >
                  {/* Name + identifier */}
                  <Text style={[styles.itemName, { color: C.text }]}>{p.name}</Text>

                  {/* Contact details row: phone + email */}
                  <View style={styles.contactRow}>
                    {p.phone ? (
                      <View style={styles.contactItem}>
                        <Text style={[styles.contactIcon, { color: C.textMuted }]}>📞</Text>
                        <Text style={[styles.contactText, { color: C.textMuted }]}>{p.phone}</Text>
                      </View>
                    ) : null}
                    {p.email ? (
                      <View style={styles.contactItem}>
                        <Text style={[styles.contactIcon, { color: C.textMuted }]}>✉</Text>
                        <Text style={[styles.contactText, { color: C.textMuted }]}>{p.email}</Text>
                      </View>
                    ) : null}
                    {p.age != null ? (
                      <Text style={[styles.contactText, { color: C.textMuted }]}>Age {p.age}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!loading && search.length >= 2 && !results.length && !error && (
            <Text style={[styles.hint, { color: C.textMuted }]}>No patients found.</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },

  // Selected chip
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  chipName:   { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  metaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaIcon:   { fontSize: 11 },
  metaText:   { fontSize: 12 },
  clearBtn:   { padding: 4 },
  clearText:  { fontSize: 16, fontWeight: '700' },

  // Search state
  centered:   { alignItems: 'center', padding: 8 },
  errorText:  { fontSize: 13 },
  hint:       { fontSize: 13 },

  // Dropdown
  dropdown:     { borderWidth: 1, borderRadius: 10, overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  itemName:     { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  contactRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  contactItem:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  contactIcon:  { fontSize: 11 },
  contactText:  { fontSize: 12 },
});
