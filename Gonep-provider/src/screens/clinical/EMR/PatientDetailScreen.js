// ─── screens/clinical/EMR/PatientDetailScreen.js ─────────────────────────────
// Full patient record view. Pushed on top of the EMR list.
// Role-gated: what each role sees is controlled via caps from usePatientDetail.
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Icon } from '../../../atoms/Icon';
import { usePatientDetail } from '../../../hooks/usePatientDetail';
import { ConsultationModal } from './molecules/ConsultationModal';
import {
  OverviewTab, ConsultationsTab, PrescriptionsTab,
  LabTab, AppointmentsTab, TimelineTab,
} from './molecules/PatientTabSections';
import { s } from './styles';

export function PatientDetailScreen({ patient, user, onBack }) {
  const { C } = useTheme();
  const pd = usePatientDetail(patient, user);

  const RENDER_TAB = {
    overview:      () => <OverviewTab patient={patient} />,
    consultations: () => (
      <ConsultationsTab
        consultations={pd.consultations}
        caps={pd.caps}
        loading={pd.loading}
        user={user}
        editWindowHrs={pd.editWindowHrs}
        onAddNote={() => pd.setConsultModal({ visible: true, existing: null })}
        onEditNote={con => pd.setConsultModal({ visible: true, existing: con })}
      />
    ),
    prescriptions: () => (
      <PrescriptionsTab
        prescriptions={pd.prescriptions}
        caps={pd.caps}
        user={user}
        onCancelRx={pd.handleCancelRx}
      />
    ),
    lab:          () => <LabTab          labs={pd.patientLabs} />,
    appointments: () => <AppointmentsTab appointments={pd.patientAppts} />,
    timeline:     () => <TimelineTab     timeline={pd.timeline} />,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>

      {/* ── Page header with back button ── */}
      <View style={[s.pageHeader, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Icon name="arrow-left" lib="feather" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[s.headerName, { color: C.text }]} numberOfLines={1}>{patient?.name}</Text>
          <Text style={[s.headerSub,  { color: C.textMuted }]}>
            Age {patient?.age} · {patient?.gender === 'F' ? 'Female' : 'Male'} · {patient?.blood_group}
          </Text>
        </View>
        <Text style={{ fontSize: 10, fontWeight: '600', color: C.textMuted }}>
          {patient?.last_visit ? `Last visit: ${patient.last_visit}` : ''}
        </Text>
      </View>

      {/* ── Tab bar ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { backgroundColor: C.navBg, borderBottomColor: C.border }]}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {pd.TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => pd.setActiveTab(tab.id)}
            style={[s.tab, pd.activeTab === tab.id && { borderBottomColor: C.primary }]}
          >
            <Text style={[s.tabLabel, {
              color:      pd.activeTab === tab.id ? C.primary : C.textMuted,
              fontWeight: pd.activeTab === tab.id ? '700' : '400',
            }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Tab content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {(RENDER_TAB[pd.activeTab] || RENDER_TAB.overview)()}
      </ScrollView>

      {/* ── Consultation modal ── */}
      <ConsultationModal
        visible={pd.consultModal.visible}
        existing={pd.consultModal.existing}
        patientName={patient?.name}
        user={user}
        onClose={() => pd.setConsultModal({ visible: false, existing: null })}
        onSave={pd.handleSaveConsultation}
      />
    </View>
  );
}
