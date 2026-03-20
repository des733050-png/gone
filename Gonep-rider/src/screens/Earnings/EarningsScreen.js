import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Card } from '../../atoms/Card';
import { Btn } from '../../atoms/Btn';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { useEarnings } from '../../hooks/useEarnings';

export function EarningsScreen() {
  const { C } = useTheme();
  const { earnings, loading } = useEarnings();

  if (loading || !earnings) {
    return <ScreenContainer scroll><Card><Text style={{ color: C.textMuted }}>Loading…</Text></Card></ScreenContainer>;
  }

  const maxAmount = Math.max(...earnings.daily.map((d) => d.amount), 1);

  return (
    <ScreenContainer scroll>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        {[
          { label: "Today",       value: `KSh ${earnings.today.toLocaleString()}`,         icon: 'sun',         lib: 'feather', color: C.warning,  bg: C.warningLight },
          { label: "This Week",   value: `KSh ${earnings.this_week.toLocaleString()}`,     icon: 'calendar',    lib: 'feather', color: C.primary,  bg: C.primaryLight },
          { label: "This Month",  value: `KSh ${earnings.this_month.toLocaleString()}`,    icon: 'trending-up', lib: 'feather', color: C.success,  bg: C.successLight },
          { label: "Pending",     value: `KSh ${earnings.pending_payout.toLocaleString()}`, icon: 'clock',      lib: 'feather', color: C.purple,   bg: C.purpleLight },
        ].map((s) => (
          <Card key={s.label} hover style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: s.bg }]}>
              <Icon name={s.icon} lib={s.lib} size={20} color={s.color} />
            </View>
            <Text style={[styles.summaryValue, { color: C.text }]}>{s.value}</Text>
            <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {/* Bar chart */}
      <Card style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={[styles.chartTitle, { color: C.text }]}>Daily Earnings This Week</Text>
        </View>
        <View style={styles.barChart}>
          {earnings.daily.map((d, i) => {
            const pct = (d.amount / maxAmount) * 100;
            const isToday = i === 5; // Saturday (index-matched)
            return (
              <View key={d.day} style={styles.barCol}>
                <Text style={[styles.barAmount, { color: C.textMuted }]}>
                  {d.amount > 0 ? `${(d.amount / 1000).toFixed(1)}k` : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, {
                    height: `${Math.max(pct, 3)}%`,
                    backgroundColor: isToday ? C.warning : d.amount > 0 ? C.primary : C.border,
                  }]} />
                </View>
                <Text style={[styles.barDay, { color: isToday ? C.warning : C.textMuted, fontWeight: isToday ? '700' : '400' }]}>
                  {d.day}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Payout section */}
      <Card style={[styles.payoutCard, { borderColor: `${C.success}60`, borderWidth: 2 }]}>
        <View style={styles.payoutRow}>
          <View style={[styles.payoutIcon, { backgroundColor: C.successLight }]}>
            <Icon name="dollar-sign" lib="feather" size={24} color={C.success} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.payoutLabel, { color: C.textSec }]}>Pending Payout</Text>
            <Text style={[styles.payoutAmount, { color: C.success }]}>KSh {earnings.pending_payout.toLocaleString()}</Text>
            <Text style={[styles.payoutBank, { color: C.textMuted }]}>Equity Bank · ****4521</Text>
          </View>
          <Btn label="Request" variant="success" size="sm"
            icon={<Icon name="arrow-right" lib="feather" size={14} color="#fff" />} />
        </View>
      </Card>

      {/* Breakdown */}
      <Card>
        <Text style={[styles.breakTitle, { color: C.text }]}>Earnings Breakdown</Text>
        {[
          { label: 'Delivery Fee',        amount: 'KSh 22,400', pct: '79%' },
          { label: 'Tips',                amount: 'KSh 3,800',  pct: '13%' },
          { label: 'Bonuses',             amount: 'KSh 2,200',  pct: '8%' },
        ].map((b) => (
          <View key={b.label} style={[styles.breakRow, { borderBottomColor: C.divider }]}>
            <Text style={[styles.breakLabel, { color: C.textSec }]}>{b.label}</Text>
            <View style={styles.breakRight}>
              <Text style={[styles.breakPct, { color: C.textMuted }]}>{b.pct}</Text>
              <Text style={[styles.breakAmount, { color: C.text }]}>{b.amount}</Text>
            </View>
          </View>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  summaryCard: { padding: 14, flex: 1, minWidth: 140 },
  summaryIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  summaryLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  chartCard: { marginBottom: 14 },
  chartHeader: { marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '700' },
  barChart: { flexDirection: 'row', height: 120, alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barAmount: { fontSize: 9, marginBottom: 3 },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barDay: { fontSize: 10, marginTop: 4 },
  payoutCard: { marginBottom: 14, padding: 16 },
  payoutRow: { flexDirection: 'row', alignItems: 'center' },
  payoutIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  payoutLabel: { fontSize: 12, fontWeight: '600' },
  payoutAmount: { fontSize: 22, fontWeight: '800' },
  payoutBank: { fontSize: 12, marginTop: 2 },
  breakTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  breakLabel: { fontSize: 14 },
  breakRight: { alignItems: 'flex-end' },
  breakPct: { fontSize: 11 },
  breakAmount: { fontSize: 14, fontWeight: '700' },
});
