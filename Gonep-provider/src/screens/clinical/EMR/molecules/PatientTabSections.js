// ─── screens/clinical/EMR/molecules/PatientTabSections.js ────────────────────
// All tab-section molecules for PatientDetailScreen.
// Each is a pure render component; logic lives in usePatientDetail hook.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Card }  from '../../../../atoms/Card';
import { Badge } from '../../../../atoms/Badge';
import { Btn }   from '../../../../atoms/Btn';
import { Icon }  from '../../../../atoms/Icon';
import { SectionHeader } from '../../../../molecules/SectionHeader';
import { EmptyState }    from '../../../../molecules/EmptyState';
import { useTheme } from '../../../../theme/ThemeContext';
import { isWithinWindow, TIMELINE_TYPE_META, TIMELINE_TYPE_LABEL } from '../../../../constants/emr';

// ─── Overview tab ─────────────────────────────────────────────────────────────
export function OverviewTab({ patient }) {
  const { C } = useTheme();

  const TagList = ({ items, colorKey, emptyMsg }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
      {(items || []).map(item => (
        <View key={item} style={[s.tag, { backgroundColor: C[colorKey] }]}>
          <Text style={{ color: C[colorKey.replace('Light', '')], fontSize: 12, fontWeight: '600' }}>{item}</Text>
        </View>
      ))}
      {(items || []).length === 0 && (
        <Text style={{ color: C.textMuted, fontSize: 12 }}>{emptyMsg}</Text>
      )}
    </View>
  );

  const INFO_ROWS = [
    { lbl: 'Full name',   val: patient?.name },
    { lbl: 'Age',         val: `${patient?.age} years` },
    { lbl: 'Gender',      val: patient?.gender === 'F' ? 'Female' : 'Male' },
    { lbl: 'Blood group', val: patient?.blood_group },
  ];

  return (
    <View>
      <Card style={s.infoCard}>
        <SectionHeader title="Patient information" icon="user" />
        {INFO_ROWS.map(row => (
          <View key={row.lbl} style={[s.infoRow, { borderBottomColor: C.divider }]}>
            <Text style={[s.infoLbl, { color: C.textMuted }]}>{row.lbl}</Text>
            <Text style={[s.infoVal, { color: C.text }]}>{row.val}</Text>
          </View>
        ))}
      </Card>
      <Card style={s.infoCard}>
        <SectionHeader title="Conditions" icon="activity" />
        <TagList items={patient?.conditions} colorKey="primaryLight" emptyMsg="None recorded" />
      </Card>
      <Card style={s.infoCard}>
        <SectionHeader title="Allergies" icon="alert-triangle" />
        <TagList items={patient?.allergies} colorKey="dangerLight" emptyMsg="No known allergies" />
      </Card>
      <Card style={s.infoCard}>
        <SectionHeader title="Current medications" icon="package" />
        <TagList items={patient?.medications} colorKey="successLight" emptyMsg="None recorded" />
      </Card>
    </View>
  );
}

