import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { createSupportTicket, getSupportTickets } from '../../../api';

const SEVERITIES = ['low', 'medium', 'high'];

export function SupportScreen() {
  const { C } = useTheme();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getSupportTickets()
      .then((data) => {
        if (mounted) setTickets(data || []);
      })
      .catch((e) => {
        if (mounted) setError(e?.message || 'Unable to load support tickets.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const submitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      return;
    }
    setError('');
    try {
      const created = await createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        severity,
      });
      setTickets((prev) => [created, ...prev]);
      setSubject('');
      setMessage('');
      setSeverity('medium');
    } catch (e) {
      setError(e?.message || 'Unable to submit support ticket.');
    }
  };

  return (
    <ScreenContainer scroll contentContainerStyle={{ paddingBottom: 24 }}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Need help?</Text>
        <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
          Send a support ticket and our care team will respond.
        </Text>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Subject"
          placeholderTextColor={C.textMuted}
          style={[styles.input, { color: C.text, borderColor: C.border }]}
        />
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Describe your issue"
          placeholderTextColor={C.textMuted}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.message, { color: C.text, borderColor: C.border }]}
        />
        <View style={styles.severityRow}>
          {SEVERITIES.map((item) => (
            <Btn
              key={item}
              label={item.toUpperCase()}
              size="sm"
              variant={severity === item ? 'primary' : 'ghost'}
              onPress={() => setSeverity(item)}
            />
          ))}
        </View>
        <Btn label="Submit ticket" onPress={submitTicket} />
        {error ? <Text style={{ color: C.danger, fontSize: 12, marginTop: 8 }}>{error}</Text> : null}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>My tickets</Text>
        {loading ? <Text style={{ color: C.textMuted, fontSize: 12 }}>Loading tickets...</Text> : null}
        {!loading && !tickets.length ? (
          <Text style={{ color: C.textMuted, fontSize: 12 }}>No tickets yet.</Text>
        ) : null}
        {tickets.map((ticket) => (
          <View key={ticket.id || ticket.reference} style={styles.ticketRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ticketTitle, { color: C.text }]}>{ticket.subject}</Text>
              <Text style={{ color: C.textMuted, fontSize: 11 }}>{ticket.reference}</Text>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 11 }}>
              {(ticket.status || '').replace('_', ' ')}
            </Text>
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
  },
  message: { minHeight: 92, textAlignVertical: 'top' },
  severityRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  ticketTitle: { fontSize: 13, fontWeight: '600' },
});
