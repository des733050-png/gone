import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Card } from '../../../atoms/Card';
import { Btn } from '../../../atoms/Btn';
import { Avatar } from '../../../atoms/Avatar';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { EmptyState } from '../../../molecules/EmptyState';
import { getAnalytics, getAppointments, getPrescriptions, getLabResults } from '../../../api';
import { ROLE_LABELS } from '../../../config/roles';
import { getAllowedPages, normalizeRole } from '../../../config/roles';

// Quick-action items gated by role
const QUICK_ACTIONS = [
  { icon: { lib:'feather', name:'calendar' },            label:'Schedule',  page:'appointments', roles:['hospital_admin','doctor','receptionist'] },
  { icon: { lib:'mc',      name:'pill' },                label:'Pharmacy',  page:'pharmacy',     roles:['hospital_admin','doctor','lab_manager'] },
  { icon: { lib:'mc',      name:'file-document-outline'},label:'EMR',       page:'emr',          roles:['hospital_admin','doctor'] },
  { icon: { lib:'mc',      name:'flask-outline' },       label:'Lab',       page:'lab',          roles:['hospital_admin','doctor','lab_manager'] },
  { icon: { lib:'feather', name:'dollar-sign' },         label:'Billing',   page:'billing',      roles:['hospital_admin','billing_manager'] },
  { icon: { lib:'feather', name:'users' },               label:'Staff',     page:'staff',        roles:['hospital_admin'] },
];

