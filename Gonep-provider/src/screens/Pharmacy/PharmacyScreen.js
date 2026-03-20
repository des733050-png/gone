import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getPrescriptions, dispatchPrescription } from '../../api';

export function PharmacyScreen() {
  const { C } = useTheme();
  const [prescriptions, setPrescriptions] = useState([]);
  const [dispatching, setDispatching]     = useState(null);

  useEffect(() => { getPrescriptions().then((d) => setPrescriptions(d || [])); }, []);

  const handleDispatch = async (id) => {
    setDispatching(id);
    const updated = await dispatchPrescription(id);
    setPrescriptions((p) => p.map((x) => x.id === id ? { ...x, status: 'dispatched' } : x));
    setDispatching(null);
  };

  const statusColor = { pending_dispatch: 'warning', dispatched: 'success', cancelled: 'danger' };
  const statusLabel = { pending_dispatch: 'Pending Dispatch', dispatched: 'Dispatched', cancelled: 'Cancelled' };

  return (
    <ScreenContainer scroll>
      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Pending',    value: prescriptions.filter((p) => p.status === 'pending_dispatch').length, color: C.warning,  bg: C.warningLight, icon: 'clock' },
          { label: 'Dispatched', value: prescriptions.filter((p) => p.status === 'dispatched').length,       color: C.success,  bg: C.successLight, icon: 'check-circle' },
        ].map((s) => (
          <Card key={s.label} style={[styles.summaryCard, { flex: 1 }]}>
            <View style={[styles.summaryIcon, { backgroundColor: s.bg }]}>
              <Icon name={s.icon} lib="feather" size={20} color={s.color} />
            </View>
            <Text style={[styles.summaryValue, { color: C.text }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {prescriptions.map((rx) => (
        <Card key={rx.id} style={styles.rxCard}>
          <View style={styles.rxHeader}>
            <View style={[styles.rxIcon, { backgroundColor: C.warningLight }]}>
              <Icon name="pill" lib="mc" size={22} color={C.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.rxId, { color: C.textMuted }]}>{rx.id}</Text>
              <Text style={[styles.rxDrug, { color: C.text }]}>{rx.drug}</Text>
              <Text style={[styles.rxInstructions, { color: C.textSec }]}>{rx.instructions} · Qty: {rx.qty}</Text>
            </View>
            <Badge label={statusLabel[rx.status] || rx.status} color={statusColor[rx.status] || 'primary'} />
          </View>
          <View style={[styles.rxMeta, { backgroundColor: C.bg }]}>
            <View style={styles.rxMetaItem}>
              <Icon name="account" lib="mc" size={13} color={C.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.rxMetaText, { color: C.textSec }]}>{rx.patient}</Text>
            </View>
            <View style={styles.rxMetaItem}>
              <Icon name="clock" lib="feather" size={13} color={C.textMuted} style={{ marginRight: 4 }} />
              <Text style={[styles.rxMetaText, { color: C.textSec }]}>{rx.date}</Text>
            </View>
          </View>
          {rx.status === 'pending_dispatch' && (
            <Btn
              label={dispatching === rx.id ? 'Dispatching…' : '🛵 Dispatch Rider'}
              onPress={() => handleDispatch(rx.id)}
              loading={dispatching === rx.id}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
              icon={<Icon name="truck-fast" lib="mc" size={16} color="#fff" />}
            />
          )}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { padding: 14, alignItems: 'center' },
  summaryIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: '900' },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rxCard: { marginBottom: 12, padding: 14 },
  rxHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  rxIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rxId: { fontSize: 11, marginBottom: 2 },
  rxDrug: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  rxInstructions: { fontSize: 12 },
  rxMeta: { borderRadius: 8, padding: 8, flexDirection: 'row', gap: 16 },
  rxMetaItem: { flexDirection: 'row', alignItems: 'center' },
  rxMetaText: { fontSize: 12 },
});
