import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getRecordById } from '../../../api';
import { Btn } from '../../../atoms/Btn';
import { Card } from '../../../atoms/Card';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useTheme } from '../../../theme/ThemeContext';

export function RecordDetailsScreen({ recordId, onBack }) {
  const { C } = useTheme();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getRecordById(recordId)
      .then((data) => {
        if (mounted) setRecord(data || null);
      })
      .catch((e) => {
        if (mounted) setError(e?.message || 'Unable to load record details.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [recordId]);

  const fields = record?.detail?.fields || {};

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <Btn label="Back to records" variant="ghost" size="sm" onPress={onBack} />
      <Card style={styles.card}>
        {loading ? <Text style={{ color: C.textMuted }}>Loading details...</Text> : null}
        {!loading && error ? <Text style={{ color: C.danger }}>{error}</Text> : null}
        {!loading && !error && !record ? (
          <Text style={{ color: C.textMuted }}>Record details not found.</Text>
        ) : null}
        {!loading && record ? (
          <View>
            <Text style={[styles.title, { color: C.text }]}>{record.title}</Text>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
              {record.provider} · {record.date}
            </Text>
            {fields.drug_name ? <Text style={[styles.row, { color: C.text }]}>Medication: {fields.drug_name}</Text> : null}
            {fields.dosage ? <Text style={[styles.row, { color: C.text }]}>Dosage: {fields.dosage}</Text> : null}
            {fields.instructions ? (
              <Text style={[styles.row, { color: C.text }]}>Instructions: {fields.instructions}</Text>
            ) : null}
            {fields.prescribed_date ? (
              <Text style={[styles.row, { color: C.text }]}>Prescribed on: {fields.prescribed_date}</Text>
            ) : null}
            {fields.test_name ? <Text style={[styles.row, { color: C.text }]}>Test: {fields.test_name}</Text> : null}
            {fields.result_summary ? (
              <Text style={[styles.row, { color: C.text }]}>Result: {fields.result_summary}</Text>
            ) : null}
            {fields.result_date ? (
              <Text style={[styles.row, { color: C.text }]}>Result date: {fields.result_date}</Text>
            ) : null}
            {fields.status ? <Text style={[styles.row, { color: C.text }]}>Status: {fields.status}</Text> : null}
            {fields.assessment_summary ? (
              <Text style={[styles.row, { color: C.text }]}>Assessment summary: {fields.assessment_summary}</Text>
            ) : null}
            {fields.plan_summary ? (
              <Text style={[styles.row, { color: C.text }]}>Plan summary: {fields.plan_summary}</Text>
            ) : null}
          </View>
        ) : null}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 8 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  row: { fontSize: 13, marginBottom: 6 },
});
