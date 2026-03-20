// TripHistory Screen
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getTrips } from '../../api';

export function TripHistoryScreen() {
  const { C } = useTheme();
  const [trips, setTrips] = useState([]);

  useEffect(() => { getTrips().then((t) => setTrips(t || [])); }, []);

  const Stars = ({ n }) => (
    <View style={{ flexDirection: 'row' }}>
      {[1,2,3,4,5].map((i) => (
        <Icon key={i} name="star" lib="mc" size={13} color={i <= n ? C.warning : C.border} style={{ marginRight: 1 }} />
      ))}
    </View>
  );

  return (
    <ScreenContainer scroll>
      <View style={[styles.totalBanner, { backgroundColor: C.primaryLight, borderColor: C.primaryMid }]}>
        <Text style={[styles.totalLabel, { color: C.primary }]}>Total Trips Completed</Text>
        <Text style={[styles.totalValue, { color: C.primary }]}>342</Text>
      </View>

      {trips.map((t) => (
        <Card key={t.id} hover style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.tripIcon, { backgroundColor: C.successLight }]}>
              <Icon name="check-circle" lib="feather" size={20} color={C.success} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.patient, { color: C.text }]}>{t.patient}</Text>
              <Text style={[styles.address, { color: C.textMuted }]}>{t.address}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.payout, { color: C.success }]}>{t.payout}</Text>
              <Badge label="Completed" color="success" />
            </View>
          </View>
          <View style={[styles.metaRow, { backgroundColor: C.bg }]}>
            {[
              { icon: 'calendar', lib: 'feather', value: t.date },
              { icon: 'map-pin', lib: 'feather', value: t.distance },
              { icon: 'clock', lib: 'feather', value: t.duration },
            ].map((m) => (
              <View key={m.value} style={styles.metaItem}>
                <Icon name={m.icon} lib={m.lib} size={12} color={C.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.metaVal, { color: C.textSec }]}>{m.value}</Text>
              </View>
            ))}
          </View>
          <View style={styles.ratingRow}>
            <Text style={[styles.ratingLabel, { color: C.textMuted }]}>Patient rating:</Text>
            <Stars n={t.rating} />
          </View>
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  totalBanner: { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  totalLabel: { fontSize: 13, fontWeight: '600' },
  totalValue: { fontSize: 36, fontWeight: '900', marginTop: 2 },
  card: { marginBottom: 10, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tripIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  patient: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  address: { fontSize: 12 },
  payout: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  metaRow: { borderRadius: 8, padding: 8, flexDirection: 'row', gap: 12, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaVal: { fontSize: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingLabel: { fontSize: 12 },
});
