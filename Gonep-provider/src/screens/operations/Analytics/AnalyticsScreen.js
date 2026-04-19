// ─── AnalyticsScreen.js ───────────────────────────────────────────────────────
// Available to: hospital_admin, billing_manager
// Shows: revenue trends, service breakdown, billing status, inventory value,
//        top drugs, appointment volume, website earnings.
//
// Charts are rendered as custom SVG/View compositions — no third-party chart
// library required, keeping the bundle lean and offline-safe.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getAnalytics } from '../../../api';

const W = Math.min(Dimensions.get('window').width - 48, 500);
const BAR_H = 140;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1000000) return `KSh ${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `KSh ${(n/1000).toFixed(0)}k`;
  return `KSh ${n}`;
}
function fmtShort(n) {
  if (n >= 1000) return `${(n/1000).toFixed(0)}k`;
  return String(n);
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ title, sub, C }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '800', color: C.text }}>{title}</Text>
      {sub && <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

// ─── Bar chart (custom View-based) ────────────────────────────────────────────
function BarChart({ data, height = BAR_H, color, valueFormat = fmtShort }) {
  const { C } = useTheme();
  const max = Math.max(...data.map(d => d.value || d.count || 0), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 28, gap: 4 }}>
      {data.map((d, i) => {
        const val = d.value || d.count || 0;
        const barH = Math.max(4, (val / max) * height);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 9, color: C.textMuted, marginBottom: 3 }}>{valueFormat(val)}</Text>
            <View style={{ width: '80%', height: barH, backgroundColor: color || C.primary, borderRadius: 4 }} />
            <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Multi-series line-style bar chart ────────────────────────────────────────
function DualBarChart({ data, series, height = BAR_H }) {
  const { C } = useTheme();
  const COLORS = [C.primary, C.success];
  const max = Math.max(...data.flatMap(d => series.map(s => d[s.key] || 0)), 1);
  return (
    <View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
        {series.map((s, i) => (
          <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[i] }} />
            <Text style={{ fontSize: 11, color: C.textSec }}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: height + 24, gap: 4 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height }}>
              {series.map((s, si) => {
                const val = d[s.key] || 0;
                const barH = Math.max(4, (val / max) * height);
                return <View key={s.key} style={{ flex: 1, height: barH, backgroundColor: COLORS[si], borderRadius: 3 }} />;
              })}
            </View>
            <Text style={{ fontSize: 9, color: C.textMuted, marginTop: 4 }}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Donut-style pie (View-based approximation) ───────────────────────────────
function DonutStat({ data, C }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const COLORS = [C.success, C.warning, C.danger];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
      <View style={[styles.donutOuter, { borderColor: C.border }]}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: C.text }}>{total}</Text>
        <Text style={{ fontSize: 10, color: C.textMuted }}>invoices</Text>
      </View>
      <View style={{ flex: 1, gap: 8 }}>
        {data.map((d, i) => (
          <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS[i] }} />
            <Text style={{ flex: 1, fontSize: 12, color: C.textSec }}>{d.label}</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{d.value}</Text>
            <Text style={{ fontSize: 10, color: C.textMuted }}>({Math.round(d.value/total*100)}%)</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color, C }) {
  return (
    <Card style={[styles.kpiCard, { flex: 1 }]}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>
        <Icon name={icon} lib="feather" size={18} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color: C.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: C.textMuted }]}>{label}</Text>
      {sub && <Text style={[styles.kpiSub, { color: color }]}>{sub}</Text>}
    </Card>
  );
}

// ─── AnalyticsScreen ──────────────────────────────────────────────────────────
export function AnalyticsScreen({ user }) {
  const { C } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isBilling = user?.role === 'billing_manager';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getAnalytics()
      .then((payload) => {
        if (mounted) setData(payload || null);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Unable to load analytics.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const a = useMemo(
    () =>
      data || {
        revenue_over_time: [],
        revenue_by_service: [],
        billing_status: { paid: 0, pending: 0, overdue: 0 },
        inventory_value: [],
        top_drugs: [],
        appointment_volume: [],
        website_earnings: { total: 0, this_month: 0, orders: 0, avg_order: 0, top_products: [] },
      },
    [data]
  );

  const billingStatus = [
    { label: 'Paid',    value: a.billing_status.paid    },
    { label: 'Pending', value: a.billing_status.pending },
    { label: 'Overdue', value: a.billing_status.overdue },
  ];

  const totalRevenue = a.revenue_over_time.reduce((s, d) => s + d.clinic + d.website, 0);
  const thisMonth    = a.revenue_over_time[a.revenue_over_time.length - 1];
  const thisMonthRev = thisMonth.clinic + thisMonth.website;

  return (
    <ScreenContainer scroll>
      {loading && <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading analytics...</Text>}
      {!!error && <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text>}
      {!loading && !error && !data && (
        <Card style={{ marginBottom: 12 }}>
          <Text style={{ color: C.text, fontWeight: '700', marginBottom: 4 }}>No analytics data yet</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Analytics will appear when backend data is available for your role.</Text>
        </Card>
      )}
      {/* KPI summary */}
      <View style={styles.kpiRow}>
        <KpiCard icon="dollar-sign" label="Total revenue" value={fmt(totalRevenue)} sub={`${fmt(thisMonthRev)} this month`} color={C.primary} C={C} />
        <KpiCard icon="trending-up" label="Website earnings" value={fmt(a.website_earnings.total)} sub={`${a.website_earnings.orders} orders`} color={C.success} C={C} />
      </View>
      <View style={styles.kpiRow}>
        <KpiCard icon="package" label="Inventory value" value={fmt(a.inventory_value.reduce((s,d) => s+d.value, 0))} color={C.warning} C={C} />
        <KpiCard icon="users" label="Appts this week" value={a.appointment_volume.reduce((s,d) => s+d.count, 0)} sub="across all doctors" color={C.purple || '#8B5CF6'} C={C} />
      </View>

      {/* Revenue over time */}
      <Card style={styles.chartCard}>
        <SectionTitle title="Revenue over time" sub="Clinic vs website — last 6 months" C={C} />
        <DualBarChart
          data={a.revenue_over_time}
          series={[{ key: 'clinic', label: 'Clinic' }, { key: 'website', label: 'Website' }]}
        />
      </Card>

      {/* Revenue by service */}
      <Card style={styles.chartCard}>
        <SectionTitle title="Revenue by service type" sub="All time" C={C} />
        <BarChart data={a.revenue_by_service} color={C.primary} valueFormat={fmt} />
      </Card>

      {/* Billing status */}
      <Card style={styles.chartCard}>
        <SectionTitle title="Billing status" sub="Current invoice breakdown" C={C} />
        <DonutStat data={billingStatus} C={C} />
      </Card>

      {/* Inventory */}
      {!isBilling && (
        <Card style={styles.chartCard}>
          <SectionTitle title="Inventory value by category" sub="KSh value of current stock" C={C} />
          <BarChart data={a.inventory_value} color={C.success} valueFormat={fmt} />
        </Card>
      )}

      {/* Top drugs */}
      <Card style={styles.chartCard}>
        <SectionTitle title="Top dispensed drugs" sub="Units dispensed + revenue" C={C} />
        {a.top_drugs.map((d, i) => (
          <View key={d.name} style={[styles.drugRow, { borderBottomColor: C.divider }]}>
            <View style={[styles.rankBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={{ color: C.primary, fontWeight: '800', fontSize: 11 }}>#{i+1}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.text }}>{d.name}</Text>
              <Text style={{ fontSize: 11, color: C.textMuted }}>{d.dispensed} units dispensed</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: C.text }}>{fmt(d.revenue)}</Text>
          </View>
        ))}
      </Card>

      {/* Appointment volume */}
      {!isBilling && (
        <Card style={styles.chartCard}>
          <SectionTitle title="Appointment volume" sub="This week by day" C={C} />
          <BarChart data={a.appointment_volume} color={C.purple || '#8B5CF6'} />
        </Card>
      )}

      {/* Website earnings detail */}
      <Card style={styles.chartCard}>
        <SectionTitle title="Website pharmacy earnings" sub="ecommerce storefront" C={C} />
        <View style={[styles.webStatRow, { borderBottomColor: C.divider }]}>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Total orders</Text>
          <Text style={{ color: C.text, fontWeight: '700' }}>{a.website_earnings.orders}</Text>
        </View>
        <View style={[styles.webStatRow, { borderBottomColor: C.divider }]}>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>Avg order value</Text>
          <Text style={{ color: C.text, fontWeight: '700' }}>{fmt(a.website_earnings.avg_order)}</Text>
        </View>
        <View style={[styles.webStatRow, { borderBottomColor: C.divider, borderBottomWidth: 0 }]}>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>This month</Text>
          <Text style={{ color: C.success, fontWeight: '800' }}>{fmt(a.website_earnings.this_month)}</Text>
        </View>
        <Text style={[styles.subSectionTitle, { color: C.textMuted }]}>Top products</Text>
        {a.website_earnings.top_products.map(p => (
          <View key={p.name} style={[styles.webStatRow, { borderBottomColor: C.divider }]}>
            <Text style={{ flex: 1, fontSize: 12, color: C.textSec }}>{p.name}</Text>
            <Text style={{ fontSize: 11, color: C.textMuted, marginRight: 10 }}>{p.orders} orders</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.text }}>{fmt(p.revenue)}</Text>
          </View>
        ))}
      </Card>

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  kpiRow:        { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard:       { padding: 14, alignItems: 'flex-start' },
  kpiIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  kpiValue:      { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  kpiLabel:      { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiSub:        { fontSize: 11, fontWeight: '600', marginTop: 4 },
  chartCard:     { marginBottom: 14, padding: 16 },
  drugRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  rankBadge:     { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  donutOuter:    { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  webStatRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1 },
  subSectionTitle:{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 6 },
});
