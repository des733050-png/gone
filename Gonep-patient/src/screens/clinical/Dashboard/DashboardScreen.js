// FILE: src/screens/clinical/Dashboard/DashboardScreen.js
// COMPLETE REPLACEMENT
// Changes:
// - greeting now comes from prop (set by MainShell using getGreeting())
// - user.first_name + user.last_name used everywhere — no hardcoding
// - Hero buttons: removed "Order Meds", "Track", "Consult" — all NI
// - Active Order section: commented out (NI)
// - Recent Records section: retained

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { T } from '../../../atoms/T';
import { FloatingLabel } from '../../../atoms/FloatingLabel';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Badge } from '../../../atoms/Badge';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { getRecords } from '../../../api';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getAppointmentStatusMeta } from '../../../utils/appointmentAlerts';

export function DashboardScreen({
  user,
  goTo,
  appointments = [],
  loadingAppointments = false,
  onOpenAppointment,
  greeting = 'Good morning',
}) {
  const { C } = useTheme();
  const { cardColumns } = useResponsive();
  const [records, setRecords] = useState([]);
  const [appointmentsFilter, setAppointmentsFilter] = useState('upcoming');

  const userName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : '';

  const profileMeta = [
    user?.blood_group ? `Blood Group: ${user.blood_group}` : null,
    user?.age ? `Age ${user.age}` : null,
  ].filter(Boolean);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const r = await getRecords();
        if (mounted) {
          setRecords(Array.isArray(r) ? r : (r?.items || []));
        }
      } catch (e) {
        if (__DEV__) console.warn('[Dashboard] records load error:', e.message);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const statCardBasis =
    cardColumns === 3 ? '32%' : cardColumns === 2 ? '48%' : '100%';
  const statCardMarginRight =
    cardColumns === 3 ? '2%' : cardColumns === 2 ? '4%' : 0;

  const appointmentColumns = Math.min(cardColumns || 1, 2);
  const appointmentCardBasis = appointmentColumns === 2 ? '48%' : '100%';
  const appointmentCardMarginRight = appointmentColumns === 2 ? '4%' : 0;

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return (appointments || []).filter((item) => {
      if (item.status !== 'confirmed') return false;
      if (!item.scheduled_for) return true;
      const dt = new Date(item.scheduled_for);
      if (Number.isNaN(dt.getTime())) return true;
      return dt >= now;
    });
  }, [appointments]);

  const pendingAppointments = useMemo(
    () => (appointments || []).filter((item) => item.status === 'pending'),
    [appointments]
  );

  const dashboardAppointmentItems = useMemo(() => {
    const source = appointmentsFilter === 'pending'
      ? pendingAppointments
      : upcomingAppointments;
    return source.slice(0, 4);
  }, [appointmentsFilter, upcomingAppointments, pendingAppointments]);

  const stats = [
    { icon: { lib: 'feather', name: 'calendar' }, label: 'Upcoming',     value: String(upcomingAppointments.length) },
    { icon: { lib: 'feather', name: 'clock' },    label: 'Pending',      value: String(pendingAppointments.length) },
    { icon: { lib: 'mc', name: 'file-document-outline' }, label: 'Records', value: String(records.length) },
  ];

  return (
    <ScreenContainer scroll>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: C.primary }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <T style={styles.heroGreeting}>{greeting}</T>
        <T style={styles.heroName}>{userName || 'Patient'}</T>
        <T style={styles.heroMeta}>
          {profileMeta.length ? profileMeta.join(' · ') : 'Welcome to your health dashboard'}
        </T>

        {/* Hero quick actions — only enabled pages */}
        <View style={styles.heroActions}>
          <Btn
            label="Appointments"
            icon={<Icon name="calendar" lib="feather" size={15} color="#fff" />}
            onPress={() => goTo('appointments')}
            size="sm"
            variant="white"
            style={styles.heroBtn}
          />
          <Btn
            label="Records"
            icon={<Icon name="file-document-outline" lib="mc" size={15} color="#fff" />}
            onPress={() => goTo('records')}
            size="sm"
            variant="white"
            style={styles.heroBtn}
          />
          {/* Disabled hero buttons — uncomment when pages are ready:
          <Btn label="Order Meds" ... onPress={() => goTo('orders')} />
          <Btn label="Consult"    ... onPress={() => goTo('chat')} />
          */}
        </View>
      </View>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        {stats.map((s, idx) => (
          <Card
            key={s.label}
            hover
            style={[
              styles.statCard,
              {
                flexBasis: statCardBasis,
                marginRight:
                  (idx + 1) % cardColumns === 0 || cardColumns === 1
                    ? 0
                    : statCardMarginRight,
              },
            ]}
          >
            <T style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</T>
            <FloatingLabel label={s.value} size="lg" style={{ marginTop: 4 }} />
          </Card>
        ))}
      </View>

      {/* ── Appointments section ──────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <T style={[styles.sectionTitle, { color: C.text }]}>Appointments</T>
          <Btn label="View All" onPress={() => goTo('appointments')} variant="ghost" size="sm" />
        </View>

        <View style={styles.dashboardFilterRow}>
          <Btn
            label={`Upcoming (${upcomingAppointments.length})`}
            variant={appointmentsFilter === 'upcoming' ? 'primary' : 'ghost'}
            size="sm"
            onPress={() => setAppointmentsFilter('upcoming')}
          />
          <Btn
            label={`Pending (${pendingAppointments.length})`}
            variant={appointmentsFilter === 'pending' ? 'primary' : 'ghost'}
            size="sm"
            style={{ marginLeft: 8 }}
            onPress={() => setAppointmentsFilter('pending')}
          />
        </View>

        <View style={styles.appointmentsRow}>
          {loadingAppointments ? <SectionLoader label="Loading appointments..." /> : null}
          {dashboardAppointmentItems.map((a, idx) => {
            const statusMeta = getAppointmentStatusMeta(a.status);
            return (
              <Card
                key={a.id}
                hover
                style={[
                  styles.appointmentCard,
                  {
                    flexBasis: appointmentCardBasis,
                    marginRight:
                      (idx + 1) % appointmentColumns === 0 || appointmentColumns === 1
                        ? 0
                        : appointmentCardMarginRight,
                  },
                ]}
              >
                <View style={styles.appointmentRow}>
                  <View style={styles.appointmentLeft}>
                    <View style={[styles.docAvatar, { backgroundColor: C.primaryLight }]}>
                      <Icon name="stethoscope" lib="mc" size={20} color={C.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FloatingLabel label={a.doctor} size="sm" style={{ marginBottom: 4 }} />
                      <T style={[styles.docSub, { color: C.textMuted }]}>
                        {a.specialty} · {a.type}
                      </T>
                      <T style={[styles.docTime, { color: C.primary }]}>
                        {a.date} at {a.time}
                      </T>
                    </View>
                  </View>
                  <Badge label={statusMeta.label} color={statusMeta.color} />
                </View>
                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Btn
                    label="View Details"
                    variant="ghost"
                    size="sm"
                    onPress={() => onOpenAppointment && onOpenAppointment(a.id)}
                  />
                </View>
              </Card>
            );
          })}
          {!loadingAppointments && dashboardAppointmentItems.length === 0 ? (
            <Card style={styles.emptyCard}>
              <T style={[styles.emptyTitle, { color: C.text }]}>
                {appointmentsFilter === 'pending' ? 'No pending appointments' : 'No upcoming appointments'}
              </T>
              <T style={[styles.emptyBody, { color: C.textMuted }]}>
                Book an appointment from the Appointments tab.
              </T>
            </Card>
          ) : null}
        </View>
      </View>

      {/* ── Active Order section — DISABLED (NI) ─────────────────────────── */}
      {/* Uncomment when Order Medicine is enabled:
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          ...active order content...
        </View>
      </View>
      */}

      {/* ── Recent Records ────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <T style={[styles.sectionTitle, { color: C.text }]}>Recent Records</T>
          <Btn label="View All" onPress={() => goTo('records')} variant="ghost" size="sm" />
        </View>
        {records.slice(0, 3).map((r) => (
          <Card key={r.id} hover style={styles.recordCard}>
            <View style={styles.recordRow}>
              <View style={[styles.recordIcon, { backgroundColor: `${r.color}20` }]}>
                <Icon name={r.icon} lib="mc" size={20} color={r.color} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <T style={[styles.recordTitle, { color: C.text }]}>{r.title}</T>
                <T style={[styles.recordSub, { color: C.textMuted }]}>
                  {r.provider} · {r.date}
                </T>
              </View>
              <Icon name="chevron-right" lib="feather" size={16} color={C.textMuted} />
            </View>
          </Card>
        ))}
        {records.length === 0 ? (
          <Card style={styles.emptyCard}>
            <T style={[styles.emptyTitle, { color: C.text }]}>No records yet</T>
            <T style={[styles.emptyBody, { color: C.textMuted }]}>
              Medical records from consultations will appear here.
            </T>
          </Card>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero:               { borderRadius: 18, padding: 20, marginBottom: 18, overflow: 'hidden' },
  heroDecor1:         { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2:         { position: 'absolute', right: 40, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroGreeting:       { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 3 },
  heroName:           { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroMeta:           { color: 'rgba(255,255,255,0.80)', fontSize: 14, marginBottom: 14 },
  heroActions:        { flexDirection: 'row', flexWrap: 'wrap' },
  heroBtn:            { marginRight: 8, marginBottom: 6 },
  statsRow:           { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  statCard:           { marginBottom: 10 },
  statLabel:          { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  section:            { marginBottom: 18 },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle:       { fontSize: 16, fontWeight: '700' },
  dashboardFilterRow: { flexDirection: 'row', marginBottom: 10 },
  appointmentsRow:    { flexDirection: 'row', flexWrap: 'wrap' },
  appointmentCard:    { marginBottom: 10 },
  appointmentRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appointmentLeft:    { flexDirection: 'row', alignItems: 'flex-start', flex: 1, paddingRight: 8 },
  docAvatar:          { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  docSub:             { fontSize: 12, marginBottom: 3 },
  docTime:            { fontSize: 12, fontWeight: '600' },
  recordCard:         { marginBottom: 8 },
  recordRow:          { flexDirection: 'row', alignItems: 'center' },
  recordIcon:         { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recordTitle:        { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  recordSub:          { fontSize: 12 },
  emptyCard:          { marginBottom: 8 },
  emptyTitle:         { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  emptyBody:          { fontSize: 13 },
});
