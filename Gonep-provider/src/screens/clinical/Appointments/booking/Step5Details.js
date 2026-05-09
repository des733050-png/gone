import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { FormField } from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import { countWords, validateMinWords } from '../../../../utils/textValidation';

const MIN_REASON_WORDS = 5;

export function Step5Details({ visitReason, onReasonChange, notes, onNotesChange, submitting, error, onSubmit }) {
  const { C } = useTheme();
  const reasonWords  = countWords(visitReason);
  const reasonError  = validateMinWords(visitReason, MIN_REASON_WORDS, 'Visit reason');

  return (
    <View style={styles.container}>
      <FormField
        label="Visit reason *"
        value={visitReason}
        onChangeText={onReasonChange}
        placeholder="Reason for the appointment…"
        multiline
        numberOfLines={3}
        style={styles.field}
      />
      <View style={styles.countRow}>
        <Text style={[styles.count, { color: reasonError ? C.warning : C.textMuted }]}>
          {reasonWords} / {MIN_REASON_WORDS}+ words
        </Text>
        <Text style={[styles.count, { color: C.textMuted }]}>{visitReason.length}/300</Text>
      </View>
      {reasonError && visitReason.trim().length > 0 ? (
        <Text style={{ fontSize: 11, color: C.warning, marginTop: 2 }}>{reasonError}</Text>
      ) : null}

      <FormField
        label="Notes (optional)"
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Additional notes for the doctor…"
        multiline
        numberOfLines={3}
        style={styles.field}
      />
      <Text style={[styles.count, { color: C.textMuted }]}>{notes.length}/500</Text>

      {error ? <Text style={[styles.error, { color: C.danger }]}>{error}</Text> : null}

      <Btn
        label="Confirm Appointment"
        onPress={onSubmit}
        loading={submitting}
        disabled={!!reasonError || submitting}
        full
        style={styles.btn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  field: { marginTop: 12 },
  count: { fontSize: 11, marginTop: -4 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  error: { fontSize: 13, marginTop: 8 },
  btn: { marginTop: 16 },
});
