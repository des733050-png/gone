import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { useRequests } from '../../hooks/useRequests';
import { acceptRequest, declineRequest } from '../../api';

export function RequestsScreen({ onAccept }) {
  const { C } = useTheme();
  const { requests, setRequests, loading } = useRequests();
  const [actioning, setActioning] = useState(null);

  const handleAccept = async (id) => {
    setActioning(id);
    await acceptRequest(id);
    setRequests((r) => r.filter((x) => x.id !== id));
    setActioning(null);
    if (onAccept) onAccept(id);
  };

  const handleDecline = async (id) => {
    setActioning(id);
    await declineRequest(id);
    setRequests((r) => r.filter((x) => x.id !== id));
    setActioning(null);
  };

  return (
    <ScreenContainer scroll>
      {loading && (
        <Card style={styles.empty}><Text style={{ color: C.textMuted }}>Loading requests…</Text></Card>
      )}
      {!loading && requests.length === 0 && (
        <Card style={styles.empty}>
          <Icon name="inbox" lib="feather" size={40} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No Requests</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>New delivery requests will appear here.</Text>
        </Card>
      )}
      {requests.map((req) => (
        <Card key={req.id} style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.icon, { backgroundColor: C.warningLight }]}>
              <Icon name="package-variant" lib="mc" size={24} color={C.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.reqId, { color: C.textMuted }]}>{req.id}</Text>
              <Text style={[styles.patient, { color: C.text }]}>{req.patient}</Text>
              <Text style={[styles.pharmacy, { color: C.primary }]}>📍 {req.pharmacy}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.payout, { color: C.success }]}>{req.payout}</Text>
              <Badge label="Pending" color="warning" />
            </View>
          </View>

          {/* Meta grid */}
          <View style={[styles.metaGrid, { backgroundColor: C.bg }]}>
            {[
              { icon: 'map-pin', lib: 'feather', label: 'Deliver To', value: req.address },
              { icon: 'navigation', lib: 'feather', label: 'Distance', value: req.distance },
              { icon: 'clock', lib: 'feather', label: 'ETA', value: req.eta },
              { icon: 'clock', lib: 'feather', label: 'Placed', value: req.placed_at },
            ].map((m) => (
              <View key={m.label} style={styles.metaItem}>
                <Icon name={m.icon} lib={m.lib} size={13} color={C.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.metaLabel, { color: C.textMuted }]}>{m.label}: </Text>
                <Text style={[styles.metaValue, { color: C.text }]} numberOfLines={1}>{m.value}</Text>
              </View>
            ))}
          </View>

          {/* Items */}
          <View style={[styles.itemsBox, { borderColor: C.border }]}>
            <Text style={[styles.itemsTitle, { color: C.textSec }]}>Items:</Text>
            {req.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Icon name="pill" lib="mc" size={14} color={C.primary} style={{ marginRight: 6 }} />
                <Text style={[styles.itemText, { color: C.text }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Btn
              label={actioning === req.id ? 'Accepting…' : 'Accept Request'}
              onPress={() => handleAccept(req.id)}
              loading={actioning === req.id}
              style={{ flex: 1, marginRight: 8 }}
              icon={<Icon name="check" lib="feather" size={16} color="#fff" />}
            />
            <Btn
              label="Decline"
              variant="danger"
              onPress={() => handleDecline(req.id)}
              disabled={actioning === req.id}
            />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 14, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reqId: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  patient: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  pharmacy: { fontSize: 12, fontWeight: '600' },
  payout: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  metaGrid: { borderRadius: 10, padding: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaLabel: { fontSize: 12 },
  metaValue: { fontSize: 12, fontWeight: '600', flex: 1 },
  itemsBox: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  itemsTitle: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  itemText: { fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
});
