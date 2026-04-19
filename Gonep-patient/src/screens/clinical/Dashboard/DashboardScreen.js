import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Badge } from '../../../atoms/Badge';
import { Avatar } from '../../../atoms/Avatar';
import { Icon } from '../../../atoms/Icon';
import { SectionLoader } from '../../../atoms/SectionLoader';
import { getOrders, getRecords } from '../../../api';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { getAppointmentStatusMeta } from '../../../utils/appointmentAlerts';

export function DashboardScreen({
  user,
  goTo,
  appointments = [],
  loadingAppointments = false,
  onOpenAppointment,
  onOpenTrackOrder,
}) {
  const { C } = useTheme();
  const { cardColumns } = useResponsive();

  const [orders, setOrders] = useState([]);
  const [records, setRecords] = useState([]);
  const [appointmentsFilter, setAppointmentsFilter] = useState('upcoming');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [o, r] = await Promise.all([getOrders(), getRecords()]);
        if (mounted) {
          setOrders(o || []);
          setRecords(Array.isArray(r) ? r : (r?.items || []));
        }
      } catch (e) {
        if (__DEV__) console.warn('[Dashboard] data load error:', e.message);
      }
    };
    load();
    return () => {
      mounted = false;
    };
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
  const dashboardUpcomingAppointments = useMemo(
    () => upcomingAppointments.slice(0, 4),
    [upcomingAppointments]
  );
  const pendingAppointments = useMemo(
    () => (appointments || []).filter((item) => item.status === 'pending'),
    [appointments]
  );
  const dashboardPendingAppointments = useMemo(
    () => pendingAppointments.slice(0, 4),
    [pendingAppointments]
  );
  const dashboardAppointmentItems =
    appointmentsFilter === 'pending'
      ? dashboardPendingAppointments
      : dashboardUpcomingAppointments;
  const activeOrder = orders.find((item) => item.status === 'in_transit') || null;
  const activeOrderStatus = activeOrder?.status === 'delivered' ? 'Delivered' : 'In Transit';
  const activeOrderStatusColor = activeOrder?.status === 'delivered' ? 'success' : 'warning';
  const profileMeta = [
    user?.blood_group ? `Blood Group: ${user.blood_group}` : null,
    user?.age ? `Age ${user.age}` : null,
  ].filter(Boolean);
  const stats = [
    { icon: { lib: 'feather', name: 'calendar' }, label: 'Upcoming Appointments', value: String(upcomingAppointments.length) },
    { icon: { lib: 'mc', name: 'pill' }, label: 'Orders', value: String(orders.length) },
    { icon: { lib: 'mc', name: 'file-document-outline' }, label: 'Records', value: String(records.length) },
    { icon: { lib: 'feather', name: 'truck' }, label: 'Active Deliveries', value: String(orders.filter((item) => item.status === 'in_transit').length) },
  ];

  return (
    <ScreenContainer scroll>
      <View style={[styles.hero, { backgroundColor: C.primary }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <Text style={styles.heroGreeting}>Good morning</Text>
        <Text style={styles.heroName}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.heroMeta}>
          {profileMeta.length ? profileMeta.join(' · ') : 'Welcome to your patient dashboard'}
        </Text>
        <View style={styles.heroActions}>
          {[
            { icon: { lib: 'mc', name: 'home-heart' }, label: 'Home Visit', page: 'appointments' },
            { icon: { lib: 'mc', name: 'pill' }, label: 'Order Meds', page: 'orders' },
            { icon: { lib: 'mc', name: 'flask-outline' }, label: 'Lab Test', page: 'appointments' },
            { icon: { lib: 'feather', name: 'message-circle' }, label: 'Consult', page: 'chat' },
          ].map((a) => (
            <Btn
              key={a.label}
              label={a.label}
              icon={<Icon name={a.icon.name} lib={a.icon.lib} size={16} color="#fff" />}
              onPress={() => goTo(a.page)}
              size="sm"
              variant="white"
              style={styles.heroBtn}
            />
          ))}
        </View>
      </View>

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
                  (idx + 1) % cardColumns === 0 || cardColumns === 1 ? 0 : statCardMarginRight,
              },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: C.primaryLight }]}>
              <Icon name={s.icon.name} lib={s.icon.lib} size={18} color={C.primary} />
            </View>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
            <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
          </Card>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="calendar" lib="feather" size={16} color={C.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Appointments</Text>
          </View>
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
                    <Icon name="stethoscope" lib="mc" size={22} color={C.primary} />
                  </View>
                  <View>
                    <Text style={[styles.docName, { color: C.text }]}>{a.doctor}</Text>
                    <Text style={[styles.docSub, { color: C.textMuted }]}>
                      {a.specialty} · {a.type}
                    </Text>
                    <Text style={[styles.docTime, { color: C.primary }]}>
                      {a.date} at {a.time}
                    </Text>
                  </View>
                </View>
                <Badge
                  label={statusMeta.label}
                  color={statusMeta.color}
                />
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
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {appointmentsFilter === 'pending'
                  ? 'No pending appointments'
                  : 'No upcoming appointments'}
              </Text>
              <Text style={[styles.emptyBody, { color: C.textMuted }]}>
                {appointmentsFilter === 'pending'
                  ? 'Pending confirmation appointments will appear here.'
                  : 'Upcoming appointments will appear here when booked.'}
              </Text>
            </Card>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="truck-delivery" lib="mc" size={16} color={C.warning} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Active Order</Text>
          </View>
          <Btn
            label="Track"
            onPress={() => {
              if (onOpenTrackOrder) onOpenTrackOrder(activeOrder?.id || null);
              else goTo('track');
            }}
            size="sm"
          />
        </View>
        <Card
          style={[
            styles.activeOrderCard,
            { borderColor: C.warning, backgroundColor: C.warningLight },
          ]}
        >
          {activeOrder ? (
            <>
              <View style={styles.activeOrderHeader}>
                <Text style={[styles.activeOrderId, { color: C.text }]}>
                  {activeOrder.reference || activeOrder.id}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="bike" lib="mc" size={14} color={C.warning} style={{ marginRight: 4 }} />
                  <Badge label={activeOrderStatus} color={activeOrderStatusColor} />
                </View>
              </View>
              <Text style={{ color: C.textSec, fontSize: 13, marginBottom: 10 }}>
                {activeOrder.items.map((i) => i.name).join(', ')}
              </Text>
              <View style={styles.activeOrderFooter}>
                <Avatar name={activeOrder.rider_name || 'Rider'} size={32} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>
                    {activeOrder.rider_name || 'Rider'}
                  </Text>
                  <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>
                    ETA {activeOrder.eta || '--'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>
              No active order in transit right now.
            </Text>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="file-document-outline" lib="mc" size={16} color={C.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Records</Text>
          </View>
          <Btn label="View All" onPress={() => goTo('records')} variant="ghost" size="sm" />
        </View>
        {records.slice(0, 3).map((r) => (
          <Card key={r.id} hover style={styles.recordCard}>
            <View style={styles.recordRow}>
              <View style={[styles.recordIcon, { backgroundColor: `${r.color}20` }]}>
                <Icon name={r.icon} lib="mc" size={20} color={r.color} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 8 }}>
                <Text style={[styles.recordTitle, { color: C.text }]}>{r.title}</Text>
                <Text style={[styles.recordSub, { color: C.textMuted }]}>
                  {r.provider} · {r.date}
                </Text>
              </View>
              <Text style={{ color: C.primary, fontSize: 18 }}>›</Text>
            </View>
          </Card>
        ))}
        {records.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: C.text }]}>No records yet</Text>
            <Text style={[styles.emptyBody, { color: C.textMuted }]}>
              Recent medical records will appear here after consultations or lab results.
            </Text>
          </Card>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: 20, marginBottom: 18, overflow: 'hidden' },
  heroDecor1: { position: 'absolute', right: -30, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2: { position: 'absolute', right: 40, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroGreeting: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 3 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 14 },
  heroMetaStrong: { fontWeight: '700' },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap' },
  heroBtn: { marginRight: 8, marginBottom: 6 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  statCard: { marginBottom: 10 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: '800' },
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  dashboardFilterRow: { flexDirection: 'row', marginBottom: 10 },
  appointmentCard: { marginBottom: 10 },
  appointmentsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  appointmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appointmentLeft: { flexDirection: 'row', alignItems: 'center' },
  docAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  docName: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  docSub: { fontSize: 12, marginBottom: 4 },
  docTime: { fontSize: 12, fontWeight: '600' },
  activeOrderCard: { borderWidth: 2 },
  activeOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  activeOrderId: { fontWeight: '700', fontSize: 14 },
  activeOrderFooter: { flexDirection: 'row', alignItems: 'center' },
  recordCard: { marginBottom: 8 },
  recordRow: { flexDirection: 'row', alignItems: 'center' },
  recordIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recordTitle: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  recordSub: { fontSize: 11 },
  emptyCard: { marginBottom: 8 },
  emptyTitle: { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  emptyBody: { fontSize: 12 },
});