// ─── Consultations tab ────────────────────────────────────────────────────────
export function ConsultationsTab({ consultations, caps, loading, user, editWindowHrs, onAddNote, onEditNote }) {
  const { C } = useTheme();

  if (loading) return <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />;

  return (
    <View>
      {caps.canAddNote && (
        <Btn label="+ Add consultation note" onPress={onAddNote} style={{ marginBottom: 14 }} full />
      )}
      {!caps.canSeeSoap && (
        <View style={[s.restrictBanner, { backgroundColor: C.warningLight, borderColor: C.warning }]}>
          <Icon name="lock" lib="feather" size={13} color={C.warning} style={{ marginRight: 6 }} />
          <Text style={{ color: C.warning, fontSize: 12, flex: 1 }}>
            Clinical SOAP notes are only visible to doctors and hospital admin.
          </Text>
        </View>
      )}
      {consultations.length === 0
        ? <EmptyState icon="file-text" message="No consultation notes yet" />
        : consultations.map(con => {
          const canEdit = caps.canAddNote && con.doctor_id === user?.id && isWithinWindow(con.created_at, editWindowHrs);
          return (
            <Card key={con.id} style={s.consultCard}>
              <View style={s.consultHeader}>
                <View>
                  <Text style={[s.consultDate, { color: C.text }]}>{con.date} · {con.type}</Text>
                  <Text style={[s.consultDoc,  { color: C.textMuted }]}>by {con.doctor_name}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {canEdit && (
                    <TouchableOpacity onPress={() => onEditNote(con)}
                      style={[s.editBtn, { borderColor: C.border }]}>
                      <Icon name="edit-2" lib="feather" size={13} color={C.textSec} />
                    </TouchableOpacity>
                  )}
                  {con.uploaded_files?.length > 0 && (
                    <View style={[s.filesBadge, { backgroundColor: C.primaryLight }]}>
                      <Icon name="paperclip" lib="feather" size={11} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 10, fontWeight: '600', marginLeft: 3 }}>
                        {con.uploaded_files.length}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {caps.canSeeSoap ? (
                <View style={{ marginTop: 10 }}>
                  {[
                    { key: 'S', label: 'Subjective',  val: con.subjective  },
                    { key: 'O', label: 'Objective',   val: con.objective   },
                    { key: 'A', label: 'Assessment',  val: con.assessment  },
                    { key: 'P', label: 'Plan',        val: con.plan        },
                  ].filter(f => f.val).map(f => (
                    <View key={f.key} style={[s.soapRow, { borderLeftColor: C.primaryMid }]}>
                      <View style={[s.soapDot, { backgroundColor: C.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{f.key}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.soapLabel, { color: C.textMuted }]}>{f.label}</Text>
                        <Text style={[s.soapText,  { color: C.text }]}>{f.val}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                  {con.type} consultation — {con.date}
                </Text>
              )}
            </Card>
          );
        })
      }
    </View>
  );
}

// ─── Prescriptions tab ────────────────────────────────────────────────────────
export function PrescriptionsTab({ prescriptions, caps, user, onCancelRx }) {
  const { C } = useTheme();
  if (prescriptions.length === 0) return <EmptyState icon="package" message="No prescriptions" />;

  return (
    <View>
      {prescriptions.map(rx => {
        const isPending   = rx.status === 'pending_dispatch';
        const isCancelled = rx.status === 'cancelled';
        const isOwnRx     = rx.doctor_id === user?.id;
        const isRecent    = isWithinWindow(
          rx.date === 'Yesterday' ? new Date(Date.now() - 23 * 3600000).toISOString()
            : rx.date === 'Today' ? new Date().toISOString()
            : new Date(Date.now() - 25 * 3600000).toISOString(),
          48
        );
        const canCancel = caps.canEditRx && isOwnRx && isPending;
        const canEdit   = caps.canEditRx && isOwnRx && isRecent && !isCancelled;
        const statusColor = isCancelled ? 'danger' : isPending ? 'warning' : 'success';
        const statusLabel = isCancelled ? 'Cancelled' : isPending ? 'Pending' : 'Dispatched';

        return (
          <Card key={rx.id} style={[s.rxCard, isCancelled && { opacity: 0.55 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={[s.rxIcon, { backgroundColor: C.primaryLight }]}>
                <Icon name="pill" lib="mc" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.rxDrug, { color: C.text }]}>{rx.drug}</Text>
                <Text style={[s.rxSub,  { color: C.textSec }]}>{rx.qty} units · {rx.instructions}</Text>
                <Text style={[s.rxDate, { color: C.textMuted }]}>{rx.date}</Text>
              </View>
              <Badge label={statusLabel} color={statusColor} />
            </View>
            {(canCancel || canEdit) && !isCancelled && (
              <View style={[s.rxActions, { borderTopColor: C.divider }]}>
                {canEdit && (
                  <Btn label="Edit" size="sm" variant="ghost"
                    icon={<Icon name="edit-2" lib="feather" size={12} color={C.textSec} />}
                    style={{ marginRight: 8 }} />
                )}
                {canCancel && (
                  <Btn label="Cancel Rx" size="sm" variant="danger" onPress={() => onCancelRx(rx.id)} />
                )}
                {isOwnRx && !isRecent && !isCancelled && (
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>Edit window expired (48 hr)</Text>
                )}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

// ─── Lab tab ──────────────────────────────────────────────────────────────────
export function LabTab({ labs }) {
  const { C } = useTheme();
  if (labs.length === 0) return <EmptyState icon="flask-outline" iconLib="mc" message="No lab results" />;
  return (
    <View>
      {labs.map(l => (
        <Card key={l.id} style={[s.labCard, l.critical && { borderLeftWidth: 3, borderLeftColor: C.danger }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[s.labIcon, { backgroundColor: l.critical ? C.dangerLight : C.primaryLight }]}>
              <Icon name="flask-outline" lib="mc" size={18} color={l.critical ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.rxDrug, { color: C.text }]}>{l.test}</Text>
              <Text style={[s.rxSub,  { color: l.critical ? C.danger : C.textSec }]}>
                {l.result} · Normal: {l.range}
              </Text>
              <Text style={[s.rxDate, { color: C.textMuted }]}>{l.date}</Text>
            </View>
            <Badge label={l.status}
              color={l.status === 'critical' ? 'danger' : l.status === 'high' ? 'warning' : 'success'} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ─── Appointments tab ─────────────────────────────────────────────────────────
export function AppointmentsTab({ appointments }) {
  const { C } = useTheme();
  if (appointments.length === 0) return <EmptyState icon="calendar" message="No appointments" />;
  return (
    <View>
      {appointments.map(a => (
        <Card key={a.id} style={s.labCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[s.labIcon, { backgroundColor: C.primaryLight }]}>
              <Icon name="calendar" lib="feather" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.rxDrug, { color: C.text }]}>{a.reason}</Text>
              <Text style={[s.rxSub,  { color: C.textSec }]}>{a.type} · {a.date} {a.time}</Text>
            </View>
            <Badge label={a.status}
              color={a.status === 'confirmed' ? 'success' : a.status === 'unassigned' ? 'danger' : 'warning'} />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ─── Timeline tab ─────────────────────────────────────────────────────────────
export function TimelineTab({ timeline }) {
  const { C } = useTheme();
  return (
    <View>
      {timeline.map((item, i) => {
        const ti = TIMELINE_TYPE_META[item._type] || TIMELINE_TYPE_META.consultation;
        const iconColor = ti.colorKey === 'warning' ? C.warning : ti.colorKey === 'success' ? C.success : C.primary;
        const iconBg    = ti.colorKey === 'warning' ? C.warningLight : ti.colorKey === 'success' ? C.successLight : C.primaryLight;
        return (
          <View key={item.id + i} style={s.timelineRow}>
            <View style={s.timelineLine}>
              <View style={[s.timelineDot, { backgroundColor: iconBg, borderColor: iconColor }]}>
                <Icon name={ti.name} lib={ti.lib} size={13} color={iconColor} />
              </View>
              {i < timeline.length - 1 && (
                <View style={[s.timelineConnector, { backgroundColor: C.border }]} />
              )}
            </View>
            <View style={[s.timelineCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: iconColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {TIMELINE_TYPE_LABEL[item._type]}
                </Text>
                <Text style={{ fontSize: 10, color: C.textMuted }}>{item._date}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>
                {item._type === 'consultation' ? `${item.type} — ${item.assessment?.split('.')[0]}` :
                 item._type === 'lab'          ? `${item.test}: ${item.result}` :
                 item._type === 'rx'           ? `${item.drug} (${item.instructions})` :
                 `${item.reason} · ${item.type}`}
              </Text>
              {item._type === 'consultation' && (
                <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>by {item.doctor_name}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Overview
  infoCard:   { marginBottom: 10, padding: 14 },
  infoRow:    { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1 },
  infoLbl:    { fontSize: 12, width: 110, flexShrink: 0 },
  infoVal:    { fontSize: 13, fontWeight: '500', flex: 1 },
  tag:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  // Consultations
  restrictBanner: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  consultCard:    { marginBottom: 10, padding: 14 },
  consultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  consultDate:    { fontSize: 13, fontWeight: '700' },
  consultDoc:     { fontSize: 11, marginTop: 2 },
  editBtn:        { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filesBadge:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  soapRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingLeft: 2 },
  soapDot:        { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  soapLabel:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  soapText:       { fontSize: 13, lineHeight: 19 },
  // Rx
  rxCard:    { marginBottom: 8, padding: 12 },
  rxIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rxDrug:    { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rxSub:     { fontSize: 11, marginBottom: 1 },
  rxDate:    { fontSize: 10 },
  rxActions: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  // Lab / Appt
  labCard:   { marginBottom: 8, padding: 12 },
  labIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Timeline
  timelineRow:       { flexDirection: 'row', marginBottom: 12 },
  timelineLine:      { width: 36, alignItems: 'center' },
  timelineDot:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  timelineConnector: { width: 2, flex: 1, marginTop: 4 },
  timelineCard:      { flex: 1, marginLeft: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
});
