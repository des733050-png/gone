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
import { ROLE_LABELS } from '../../config/roles';
import { isOwnDataOnly, getAllowedPages } from '../../config/roles';

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
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labs, setLabs] = useState([]);

  const ownOnly = isOwnDataOnly(user?.role);

  useEffect(() => {
    let m = true;
    Promise.all([getAppointments(), getPrescriptions(), getLabResults()]).then(([a, p, l]) => {
      if (!m) return;
      if (ownOnly) {
        setAppointments((a || []).filter(x => x.doctor_id === user?.id));
        setPrescriptions((p || []).filter(x => x.doctor_id === user?.id));
        setLabs((l || []).filter(x => x.doctor_id === user?.id));
      } else {
        setAppointments(a || []);
        setPrescriptions(p || []);
        setLabs(l || []);
      }
    });
    return () => { m = false; };
  }, [user]);

  const criticalLabs = labs.filter((l) => l.critical);
  const pendingRx    = prescriptions.filter((p) => p.status === 'pending_dispatch');
  const todayApts    = appointments.filter((a) => a.date === 'Today');
  const unassigned   = appointments.filter((a) => a.status === 'unassigned');
  const statBasis    = cardColumns >= 3 ? '32%' : cardColumns >= 2 ? '48%' : '100%';
  const allowedPages = getAllowedPages(user?.role);

  // Stats visible per role
  const allStats = [
    { icon:'calendar',     lib:'feather', label:"Today's appointments", value: todayApts.length,    color:C.primary, bg:C.primaryLight, page:'appointments', roles:['hospital_admin','doctor','receptionist'] },
    { icon:'pill',         lib:'mc',      label:'Pending Rx dispatch',  value: pendingRx.length,    color:C.warning, bg:C.warningLight, page:'pharmacy',     roles:['hospital_admin','doctor','lab_manager'] },
    { icon:'flask-outline',lib:'mc',      label:'Critical lab flags',   value: criticalLabs.length, color:C.danger,  bg:C.dangerLight,  page:'lab',          roles:['hospital_admin','doctor','lab_manager'] },
    { icon:'alert-circle', lib:'feather', label:'Unassigned appts',     value: unassigned.length,   color:C.danger,  bg:C.dangerLight,  page:'appointments', roles:['hospital_admin','receptionist'] },
    { icon:'dollar-sign',  lib:'feather', label:'Pending invoices',     value: 2,                   color:C.warning, bg:C.warningLight, page:'billing',      roles:['hospital_admin','billing_manager'] },
    { icon:'users',        lib:'feather', label:'Total patients',       value: 4,                   color:C.success, bg:C.successLight, page:'emr',          roles:['hospital_admin','doctor'] },
  ];

  const visibleStats = allStats.filter(s => s.roles.includes(user?.role) && allowedPages.includes(s.page));
  const visibleActions = QUICK_ACTIONS.filter(a => a.roles.includes(user?.role) && allowedPages.includes(a.page));

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
            <Text style={styles.heroSub}>{user.specialty || ROLE_LABELS[user.role]} · {user.facility}</Text>
            {user.license && <Text style={styles.heroLicense}>Lic: {user.license}</Text>}
            <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{ROLE_LABELS[user.role]}</Text>
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
      {visibleStats.length > 0 && (
        <View style={styles.statsRow}>
          {visibleStats.map((s) => (
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

      {/* Critical alerts */}
      {criticalLabs.length > 0 && allowedPages.includes('lab') && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Critical lab flags</Text>
          {criticalLabs.map((l) => (
            <View key={l.id} style={[styles.alertRow, { backgroundColor: C.dangerLight, borderColor: C.danger }]}>
              <Icon name="alert-circle" lib="feather" size={16} color={C.danger} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.danger, fontWeight: '700', fontSize: 13 }}>{l.patient}</Text>
                <Text style={{ color: C.danger, fontSize: 12 }}>{l.test}: {l.result}</Text>
              </View>
              <Btn label="Review" size="sm" variant="ghost" onPress={() => goTo('lab')} />
            </View>
          ))}
        </View>
      )}

      {/* Recent appointments */}
      {todayApts.length > 0 && allowedPages.includes('appointments') && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>
            {ownOnly ? "Your appointments today" : "Today's appointments"}
          </Text>
          {todayApts.slice(0, 3).map((a) => (
            <Card key={a.id} hover style={styles.aptRow} onPress={() => goTo('appointments')}>
              <View style={[styles.aptAvatar, { backgroundColor: C.primaryLight }]}>
                <Icon name="account" lib="mc" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{a.patient}</Text>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>{a.time} · {a.type}</Text>
              </View>
              <Badge label={a.status} color={a.status === 'confirmed' ? 'success' : 'warning'} />
            </Card>
          ))}
        </View>
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
  sectionTitle: { fontSize:15, fontWeight:'700', marginBottom:10 },
  alertRow:     { flexDirection:'row', alignItems:'center', borderWidth:1, borderRadius:10, padding:12, marginBottom:8 },
  aptRow:       { flexDirection:'row', alignItems:'center', padding:12, marginBottom:8 },
  aptAvatar:    { width:36, height:36, borderRadius:10, alignItems:'center', justifyContent:'center' },
});
