import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useRecords } from '../../../hooks/useRecords';

export function RecordsScreen({ onOpenRecord }) {
  const { C } = useTheme();
  const { records, sections } = useRecords();
  const orderedSections = [
    'encounters',
    'diagnoses',
    'medications',
    'labs',
    'vitals',
    'documents',
  ];

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      {sections
        ? orderedSections.map((key) => {
            const section = sections[key];
            if (!section) return null;
            return (
              <Card key={key} style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: C.text }]}>{section.title}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>
                    {section.coming_soon ? 'Coming soon' : `${section.count} records`}
                  </Text>
                </View>
                {section.coming_soon ? (
                  <Text style={{ color: C.textMuted, fontSize: 12 }}>
                    {section.message || 'This section is coming soon.'}
                  </Text>
                ) : section.items?.length ? (
                  section.items.slice(0, 3).map((r) => (
                    <View key={r.id} style={styles.row}>
                      <View style={[styles.iconWrap, { backgroundColor: `${r.color}20` }]}>
                        <Icon name={r.icon} lib="mc" size={18} color={r.color} />
                      </View>
                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <Text style={[styles.title, { color: C.text }]}>{r.title}</Text>
                        <Text style={[styles.sub, { color: C.textMuted }]}>
                          {r.provider} · {r.date}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={{ color: C.textMuted, fontSize: 12 }}>
                    No entries yet for this section.
                  </Text>
                )}
              </Card>
            );
          })
        : null}
      {records.length === 0 && !sections ? (
        <Card style={styles.card}>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>No records yet</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>
            Medical records from your appointments will appear here.
          </Text>
        </Card>
      ) : null}
      {!sections && records.map((r) => (
        <Card key={r.id} hover style={styles.card}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${r.color}20` },
              ]}
            >
              <Icon name={r.icon} lib="mc" size={20} color={r.color} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={[styles.title, { color: C.text }]}>{r.title}</Text>
              <Text style={[styles.sub, { color: C.textMuted }]}>
                {r.provider} · {r.date}
              </Text>
            </View>
            <Btn label="Open" variant="ghost" size="sm" onPress={() => onOpenRecord?.(r.id)} />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
  },
});
