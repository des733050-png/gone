import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive } from '../../theme/responsive';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getCurrentRider, getRequests, getEarnings, updateRiderStatus } from '../../api';

export function DashboardScreen({ user, goTo }) {
  const { C } = useTheme();
  const { cardColumns } = useResponsive();
  const [isOnline, setIsOnline] = useState(true);
  const [requests, setRequests] = useState([]);
  const [earnings, setEarnings] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([getRequests(), getEarnings()]).then(([r, e]) => {
      if (mounted) { setRequests(r || []); setEarnings(e); }
    });
    return () => { mounted = false; };
  }, []);

  const toggleOnline = async (val) => {
    setIsOnline(val);
    await updateRiderStatus(val ? 'active' : 'offline');
  };

  const statBasis = cardColumns >= 2 ? '48%' : '100%';

  return (
    <ScreenContainer scroll>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: isOnline ? C.warning : C.textMuted }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Good morning 👋</Text>
            <Text style={styles.heroName}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.heroSub}>⭐ {user.rating} · {user.total_trips} trips · {user.zone}</Text>
          </View>
          <View style={styles.onlineToggle}>
            <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              value={isOnline}
              onValueChange={toggleOnline}
              trackColor={{ false: 'rgba(255,255,255,0.3)', true: 'rgba(255,255,255,0.5)' }}
              thumbColor="#fff"
            />
          </View>
        </View>
        <View style={styles.heroActions}>
          {[
            { icon: { lib: 'mc', name: 'package-variant' }, label: 'Requests', page: 'requests' },
            { icon: { lib: 'mc', name: 'truck-fast' }, label: 'Active', page: 'activeDelivery' },
            { icon: { lib: 'feather', name: 'dollar-sign' }, label: 'Earnings', page: 'earnings' },
            { icon: { lib: 'feather', name: 'list' }, label: 'History', page: 'tripHistory' },
          ].map((a) => (
            <Btn key={a.label} label={a.label}
              icon={<Icon name={a.icon.name} lib={a.icon.lib} size={16} color="#fff" />}
              onPress={() => goTo(a.page)} size="sm" variant="white" style={styles.heroBtn} />
          ))}
        </View>
      </View>

      {/* Earning stats */}
      {earnings && (
        <View style={styles.statsRow}>
          {[
            { label: "Today's Earnings", value: `KSh ${earnings.today.toLocaleString()}`, icon: 'dollar-sign', lib: 'feather', color: C.success, bg: C.successLight },
            { label: 'This Week', value: `KSh ${earnings.this_week.toLocaleString()}`, icon: 'trending-up', lib: 'feather', color: C.primary, bg: C.primaryLight },
            { label: 'Pending Payout', value: `KSh ${earnings.pending_payout.toLocaleString()}`, icon: 'clock', lib: 'feather', color: C.warning, bg: C.warningLight },
            { label: 'Total Trips', value: `${user.total_trips}`, icon: 'map', lib: 'feather', color: C.purple, bg: C.purpleLight },
          ].map((s) => (
            <Card key={s.label} hover style={[styles.statCard, { flexBasis: statBasis }]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <Icon name={s.icon} lib={s.lib} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
            </Card>
          ))}
        </View>
      )}

      {/* Incoming Requests */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>📦 Incoming Requests</Text>
        <Btn label="View All" onPress={() => goTo('requests')} variant="ghost" size="sm" />
      </View>

      {requests.slice(0, 2).map((req) => (
        <Card key={req.id} hover style={styles.requestCard}>
          <View style={styles.requestTop}>
            <View style={[styles.requestIcon, { backgroundColor: C.warningLight }]}>
              <Icon name="package-variant" lib="mc" size={22} color={C.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.reqPatient, { color: C.text }]}>{req.patient}</Text>
              <Text style={[styles.reqAddress, { color: C.textMuted }]}>{req.address}</Text>
              <Text style={[styles.reqItems, { color: C.textSec }]}>{req.items.join(', ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.reqPayout, { color: C.success }]}>{req.payout}</Text>
              <Text style={[styles.reqEta, { color: C.textMuted }]}>{req.distance} · {req.eta}</Text>
            </View>
          </View>
          <View style={styles.requestActions}>
            <Btn label="Accept" onPress={() => goTo('activeDelivery')} size="sm" style={{ marginRight: 8 }} />
            <Btn label="Decline" variant="danger" size="sm" />
          </View>
        </Card>
      ))}

      {requests.length === 0 && (
        <Card style={styles.emptyCard}>
          <Icon name="inbox" lib="feather" size={36} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>No pending requests right now</Text>
        </Card>
      )}

      {/* Daily earnings chart preview */}
      {earnings && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>📊 This Week</Text>
            <Btn label="Details" onPress={() => goTo('earnings')} variant="ghost" size="sm" />
          </View>
          <Card>
            <View style={styles.barChart}>
              {earnings.daily.map((d) => {
                const max = Math.max(...earnings.daily.map((x) => x.amount), 1);
                const pct = (d.amount / max) * 100;
                return (
                  <View key={d.day} style={styles.barItem}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: `${pct || 4}%`, backgroundColor: pct > 0 ? C.warning : C.border }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: C.textMuted }]}>{d.day}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: 20, marginBottom: 16, overflow: 'hidden', position: 'relative' },
  heroDecor1: { position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2: { position: 'absolute', right: 50, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroGreeting: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '500' },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  onlineToggle: { alignItems: 'center' },
  onlineLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroBtn: { marginRight: 4, marginBottom: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { padding: 14, flex: 1, minWidth: 140 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  requestCard: { marginBottom: 10, padding: 14 },
  requestTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  requestIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reqPatient: { fontWeight: '700', fontSize: 14, marginBottom: 2 },
  reqAddress: { fontSize: 12, marginBottom: 2 },
  reqItems: { fontSize: 12 },
  reqPayout: { fontWeight: '800', fontSize: 16 },
  reqEta: { fontSize: 11, marginTop: 2 },
  requestActions: { flexDirection: 'row' },
  emptyCard: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { marginTop: 10, fontSize: 14 },
  barChart: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 6 },
  barItem: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 4, fontWeight: '600' },
});
