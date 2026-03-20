import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useResponsive } from '../../theme/responsive';
import { Card } from '../../atoms/Card';
import { Badge } from '../../atoms/Badge';
import { Btn } from '../../atoms/Btn';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { ScreenContainer } from '../../organisms/ScreenContainer';
import { getAppointments, getPrescriptions, getLabResults } from '../../api';

export function DashboardScreen({ user, goTo }) {
  const { C } = useTheme();
  const { cardColumns } = useResponsive();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labs, setLabs] = useState([]);

  useEffect(() => {
    let m = true;
    Promise.all([getAppointments(), getPrescriptions(), getLabResults()]).then(([a, p, l]) => {
      if (m) { setAppointments(a || []); setPrescriptions(p || []); setLabs(l || []); }
    });
    return () => { m = false; };
  }, []);

  const criticalLabs   = labs.filter((l) => l.critical);
  const pendingRx      = prescriptions.filter((p) => p.status === 'pending_dispatch');
  const todayApts      = appointments.filter((a) => a.date === 'Today');
  const statBasis      = cardColumns >= 3 ? '32%' : cardColumns >= 2 ? '48%' : '100%';

  return (
    <ScreenContainer scroll>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: C.primary }]}>
        <View style={styles.heroDecor1} />
        <View style={styles.heroDecor2} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>Good morning 👋</Text>
            <Text style={styles.heroName}>{user.first_name} {user.last_name}</Text>
            <Text style={styles.heroSub}>{user.specialty} · {user.facility}</Text>
            <Text style={styles.heroLicense}>Lic: {user.license}</Text>
          </View>
          <Avatar name={`${user.first_name} ${user.last_name}`} size={52} />
        </View>
        <View style={styles.heroActions}>
          {[
            { icon: { lib:'feather',name:'calendar'    }, label:'Schedule',  page:'appointments' },
            { icon: { lib:'mc',     name:'pill'        }, label:'Pharmacy',  page:'pharmacy'     },
            { icon: { lib:'mc',     name:'file-document-outline' }, label:'EMR', page:'emr'      },
            { icon: { lib:'mc',     name:'flask-outline'}, label:'Lab',      page:'lab'          },
          ].map((a) => (
            <Btn key={a.label} label={a.label}
              icon={<Icon name={a.icon.name} lib={a.icon.lib} size={16} color="#fff" />}
              onPress={() => goTo(a.page)} size="sm" variant="white" style={styles.heroBtn} />
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon:'calendar',  lib:'feather', label:"Today's Appointments", value: todayApts.length,          color:C.primary,  bg:C.primaryLight,  page:'appointments' },
          { icon:'pill',      lib:'mc',      label:'Pending Rx Dispatch',  value: pendingRx.length,          color:C.warning,  bg:C.warningLight,  page:'pharmacy' },
          { icon:'flask-outline',lib:'mc',   label:'Critical Lab Flags',   value: criticalLabs.length,       color:C.danger,   bg:C.dangerLight,   page:'lab' },
          { icon:'users',     lib:'feather', label:'Total Patients',       value: 4,                         color:C.success,  bg:C.successLight,  page:'emr' },
        ].map((s) => (
          <Card key={s.label} hover onPress={() => goTo(s.page)} style={[styles.statCard, { flexBasis: statBasis }]}>
            <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
              <Icon name={s.icon} lib={s.lib} size={20} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: C.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {/* Critical alerts */}
      {criticalLabs.length > 0 && (
        <Card style={[styles.alertCard, { borderColor: `${C.danger}60`, backgroundColor: C.dangerLight }]}>
          <View style={styles.alertHeader}>
            <Icon name="alert-circle" lib="feather" size={18} color={C.danger} />
            <Text style={[styles.alertTitle, { color: C.danger }]}> {criticalLabs.length} Critical Lab Result{criticalLabs.length > 1 ? 's' : ''}</Text>
          </View>
          {criticalLabs.map((l) => (
            <Text key={l.id} style={[styles.alertItem, { color: C.danger }]}>• {l.patient} — {l.test}: {l.result}</Text>
          ))}
          <Btn label="Review Lab Results" onPress={() => goTo('lab')} variant="danger" size="sm" style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        </Card>
      )}

      {/* Today appointments */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>📅 Today's Schedule</Text>
        <Btn label="Full Schedule" onPress={() => goTo('appointments')} variant="ghost" size="sm" />
      </View>
      {todayApts.map((a) => (
        <Card key={a.id} hover style={styles.aptCard}>
          <View style={styles.aptRow}>
            <View style={[styles.aptAvatar, { backgroundColor: C.primaryLight }]}>
              <Icon name="account" lib="mc" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.aptPatient, { color: C.text }]}>{a.patient}</Text>
              <Text style={[styles.aptReason, { color: C.textMuted }]}>{a.reason}</Text>
              <Text style={[styles.aptTime, { color: C.primary }]}>⏰ {a.time} · {a.type}</Text>
            </View>
            <Badge label={a.status} color={a.status === 'confirmed' ? 'success' : 'warning'} />
          </View>
        </Card>
      ))}

      {/* Pending Rx */}
      {pendingRx.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>💊 Pending Rx Dispatch</Text>
            <Btn label="View All" onPress={() => goTo('pharmacy')} variant="ghost" size="sm" />
          </View>
          {pendingRx.slice(0, 2).map((rx) => (
            <Card key={rx.id} hover style={styles.rxCard}>
              <View style={styles.rxRow}>
                <View style={[styles.rxIcon, { backgroundColor: C.warningLight }]}>
                  <Icon name="pill" lib="mc" size={20} color={C.warning} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.rxDrug, { color: C.text }]}>{rx.drug}</Text>
                  <Text style={[styles.rxPatient, { color: C.textMuted }]}>{rx.patient} · {rx.instructions}</Text>
                </View>
                <Badge label="Pending" color="warning" />
              </View>
            </Card>
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: 20, marginBottom: 16, overflow: 'hidden', position: 'relative' },
  heroDecor1: { position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroDecor2: { position: 'absolute', right: 50, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroGreeting: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '500' },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  heroLicense: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heroBtn: { marginRight: 4, marginBottom: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { padding: 14, flex: 1, minWidth: 130 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  alertCard: { borderWidth: 2, borderRadius: 14, padding: 14, marginBottom: 14 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 15, fontWeight: '700' },
  alertItem: { fontSize: 13, marginBottom: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  aptCard: { marginBottom: 10, padding: 12 },
  aptRow: { flexDirection: 'row', alignItems: 'center' },
  aptAvatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aptPatient: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  aptReason: { fontSize: 12, marginBottom: 2 },
  aptTime: { fontSize: 12, fontWeight: '600' },
  rxCard: { marginBottom: 8, padding: 12 },
  rxRow: { flexDirection: 'row', alignItems: 'center' },
  rxIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rxDrug: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rxPatient: { fontSize: 12 },
});
