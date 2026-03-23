// ─── BillingScreen.js ─────────────────────────────────────────────────────────
// Available to: hospital_admin (full), billing_manager (full)
// Shows: revenue summary KPIs, invoice list with filters, payment method breakdown,
//        overdue alerts, mark-paid and reminder actions.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getBilling, markBillingPaid, appendLog } from '../../../api';

const STATUS_COLOR = { paid: 'success', pending: 'warning', overdue: 'danger' };
const METHOD_ICON  = { 'M-Pesa': 'smartphone', NHIF: 'shield', Invoice: 'file-text', Cash: 'dollar-sign' };
const METHOD_COLOR = { 'M-Pesa': 'success', NHIF: 'primary', Invoice: 'warning', Cash: 'primary' };

const safeNum = (v, fallback = 0) => { const n = Number(v?.replace?.(/[^0-9.]/g, '') || v); return isNaN(n) ? fallback : n; };

export function BillingScreen({ filter: propFilter, user }) {
  const { C } = useTheme();
  const [bills,   setBills]   = useState([]);
  const [filter,  setFilter]  = useState(propFilter || 'all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});

  useEffect(() => { if (propFilter) setFilter(propFilter); }, [propFilter]);

  useEffect(() => {
    setLoading(true);
    getBilling().then(d => { setBills(d || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleMarkPaid = async (id) => {
    const b = bills.find(x => x.id === id);
    await markBillingPaid(id);
    appendLog({
      staff: user ? `${user.first_name} ${user.last_name}` : 'Billing',
      staff_id: user?.id, role: user?.role || 'billing_manager',
      module: 'Billing', action: 'Invoice marked paid',
      detail: `${b?.amount} — ${b?.patient}`, type: 'billing',
    });
    setBills(prev => prev.map(x => x.id === id ? { ...x, status: 'paid' } : x));
  };

  const handleReminder = async (id) => {
    const b = bills.find(x => x.id === id);
    setSending(s => ({ ...s, [id]: true }));
    await new Promise(r => setTimeout(r, 600));
    appendLog({
      staff: user ? `${user.first_name} ${user.last_name}` : 'Billing',
      staff_id: user?.id, role: user?.role || 'billing_manager',
      module: 'Billing', action: 'Reminder sent',
      detail: `${b?.patient} — ${b?.amount}`, type: 'billing',
    });
    setSending(s => ({ ...s, [id]: false }));
  };

  // ── Computed metrics ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const paid    = bills.filter(b => b.status === 'paid');
    const pending = bills.filter(b => b.status === 'pending');
    const overdue = bills.filter(b => b.status === 'overdue');
    const totalRevenue  = paid.reduce((s, b)    => s + safeNum(b.amount_raw || b.amount), 0);
    const pendingValue  = pending.reduce((s, b) => s + safeNum(b.amount_raw || b.amount), 0);
    const overdueValue  = overdue.reduce((s, b) => s + safeNum(b.amount_raw || b.amount), 0);
    const collectionRate = bills.length
      ? Math.round((paid.length / bills.length) * 100)
      : 0;
    // Payment method breakdown
    const byMethod = bills.filter(b => b.status === 'paid').reduce((acc, b) => {
      const m = b.method || 'Other';
      acc[m] = (acc[m] || 0) + safeNum(b.amount_raw || b.amount);
      return acc;
    }, {});
    return {
      paid: paid.length, pending: pending.length, overdue: overdue.length,
      totalRevenue, pendingValue, overdueValue, collectionRate, byMethod,
    };
  }, [bills]);

  const filtered = bills.filter(b =>
    filter === 'all' ? true : b.status === filter
  );

  const FILTER_BTNS = [
    { id: 'all',     label: 'All' },
    { id: 'pending', label: `Pending (${metrics.pending})` },
    { id: 'overdue', label: `Overdue (${metrics.overdue})` },
    { id: 'paid',    label: `Paid (${metrics.paid})` },
  ];

  const fmt = n => `KSh ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  return (
    <ScreenContainer scroll>
      {/* ── KPI row ── */}
      <View style={s.kpiRow}>
        <Card style={[s.kpiCard, { flex: 1.3 }]}>
          <View style={[s.kpiIcon, { backgroundColor: C.successLight }]}>
            <Icon name="check-circle" lib="feather" size={18} color={C.success} />
          </View>
          <Text style={[s.kpiValue, { color: C.text }]}>{fmt(metrics.totalRevenue)}</Text>
          <Text style={[s.kpiLabel, { color: C.textMuted }]}>Revenue collected</Text>
          <Text style={[s.kpiSub, { color: C.success }]}>{metrics.collectionRate}% collection rate</Text>
        </Card>
        <View style={{ gap: 10, flex: 1 }}>
          <Card style={s.kpiSmall}>
            <Icon name="clock" lib="feather" size={14} color={C.warning} style={{ marginBottom: 3 }} />
            <Text style={[s.kpiSmallVal, { color: C.text }]}>{fmt(metrics.pendingValue)}</Text>
            <Text style={[s.kpiSmallLbl, { color: C.textMuted }]}>Pending</Text>
          </Card>
          <Card style={s.kpiSmall}>
            <Icon name="alert-circle" lib="feather" size={14} color={C.danger} style={{ marginBottom: 3 }} />
            <Text style={[s.kpiSmallVal, { color: C.danger }]}>{fmt(metrics.overdueValue)}</Text>
            <Text style={[s.kpiSmallLbl, { color: C.textMuted }]}>Overdue</Text>
          </Card>
        </View>
      </View>

      {/* ── Overdue alert ── */}
      {metrics.overdue > 0 && (
        <View style={[s.overdueAlert, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
          <Icon name="alert-triangle" lib="feather" size={14} color={C.danger} style={{ marginRight: 8 }} />
          <Text style={{ color: C.danger, fontSize: 12, flex: 1 }}>
            {metrics.overdue} invoice{metrics.overdue !== 1 ? 's are' : ' is'} overdue totalling {fmt(metrics.overdueValue)}.
            Send reminders to recover.
          </Text>
        </View>
      )}

      {/* ── Payment method breakdown ── */}
      {Object.keys(metrics.byMethod).length > 0 && (
        <Card style={s.methodCard}>
          <Text style={[s.sectionTitle, { color: C.text }]}>Collected by payment method</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {Object.entries(metrics.byMethod).map(([method, val]) => (
              <View key={method} style={[s.methodPill, { backgroundColor: `${C.primary}10`, borderColor: C.border }]}>
                <Icon name={METHOD_ICON[method] || 'file-text'} lib="feather" size={12} color={C.primary} style={{ marginRight: 5 }} />
                <Text style={{ fontSize: 11, color: C.textSec }}>{method}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: C.text, marginLeft: 8 }}>{fmt(val)}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ── Filter tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {FILTER_BTNS.map(f => (
          <Btn key={f.id} label={f.label} variant={filter === f.id ? 'primary' : 'ghost'}
            size="sm" onPress={() => setFilter(f.id)} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>

      {/* ── Invoice list ── */}
      {filtered.length === 0 && !loading && (
        <View style={s.empty}>
          <Icon name="file-text" lib="feather" size={36} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No invoices in this category</Text>
        </View>
      )}

      {filtered.map(b => (
        <Card key={b.id} hover style={s.billCard}>
          <View style={s.billRow}>
            <View style={[s.billIcon, { backgroundColor: `${C.primary}12` }]}>
              <Icon name={METHOD_ICON[b.method] || 'file-text'} lib="feather" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <Text style={[s.billPatient, { color: C.text }]}>{b.patient}</Text>
                {b.status === 'overdue' && (
                  <View style={[s.overdueChip, { backgroundColor: C.dangerLight }]}>
                    <Text style={{ fontSize: 9, color: C.danger, fontWeight: '700' }}>OVERDUE</Text>
                  </View>
                )}
              </View>
              <Text style={[s.billService, { color: C.textSec }]}>{b.service}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                <Badge label={b.method} color={METHOD_COLOR[b.method] || 'primary'} />
                <Text style={[s.billDate, { color: C.textMuted }]}>{b.date}</Text>
                <Text style={{ fontSize: 10, color: C.textMuted }}>{b.id}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.billAmount, { color: C.text }]}>{b.amount}</Text>
              <Badge label={b.status.charAt(0).toUpperCase() + b.status.slice(1)} color={STATUS_COLOR[b.status] || 'primary'} />
            </View>
          </View>

          {/* Actions */}
          {b.status !== 'paid' && (
            <View style={[s.billActions, { borderTopColor: C.divider }]}>
              <Btn
                label={sending[b.id] ? 'Sending…' : 'Send reminder'}
                variant="secondary"
                size="sm"
                disabled={!!sending[b.id]}
                onPress={() => handleReminder(b.id)}
                style={{ marginRight: 8 }}
              />
              <Btn
                label="Mark as paid"
                size="sm"
                onPress={() => handleMarkPaid(b.id)}
              />
            </View>
          )}
          {b.status === 'paid' && (
            <View style={[s.paidConfirm, { borderTopColor: C.divider }]}>
              <Icon name="check-circle" lib="feather" size={12} color={C.success} style={{ marginRight: 5 }} />
              <Text style={{ color: C.success, fontSize: 11, fontWeight: '600' }}>Payment confirmed</Text>
            </View>
          )}
        </Card>
      ))}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  kpiRow:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  kpiCard:     { padding: 14 },
  kpiIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue:    { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  kpiLabel:    { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiSub:      { fontSize: 11, fontWeight: '600', marginTop: 4 },
  kpiSmall:    { flex: 1, padding: 10 },
  kpiSmallVal: { fontSize: 14, fontWeight: '900', marginBottom: 1 },
  kpiSmallLbl: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  overdueAlert:{ flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  methodCard:  { marginBottom: 14, padding: 14 },
  sectionTitle:{ fontSize: 13, fontWeight: '700' },
  methodPill:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  billCard:    { marginBottom: 10, padding: 14 },
  billRow:     { flexDirection: 'row', alignItems: 'flex-start' },
  billIcon:    { width: 44, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  billPatient: { fontSize: 14, fontWeight: '700' },
  billService: { fontSize: 12 },
  billDate:    { fontSize: 11 },
  billAmount:  { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  billActions: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  paidConfirm: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  overdueChip: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  empty:       { alignItems: 'center', paddingVertical: 48 },
});
