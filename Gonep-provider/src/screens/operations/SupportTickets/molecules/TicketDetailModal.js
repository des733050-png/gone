// ─── screens/operations/SupportTickets/molecules/TicketDetailModal.js ─────────
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Badge } from '../../../../atoms/Badge';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { FormField }    from '../../../../molecules/FormField';
import { useTheme } from '../../../../theme/ThemeContext';
import {
  STATUS_LABEL, STATUS_COLOR, PRIORITY_COLOR, canRespond,
} from '../../../../constants/support';

export function TicketDetailModal({ visible, ticket, user, onClose, onUpdate }) {
  const { C } = useTheme();
  const [response, setResponse] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  if (!ticket) return null;
  const responder = canRespond(user?.role);

  const handleRespond = async () => {
    if (!response.trim()) return;
    try {
      setSaving(true);
      setError('');
      const newResp = {
        by:   `${user.first_name} ${user.last_name}`,
        role: user.role,
        ts:   new Date().toISOString(),
        text: response.trim(),
      };
      await onUpdate(ticket.id, { responses: [...(ticket.responses || []), newResp] });
      setResponse('');
    } catch (err) {
      setError(err?.message || 'Unable to send response.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (newStatus) => {
    try {
      setError('');
      await onUpdate(ticket.id, { status: newStatus });
    } catch (err) {
      setError(err?.message || 'Unable to update ticket status.');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="85%">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 }}>
              {ticket.title}
            </Text>
            <Text style={{ fontSize: 12, color: C.textMuted }}>
              By {ticket.raised_by_name} · {ticket.category}
            </Text>
          </View>
          <Badge label={STATUS_LABEL[ticket.status]} color={STATUS_COLOR[ticket.status] || 'primary'} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <Badge label={ticket.priority} color={PRIORITY_COLOR[ticket.priority] || 'warning'} />
          <Text style={{ fontSize: 11, color: C.textMuted }}>#{ticket.id}</Text>
        </View>

        <View style={[s.descBox, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={{ fontSize: 13, color: C.text, lineHeight: 19 }}>{ticket.description}</Text>
        </View>

        {/* Responses */}
        {(ticket.responses || []).length > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 }}>
              Responses
            </Text>
            {ticket.responses.map((r, i) => (
              <View key={i} style={[s.responseRow, {
                backgroundColor: r.role === 'it_admin' ? C.primaryLight : C.surface,
                borderColor: C.border,
              }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '700', fontSize: 12, color: C.text }}>{r.by}</Text>
                  <Text style={{ fontSize: 10, color: C.textMuted }}>{r.ts}</Text>
                </View>
                <Text style={{ fontSize: 13, color: C.text, lineHeight: 18 }}>{r.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Response input — responders only */}
        {!!error && <Text style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{error}</Text>}
        {responder && ticket.status !== 'closed' && (
          <View style={{ marginTop: 14 }}>
            <FormField
              label="Add response"
              value={response}
              onChangeText={setResponse}
              placeholder="Type your response…"
              multiline
              numberOfLines={3}
            />
            <Btn label={saving ? 'Sending…' : 'Send response'} onPress={handleRespond} loading={saving} full style={{ marginTop: 6 }} />
          </View>
        )}

        {/* Status transitions — responders only */}
        {responder && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {ticket.status === 'open'        && <Btn label="Mark In Progress" size="sm" variant="secondary" onPress={() => handleStatus('in_progress')} />}
            {ticket.status === 'in_progress' && <Btn label="Mark Resolved"   size="sm" variant="success"   onPress={() => handleStatus('resolved')}    />}
            {ticket.status === 'resolved'    && <Btn label="Close Ticket"    size="sm" variant="ghost"     onPress={() => handleStatus('closed')}      />}
          </View>
        )}
      </ScrollView>
      <Btn label="Close" variant="ghost" onPress={onClose} full style={{ marginTop: 14 }} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  descBox:     { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  responseRow: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
});
