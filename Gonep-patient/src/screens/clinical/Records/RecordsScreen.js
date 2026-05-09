// ─── screens/patient/Records/RecordsScreen.js ────────────────────────────────
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useRecords } from '../../../hooks/useRecords';

const SECTION_ORDER = ['encounters', 'diagnoses', 'medications', 'labs', 'vitals', 'documents'];

const SECTION_META = {
  encounters:  { icon: 'stethoscope',            color: '#3B7DD8' },
  diagnoses:   { icon: 'medical-bag',             color: '#D95C5C' },
  medications: { icon: 'pill',                    color: '#27A76A' },
  labs:        { icon: 'flask-outline',           color: '#E0952A' },
  vitals:      { icon: 'heart-pulse',             color: '#D95C5C' },
  documents:   { icon: 'file-document-outline',   color: '#7B61D4' },
};

export function RecordsScreen({ onOpenRecord }) {
  const { C } = useTheme();
  const { records, sections, loading, error } = useRecords();

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={C.primary} style={{ marginTop: 48 }} />
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.inlineFeedback}>
          <Text style={[styles.inlineFeedbackText, { color: C.danger }]}>
            {error?.message || 'Could not load records.'}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!sections && records.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.inlineFeedback}>
          <Text style={[styles.inlineFeedbackText, { color: C.textMuted }]}>
            Records from your visits will appear here.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  if (sections) {
    return (
      <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 32 }}>
        {SECTION_ORDER.map((key) => {
          const section = sections[key];
          if (!section) return null;
          const meta = SECTION_META[key] || { icon: 'file-outline', color: C.primary };
          const count = section.count ?? section.items?.length ?? 0;

          return (
            <Card key={key} style={[styles.card, { borderColor: C.border }]}>
              {/* Section header — just title + count, no icon bubble clutter */}
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{section.title}</Text>
                <Text style={[styles.sectionCount, { color: C.textMuted }]}>
                  {section.coming_soon ? 'Soon' : count}
                </Text>
              </View>

              {section.coming_soon ? (
                <Text style={[styles.dimNote, { color: C.textMuted }]}>
                  {section.message || 'Coming soon.'}
                </Text>
              ) : section.items?.length ? (
                <>
                  {section.items.slice(0, 3).map((r, idx) => (
                    <RecordRow
                      key={r.id}
                      r={r}
                      fallbackColor={meta.color}
                      border={idx < Math.min(section.items.length, 3) - 1}
                      dividerColor={C.divider}
                      textColor={C.text}
                      mutedColor={C.textMuted}
                      onPress={() => onOpenRecord?.(r.id)}
                    />
                  ))}
                  {section.items.length > 3 && (
                    <TouchableOpacity style={styles.moreRow} activeOpacity={0.6}>
                      <Text style={[styles.moreText, { color: C.primary }]}>
                        See all {count}
                      </Text>
                      <Icon name="chevron-right" lib="feather" size={12} color={C.primary} />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={[styles.dimNote, { color: C.textMuted }]}>Nothing here yet.</Text>
              )}
            </Card>
          );
        })}
      </ScreenContainer>
    );
  }

  // Flat list fallback
  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 32 }}>
      <Card style={styles.card}>
        {records.map((r, idx) => (
          <RecordRow
            key={r.id}
            r={r}
            fallbackColor={C.primary}
            border={idx < records.length - 1}
            dividerColor={C.divider}
            textColor={C.text}
            mutedColor={C.textMuted}
            onPress={() => onOpenRecord?.(r.id)}
          />
        ))}
      </Card>
    </ScreenContainer>
  );
}

function RecordRow({ r, fallbackColor, border, dividerColor, textColor, mutedColor, onPress }) {
  const color = r.color || fallbackColor;
  return (
    <TouchableOpacity
      activeOpacity={0.65}
      onPress={onPress}
      style={[styles.row, border && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dividerColor }]}
    >
      <View style={[styles.dot, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
        <Icon name={r.icon || 'file-outline'} lib="mc" size={16} color={color} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: textColor }]} numberOfLines={1}>{r.title}</Text>
        {(r.provider || r.date) ? (
          <Text style={[styles.rowMeta, { color: mutedColor }]} numberOfLines={1}>
            {[r.provider, r.date].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-right" lib="feather" size={14} color={mutedColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },

  inlineFeedback:     { paddingTop: 48, paddingHorizontal: 24, alignItems: 'center' },
  inlineFeedbackText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  sectionCount: { fontSize: 12 },

  dimNote: { fontSize: 12, paddingBottom: 4 },

  moreRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, gap: 2 },
  moreText: { fontSize: 12, fontWeight: '600' },

  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10 },
  dot:     { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody: { flex: 1 },
  rowTitle:{ fontSize: 13, fontWeight: '600', marginBottom: 1 },
  rowMeta: { fontSize: 11 },
});