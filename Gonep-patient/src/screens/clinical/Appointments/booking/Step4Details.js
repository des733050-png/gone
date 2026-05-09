import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Card } from '../../../../atoms/Card';
import { Icon } from '../../../../atoms/Icon';
import { useTheme } from '../../../../theme/ThemeContext';
import { countWords, validateMinWords } from '../../../../utils/textValidation';

const MIN_REASON_WORDS = 5;

function formatDate(slot) {
  if (!slot) return '—';
  const raw = slot.datetime || (slot.date && slot.time ? `${slot.date}T${slot.time}:00` : null);
  if (!raw) return slot.date || '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return slot.date || '—';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function formatTime(slot) {
  if (!slot) return '—';
  if (slot.time || slot.start) return slot.time || slot.start;
  const raw = slot.datetime;
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function Step4Details({
  specialty,
  doctor,
  selectedTime: slot,
  appointmentType,
  visitReason,
  onReasonChange,
  submitting,
  error,
  onSubmit,
}) {
  const { C } = useTheme();
  const reasonWords = countWords(visitReason);
  const reasonError = validateMinWords(visitReason, MIN_REASON_WORDS, 'Reason');

  const summary = [
    { label: 'Doctor', value: doctor?.full_name || doctor?.name || '—' },
    { label: 'Specialty', value: specialty || '—' },
    { label: 'Date', value: formatDate(slot) },
    { label: 'Time', value: formatTime(slot) },
    { label: 'Type', value: appointmentType },
  ];

  return (
    <View style={s.container}>
      <Card style={s.summaryCard}>
        {summary.map((row, i, arr) => (
          <View
            key={row.label}
            style={[s.row, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }]}
          >
            <Text style={[s.rowLabel, { color: C.textMuted }]}>{row.label}</Text>
            <Text style={[s.rowValue, { color: C.text }]}>{row.value}</Text>
          </View>
        ))}
      </Card>

      <Text style={[s.fieldLabel, { color: C.text }]}>Reason for visit *</Text>
      <TextInput
        value={visitReason}
        onChangeText={(v) => onReasonChange(v.slice(0, 300))}
        placeholder="Describe your symptoms or reason…"
        placeholderTextColor={C.textMuted}
        multiline
        numberOfLines={4}
        style={[s.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]}
      />
      <View style={s.countRow}>
        <Text style={[s.count, { color: reasonError ? C.warning : C.textMuted }]}>
          {reasonWords} / {MIN_REASON_WORDS}+ words
        </Text>
        <Text style={[s.count, { color: C.textMuted }]}>{visitReason.length}/300</Text>
      </View>
      {reasonError && visitReason.trim().length > 0 ? (
        <Text style={{ fontSize: 11, color: C.warning, marginTop: 2 }}>{reasonError}</Text>
      ) : null}

      {!!error && (
        <View style={[s.errorBox, { backgroundColor: C.dangerLight || '#FEE2E2', borderColor: C.danger }]}>
          <Icon name="alert-circle" lib="feather" size={14} color={C.danger} />
          <Text style={{ color: C.danger, fontSize: 13, flex: 1, marginLeft: 8 }}>{error}</Text>
        </View>
      )}

      <Btn
        label="Request Appointment"
        onPress={onSubmit}
        full
        loading={submitting}
        disabled={!!reasonError || submitting}
        style={s.btn}
      />

      <Text style={[s.note, { color: C.textMuted }]}>
        Your request will be sent to the clinic. You will be notified once it is confirmed or rejected.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 8 },
  summaryCard: { marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 4 },
  rowLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, minHeight: 88, textAlignVertical: 'top',
  },
  count: { fontSize: 11, marginTop: 2 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 4 },
  btn: { marginTop: 8 },
  note: { fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },
});
