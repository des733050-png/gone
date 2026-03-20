import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getBilling } from '../../api';

export function BillingScreen() {
  const { C } = useTheme();
  const [bills, setBills] = useState([]);
  useEffect(() => { getBilling().then((d) => setBills(d || [])); }, []);

  const paid    = bills.filter((b) => b.status === 'paid');
  const pending = bills.filter((b) => b.status === 'pending');
  const overdue = bills.filter((b) => b.status === 'overdue');

  const statusColor = { paid: 'success', pending: 'warning', overdue: 'danger' };
  const methodIcon  = { 'M-Pesa': 'cellphone', 'NHIF': 'shield', 'Invoice': 'file-document-outline' };

  return (
    <ScreenContainer scroll>
      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Paid',    value: paid.length,    color: C.success, bg: C.successLight, icon: 'check-circle' },
          { label: 'Pending', value: pending.length, color: C.warning, bg: C.warningLight, icon: 'clock' },
          { label: 'Overdue', value: overdue.length, color: C.danger,  bg: C.dangerLight,  icon: 'alert-circle' },
        ].map((s) => (
          <Card key={s.label} style={[styles.summaryCard, { flex: 1 }]}>
            <View style={[styles.summaryIcon, { backgroundColor: s.bg }]}>
              <Icon name={s.icon} lib="feather" size={18} color={s.color} />
            </View>
            <Text style={[styles.summaryValue, { color: C.text }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {bills.map((b) => (
        <Card key={b.id} hover style={styles.billCard}>
          <View style={styles.billRow}>
            <View style={[styles.billIcon, { backgroundColor: C.primaryLight }]}>
              <Icon name={methodIcon[b.method] || 'file-document-outline'} lib="mc" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.billId, { color: C.textMuted }]}>{b.id}</Text>
              <Text style={[styles.billPatient, { color: C.text }]}>{b.patient}</Text>
              <Text style={[styles.billService, { color: C.textSec }]}>{b.service} · {b.method}</Text>
              <Text style={[styles.billDate, { color: C.textMuted }]}>{b.date}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.billAmount, { color: C.text }]}>{b.amount}</Text>
              <Badge label={b.status.charAt(0).toUpperCase() + b.status.slice(1)} color={statusColor[b.status] || 'primary'} />
            </View>
          </View>
          {b.status !== 'paid' && (
            <View style={styles.billActions}>
              <Btn label="Send Reminder" variant="secondary" size="sm" style={{ marginRight: 8 }} />
              <Btn label="Mark Paid" variant="success" size="sm" />
            </View>
          )}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { padding: 14, alignItems: 'center' },
  summaryIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  summaryValue: { fontSize: 26, fontWeight: '900' },
  summaryLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  billCard: { marginBottom: 10, padding: 14 },
  billRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  billIcon: { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  billId: { fontSize: 10, marginBottom: 2 },
  billPatient: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  billService: { fontSize: 12, marginBottom: 2 },
  billDate: { fontSize: 11 },
  billAmount: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  billActions: { flexDirection: 'row', marginTop: 4 },
});
