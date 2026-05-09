// ─── screens/patient/Records/RecordDetailsScreen.js ──────────────────────────
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getRecordById } from '../../../api';
import { Btn } from '../../../atoms/Btn';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useTheme } from '../../../theme/ThemeContext';

// Patient-friendly field labels — allowlist only, nothing clinical leaks through
const FIELDS = [
  { key: 'drug_name',          label: 'Medication'      },
  { key: 'dosage',             label: 'Dosage'          },
  { key: 'instructions',       label: 'Instructions'    },
  { key: 'prescribed_date',    label: 'Prescribed'      },
  { key: 'test_name',          label: 'Test'            },
  { key: 'result_summary',     label: 'Result'          },
  { key: 'result_date',        label: 'Date'            },
  { key: 'status',             label: 'Status'          },
  { key: 'assessment_summary', label: 'What was found'  },
  { key: 'plan_summary',       label: 'Care plan'       },
];

export function RecordDetailsScreen({ recordId, onBack }) {
  const { C } = useTheme();
  const [record,  setRecord]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let ok = true;
    setLoading(true);
    setError('');
    getRecordById(recordId)
      .then(d  => { if (ok) setRecord(d || null); })
      .catch(e => { if (ok) setError(e?.message || 'Unable to load this record.'); })
      .finally(()=> { if (ok) setLoading(false); });
    return () => { ok = false; };
  }, [recordId]);

  const rawFields = record?.detail?.fields || {};
  const fieldRows = FIELDS.filter(f => {
    const v = rawFields[f.key];
    return v != null && String(v).trim() !== '';
  });

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 40 }}>

      {/* Back link — minimal, no border button */}
      <Btn
        label="← Records"
        variant="ghost"
        size="sm"
        onPress={onBack}
        style={{ alignSelf: 'flex-start', marginBottom: 12 }}
      />

      {/* Loading */}
      {loading && (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      )}

      {/* Error — inline, no card */}
      {!loading && error ? (
        <Text style={[styles.feedbackText, { color: C.danger }]}>{error}</Text>
      ) : null}

      {/* Not found */}
      {!loading && !error && !record ? (
        <Text style={[styles.feedbackText, { color: C.textMuted }]}>
          This record couldn't be found.
        </Text>
      ) : null}

      {/* Record */}
      {!loading && record ? (
        <>
          {/* Title block — no card, sits as a document heading */}
          <View style={styles.heading}>
            <Text style={[styles.title, { color: C.text }]}>{record.title}</Text>
            {(record.provider || record.date) ? (
              <Text style={[styles.titleMeta, { color: C.textMuted }]}>
                {[record.provider, record.date].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

          {/* Fields */}
          {fieldRows.length > 0 ? (
            <Card style={styles.fieldsCard}>
              {fieldRows.map(({ key, label }, idx) => (
                <View
                  key={key}
                  style={[
                    styles.fieldRow,
                    idx < fieldRows.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: C.divider,
                    },
                  ]}
                >
                  <Text style={[styles.fieldLabel, { color: C.textMuted }]}>{label}</Text>
                  <Text style={[styles.fieldValue, { color: C.text }]}>
                    {String(rawFields[key])}
                  </Text>
                </View>
              ))}
            </Card>
          ) : (
            <Text style={[styles.feedbackText, { color: C.textMuted }]}>
              No further details for this record.
            </Text>
          )}
        </>
      ) : null}

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  feedbackText: { fontSize: 13, textAlign: 'center', marginTop: 32, lineHeight: 20 },

  heading:   { marginBottom: 16 },
  title:     { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 4 },
  titleMeta: { fontSize: 12 },

  fieldsCard: { marginBottom: 8 },

  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    gap: 16,
  },
  fieldLabel: { fontSize: 12, flexShrink: 0, paddingTop: 1 },
  fieldValue: { fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right', lineHeight: 19 },
});