export function DashboardScreen({ user, goTo }) {
  const { C } = useTheme();
  const { cardColumns } = useResponsive();
  const role = normalizeRole(user?.role);
  const [analytics, setAnalytics] = useState(null);
  const [roleMetrics, setRoleMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const statBasis    = cardColumns >= 3 ? '32%' : cardColumns >= 2 ? '48%' : '100%';
  const allowedPages = getAllowedPages(role);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setAnalytics(null);
    setRoleMetrics(null);

    const isAnalyticsRole = role === 'hospital_admin' || role === 'billing_manager';

    const loadDashboard = async () => {
      try {
        if (isAnalyticsRole) {
          const payload = await getAnalytics();
          if (mounted) setAnalytics(payload || null);
          return;
        }

        if (role === 'doctor') {
          const [appointments, prescriptions] = await Promise.all([
            getAppointments(),
            getPrescriptions(),
          ]);
          const upcomingAppointments = (appointments || []).filter((item) => {
            const status = String(item?.status || '').toLowerCase();
            if (status === 'cancelled' || status === 'completed') return false;
            const dateLabel = String(item?.date || '').toLowerCase();
            return (
              dateLabel.includes('today') ||
              dateLabel.includes('tomorrow') ||
              status === 'confirmed' ||
              status === 'pending'
            );
          }).length;
          const pendingPrescriptions = (prescriptions || []).filter((item) =>
            String(item?.status || '').toLowerCase().includes('pending')
          ).length;
          if (mounted) {
            setRoleMetrics({
              cards: [
                { icon: 'calendar', lib: 'feather', label: 'Upcoming appointments', value: upcomingAppointments, color: C.primary, bg: C.primaryLight, page: 'appointments' },
                { icon: 'pill', lib: 'mc', label: 'Pending prescriptions', value: pendingPrescriptions, color: C.warning, bg: C.warningLight, page: 'pharmacy' },
              ],
              emptyMessage: 'No upcoming appointments or pending prescriptions right now.',
            });
          }
          return;
        }

        if (role === 'lab_manager') {
          const labs = await getLabResults();
          const pendingLabs = (labs || []).filter((item) => {
            const status = String(item?.status || '').toLowerCase();
            return status.includes('pending') || status.includes('processing');
          }).length;
          if (mounted) {
            setRoleMetrics({
              cards: [
                { icon: 'flask-outline', lib: 'mc', label: 'Pending lab requests', value: pendingLabs, color: C.primary, bg: C.primaryLight, page: 'lab' },
              ],
              emptyMessage: 'No pending lab requests at the moment.',
            });
          }
          return;
        }

        if (role === 'receptionist') {
          const appointments = await getAppointments();
          const todayAppointments = (appointments || []).filter((item) =>
            String(item?.date || '').toLowerCase().includes('today')
          );
          const checkIns = todayAppointments.filter((item) => {
            const status = String(item?.status || '').toLowerCase();
            return status === 'confirmed' || status === 'in_progress' || status === 'completed';
          }).length;
          if (mounted) {
            setRoleMetrics({
              cards: [
                { icon: 'calendar', lib: 'feather', label: "Today's appointments", value: todayAppointments.length, color: C.primary, bg: C.primaryLight, page: 'appointments' },
                { icon: 'check-circle', lib: 'feather', label: "Today's check-ins", value: checkIns, color: C.success, bg: C.successLight, page: 'appointments' },
              ],
              emptyMessage: 'No appointments scheduled today.',
            });
          }
          return;
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Unable to load dashboard data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [role, C.primary, C.primaryLight, C.success, C.successLight, C.warning, C.warningLight]);

  const computed = useMemo(() => {
    const revenue = analytics?.revenue_over_time || [];
    const currentMonth = revenue.length ? revenue[revenue.length - 1] : null;
    const billingStatus = analytics?.billing_status || {};
    const appointments = analytics?.appointment_volume || [];
    const criticalLabs = (analytics?.top_drugs || []).slice(0, 3);
    return {
      thisMonthRevenue: (currentMonth?.clinic || 0) + (currentMonth?.website || 0),
      pendingInvoices: billingStatus.pending || 0,
      overdueInvoices: billingStatus.overdue || 0,
      weekAppointments: appointments.reduce((sum, item) => sum + (item?.count || 0), 0),
      topDrugs: criticalLabs,
    };
  }, [analytics]);

  // Stats visible per role
  const allStats = [
    { icon:'calendar',     lib:'feather', label:'Appointments this week', value: computed.weekAppointments, color:C.primary, bg:C.primaryLight, page:'appointments', roles:['hospital_admin','doctor','receptionist'] },
    { icon:'dollar-sign',  lib:'feather', label:'Pending invoices',      value: computed.pendingInvoices,  color:C.warning, bg:C.warningLight, page:'billing',      roles:['hospital_admin','billing_manager'] },
    { icon:'alert-circle', lib:'feather', label:'Overdue invoices',      value: computed.overdueInvoices,  color:C.danger,  bg:C.dangerLight,  page:'billing',      roles:['hospital_admin','billing_manager'] },
    { icon:'trending-up',  lib:'feather', label:'Revenue this month',    value:`KSh ${computed.thisMonthRevenue.toLocaleString()}`, color:C.success, bg:C.successLight, page:'analytics', roles:['hospital_admin','billing_manager'] },
    { icon:'pill',         lib:'mc',      label:'Top medications',       value: computed.topDrugs.length, color:C.warning, bg:C.warningLight, page:'pharmacy', roles:['hospital_admin','doctor','lab_manager'] },
  ];

  const visibleStats = allStats.filter(s => s.roles.includes(role) && allowedPages.includes(s.page));
  const roleAwareStats = roleMetrics?.cards || [];
  const statsToRender = roleAwareStats.length > 0 ? roleAwareStats : visibleStats;
  const visibleActions = QUICK_ACTIONS.filter(a => a.roles.includes(role) && allowedPages.includes(a.page));

  return (
    <ScreenContainer scroll>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: C.primary }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroGreeting}>Good morning 👋</Text>
            <Text style={styles.heroName}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.heroSub}>{user.specialty || ROLE_LABELS[role]} · {user.facility}</Text>
            {user.license && <Text style={styles.heroLicense}>Lic: {user.license}</Text>}
            <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{ROLE_LABELS[role]}</Text>
            </View>
          </View>
          <Avatar name={`${user.first_name} ${user.last_name}`} size={52} />
        </View>
        {visibleActions.length > 0 && (
          <View style={styles.heroActions}>
            {visibleActions.map((a) => (
              <Btn key={a.label} label={a.label}
                icon={<Icon name={a.icon.name} lib={a.icon.lib} size={16} color="#fff" />}
                onPress={() => goTo(a.page)} size="sm" variant="white" style={styles.heroBtn} />
            ))}
          </View>
        )}
      </View>

      {/* Stats */}
      {loading && <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading dashboard...</Text>}
      {!!error && <Text style={{ color: C.danger, marginBottom: 12 }}>{error}</Text>}
      {statsToRender.length > 0 && (
        <View style={styles.statsRow}>
          {statsToRender.map((s) => (
            <Card key={s.label} hover onPress={() => goTo(s.page)} style={[styles.statCard, { flexBasis: statBasis }]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Icon name={s.icon} lib={s.lib} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
            </Card>
          ))}
        </View>
      )}
      {!loading && !error && statsToRender.length === 0 && (
        <EmptyState
          icon="inbox"
          title="No dashboard data available"
          message={roleMetrics?.emptyMessage || 'Metrics will appear once backend data is available for your role.'}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero:         { borderRadius: 16, padding: 20, marginBottom: 20, overflow: 'hidden' },
  heroDecor1:   { position:'absolute', width:140, height:140, borderRadius:70, backgroundColor:'rgba(255,255,255,0.07)', top:-40, right:-20 },
  heroDecor2:   { position:'absolute', width:90,  height:90,  borderRadius:45, backgroundColor:'rgba(255,255,255,0.05)', bottom:-20, left:40 },
  heroTop:      { flexDirection:'row', alignItems:'flex-start', marginBottom:16 },
  heroGreeting: { color:'rgba(255,255,255,0.75)', fontSize:13, marginBottom:4 },
  heroName:     { color:'#fff', fontSize:20, fontWeight:'800', marginBottom:2 },
  heroSub:      { color:'rgba(255,255,255,0.75)', fontSize:12, marginBottom:2 },
  heroLicense:  { color:'rgba(255,255,255,0.55)', fontSize:11 },
  rolePill:     { marginTop:8, alignSelf:'flex-start', paddingHorizontal:10, paddingVertical:3, borderRadius:99 },
  heroActions:  { flexDirection:'row', flexWrap:'wrap', gap:8 },
  heroBtn:      { marginRight:0 },
  statsRow:     { flexDirection:'row', flexWrap:'wrap', gap:12, marginBottom:20 },
  statCard:     { padding:14, alignItems:'flex-start' },
  statIcon:     { width:40, height:40, borderRadius:10, alignItems:'center', justifyContent:'center', marginBottom:10 },
  statValue:    { fontSize:24, fontWeight:'800', marginBottom:2 },
  statLabel:    { fontSize:12 },
});
