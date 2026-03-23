// ─── PatientDetailScreen.js ───────────────────────────────────────────────────
// Full patient record view. Opens as a new screen pushed on top of the EMR list.
// Role-gated: what each role sees is controlled via canSeeSoap / canSeeBilling.
// Doctors can add notes and edit/cancel their own recent Rx.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { Card } from '../../../atoms/Card';
import { Badge } from '../../../atoms/Badge';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import {
  getPatientConsultations, addConsultation,
  updateConsultation, cancelPrescription, appendLog,
  getClinicalSettings,
} from '../../../api';
import { MOCK_PRESCRIPTIONS, MOCK_LAB, MOCK_APPOINTMENTS } from '../../../mock/data';

// ─── Role capability helpers ──────────────────────────────────────────────────
function roleCapabilities(role) {
  return {
    canSeeSoap:    role === 'hospital_admin' || role === 'doctor',
    canAddNote:    role === 'doctor',
    canEditRx:     role === 'doctor',
    canSeeLab:     role !== 'billing_manager',
    canSeeBilling: role === 'hospital_admin' || role === 'billing_manager',
    canSeeAppts:   role !== 'billing_manager',
  };
}

// ─── 48-hour edit window ──────────────────────────────────────────────────────
// The actual window is loaded from clinical settings (admin-configured).
// This helper is called with the dynamic value from state.
function isWithinWindow(isoString, windowHours) {
  const created = new Date(isoString);
  return (Date.now() - created.getTime()) < windowHours * 60 * 60 * 1000;
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, icon, count, C }) {
  return (
    <View style={[sh.sectionHeader, { borderBottomColor: C.divider }]}>
      <Icon name={icon} lib="feather" size={15} color={C.primary} style={{ marginRight: 8 }} />
      <Text style={[sh.sectionTitle, { color: C.text }]}>{title}</Text>
      {count != null && (
        <View style={[sh.countPill, { backgroundColor: C.primaryLight }]}>
          <Text style={{ color: C.primary, fontSize: 10, fontWeight: '700' }}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit consultation note modal ───────────────────────────────────────
function ConsultationModal({ visible, existing, patientName, user, onClose, onSave }) {
  const { C } = useTheme();
  const isEdit = !!existing;
  const [subj, setSubj] = useState(existing?.subjective  || '');
  const [obj,  setObj]  = useState(existing?.objective   || '');
  const [ass,  setAss]  = useState(existing?.assessment  || '');
  const [plan, setPlan] = useState(existing?.plan        || '');
  const [type, setType] = useState(existing?.type        || 'In Facility');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const TYPES = ['In Facility', 'Home Visit', 'Online', 'Chat'];

  const handleSave = async () => {
    if (!subj.trim() || !ass.trim()) { setErr('Subjective and Assessment are required.'); return; }
    setSaving(true);
    setErr('');
    try {
      const payload = { subjective: subj.trim(), objective: obj.trim(), assessment: ass.trim(), plan: plan.trim(), type };
      if (isEdit) {
        await updateConsultation(existing.id, payload);
      } else {
        await addConsultation({
          ...payload,
          patient_name: patientName,
          doctor_id:    user.id,
          doctor_name:  `${user.first_name} ${user.last_name}`,
          date:         'Today',
          appointment_id: null,
          uploaded_files: [],
        });
      }
      appendLog({
        staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
        module: 'EMR', action: isEdit ? 'Consultation note edited' : 'Consultation note added',
        detail: `${patientName}`, type: 'emr',
      });
      onSave();
      onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sh.backdrop}>
        <ScrollView>
          <View style={{ minHeight: 600, justifyContent: 'flex-end' }}>
            <View style={[sh.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={sh.handle} />
              <Text style={[sh.sheetTitle, { color: C.text }]}>
                {isEdit ? 'Edit consultation note' : 'Add consultation note'}
              </Text>
              <Text style={[sh.sheetSub, { color: C.textMuted }]}>{patientName}</Text>

              {/* Type selector */}
              <Text style={[sh.fieldLbl, { color: C.textMuted }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {TYPES.map(t => (
                  <TouchableOpacity key={t} onPress={() => setType(t)}
                    style={[sh.typePill, { backgroundColor: type === t ? C.primary : C.surface, borderColor: type === t ? C.primary : C.border, marginRight: 6 }]}>
                    <Text style={{ color: type === t ? '#fff' : C.textSec, fontSize: 11, fontWeight: '600' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* SOAP fields */}
              {[
                { key: 'S', label: 'Subjective *', val: subj, set: setSubj, ph: 'Chief complaint, history, patient-reported symptoms…', required: true },
                { key: 'O', label: 'Objective',    val: obj,  set: setObj,  ph: 'Vital signs, examination findings, test results…',   required: false },
                { key: 'A', label: 'Assessment *', val: ass,  set: setAss,  ph: 'Diagnosis, differential diagnoses…',                 required: true },
                { key: 'P', label: 'Plan',         val: plan, set: setPlan, ph: 'Treatment, medications, follow-up, referrals…',       required: false },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 }}>
                    <View style={[sh.soapDot, { backgroundColor: C.primary }]}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{f.key}</Text>
                    </View>
                    <Text style={[sh.fieldLbl, { color: C.textMuted, marginBottom: 0 }]}>{f.label}</Text>
                  </View>
                  <TextInput
                    value={f.val}
                    onChangeText={v => { f.set(v); if (err) setErr(''); }}
                    placeholder={f.ph}
                    multiline
                    numberOfLines={3}
                    style={[sh.textarea, { backgroundColor: C.inputBg, borderColor: C.border, color: C.text }]}
                    placeholderTextColor={C.textMuted}
                  />
                </View>
              ))}

              {err ? <Text style={[sh.errTxt, { color: C.danger }]}>{err}</Text> : null}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add note'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── PatientDetailScreen ──────────────────────────────────────────────────────
export function PatientDetailScreen({ patient, user, onBack }) {
  const { C } = useTheme();
  const caps  = roleCapabilities(user?.role);
  const isOwnDoctor = user?.id === patient?.doctor_id;
  const isDoctor    = user?.role === 'doctor';
  const isAdmin     = user?.role === 'hospital_admin';

  const [consultations,  setConsultations]  = useState([]);
  const [editWindowHrs,  setEditWindowHrs]  = useState(24); // loaded from clinical settings
  const [loading,       setLoading]         = useState(true);
  const [activeTab,     setActiveTab]       = useState('overview');
  const [consultModal,  setConsultModal]    = useState({ visible: false, existing: null });
  const [prescriptions, setPrescriptions]   = useState([]);

  // Filter data for this patient
  const patientLabs  = MOCK_LAB.filter(l => l.patient === patient?.name);
  const patientAppts = MOCK_APPOINTMENTS.filter(a => a.patient === patient?.name);
  const patientBilling = []; // Would come from billing API in real app

  // Load admin-configured edit window
  useEffect(() => {
    getClinicalSettings().then(s => { if (s?.edit_window_hours) setEditWindowHrs(s.edit_window_hours); }).catch(() => {});
  }, []);

  const loadConsultations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPatientConsultations(patient?.id);
      setConsultations(data || []);
    } finally {
      setLoading(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadConsultations();
    // Load prescriptions for this patient
    const { MOCK_PRESCRIPTIONS: rxs } = require('../../../mock/data');
    setPrescriptions(rxs.filter(r => r.patient === patient?.name));
  }, [loadConsultations, patient]);

  const handleCancelRx = async (rxId) => {
    await cancelPrescription(rxId);
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Prescription', action: 'Rx cancelled',
      detail: `${prescriptions.find(r => r.id === rxId)?.drug} for ${patient?.name}`, type: 'rx',
    });
    setPrescriptions(prev => prev.map(r => r.id === rxId ? { ...r, status: 'cancelled' } : r));
  };

  // Build timeline — merge consultations, lab, appts, Rx in date order
  const timeline = [
    ...consultations.map(c => ({ ...c, _type: 'consultation', _date: c.date })),
    ...patientLabs.map(l => ({ ...l,  _type: 'lab',          _date: l.date })),
    ...prescriptions.map(r => ({ ...r, _type: 'rx',          _date: r.date })),
    ...patientAppts.map(a => ({ ...a, _type: 'appointment',  _date: a.date })),
  ]; // In production, sort by real ISO dates

  const TABS = [
    { id: 'overview',       label: 'Overview'    },
    { id: 'consultations',  label: 'Notes'       },
    { id: 'prescriptions',  label: 'Rx'          },
    caps.canSeeLab && { id: 'lab',   label: 'Lab' },
    caps.canSeeAppts && { id: 'appointments', label: 'Visits' },
    { id: 'timeline', label: 'Timeline' },
  ].filter(Boolean);

  // ── Render sections ────────────────────────────────────────────────────────

  const renderOverview = () => (
    <View>
      {/* Basic info */}
      <Card style={sh.infoCard}>
        <SectionHeader title="Patient information" icon="user" C={C} />
        {[
          { lbl: 'Full name',    val: patient?.name },
          { lbl: 'Age',          val: `${patient?.age} years` },
          { lbl: 'Gender',       val: patient?.gender === 'F' ? 'Female' : 'Male' },
          { lbl: 'Blood group',  val: patient?.blood_group },
        ].map(row => (
          <View key={row.lbl} style={[sh.infoRow, { borderBottomColor: C.divider }]}>
            <Text style={[sh.infoLbl, { color: C.textMuted }]}>{row.lbl}</Text>
            <Text style={[sh.infoVal, { color: C.text }]}>{row.val}</Text>
          </View>
        ))}
      </Card>

      {/* Conditions */}
      <Card style={sh.infoCard}>
        <SectionHeader title="Conditions" icon="activity" C={C} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
          {(patient?.conditions || []).map(c => (
            <View key={c} style={[sh.condTag, { backgroundColor: C.primaryLight }]}>
              <Text style={{ color: C.primary, fontSize: 12, fontWeight: '600' }}>{c}</Text>
            </View>
          ))}
          {(patient?.conditions || []).length === 0 && (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>None recorded</Text>
          )}
        </View>
      </Card>

      {/* Allergies */}
      <Card style={sh.infoCard}>
        <SectionHeader title="Allergies" icon="alert-triangle" C={C} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
          {(patient?.allergies || []).map(a => (
            <View key={a} style={[sh.condTag, { backgroundColor: C.dangerLight }]}>
              <Text style={{ color: C.danger, fontSize: 12, fontWeight: '600' }}>{a}</Text>
            </View>
          ))}
          {(patient?.allergies || []).length === 0 && (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>No known allergies</Text>
          )}
        </View>
      </Card>

      {/* Current medications */}
      <Card style={sh.infoCard}>
        <SectionHeader title="Current medications" icon="package" C={C} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 10 }}>
          {(patient?.medications || []).map(m => (
            <View key={m} style={[sh.condTag, { backgroundColor: C.successLight }]}>
              <Text style={{ color: C.success, fontSize: 12, fontWeight: '600' }}>{m}</Text>
            </View>
          ))}
          {(patient?.medications || []).length === 0 && (
            <Text style={{ color: C.textMuted, fontSize: 12 }}>None recorded</Text>
          )}
        </View>
      </Card>
    </View>
  );

  const renderConsultations = () => (
    <View>
      {caps.canAddNote && (
        <Btn
          label="+ Add consultation note"
          onPress={() => setConsultModal({ visible: true, existing: null })}
          style={{ marginBottom: 14 }}
          full
        />
      )}
      {!caps.canSeeSoap && (
        <View style={[sh.restrictBanner, { backgroundColor: C.warningLight, borderColor: C.warning }]}>
          <Icon name="lock" lib="feather" size={13} color={C.warning} style={{ marginRight: 6 }} />
          <Text style={{ color: C.warning, fontSize: 12, flex: 1 }}>
            Clinical SOAP notes are only visible to doctors and hospital admin.
          </Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 30 }} />
      ) : consultations.length === 0 ? (
        <View style={sh.empty}>
          <Icon name="file-text" lib="feather" size={32} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No consultation notes yet</Text>
        </View>
      ) : (
        consultations.map(con => {
          const canEdit = caps.canAddNote && con.doctor_id === user?.id && isWithinWindow(con.created_at, editWindowHrs);
          return (
            <Card key={con.id} style={sh.consultCard}>
              <View style={sh.consultHeader}>
                <View>
                  <Text style={[sh.consultDate, { color: C.text }]}>{con.date} · {con.type}</Text>
                  <Text style={[sh.consultDoc, { color: C.textMuted }]}>by {con.doctor_name}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {canEdit && (
                    <TouchableOpacity
                      onPress={() => setConsultModal({ visible: true, existing: con })}
                      style={[sh.editBtn, { borderColor: C.border }]}>
                      <Icon name="edit-2" lib="feather" size={13} color={C.textSec} />
                    </TouchableOpacity>
                  )}
                  {con.uploaded_files?.length > 0 && (
                    <View style={[sh.filesBadge, { backgroundColor: C.primaryLight }]}>
                      <Icon name="paperclip" lib="feather" size={11} color={C.primary} />
                      <Text style={{ color: C.primary, fontSize: 10, fontWeight: '600', marginLeft: 3 }}>{con.uploaded_files.length}</Text>
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
                  ].map(f => f.val ? (
                    <View key={f.key} style={[sh.soapRow, { borderLeftColor: C.primaryMid }]}>
                      <View style={[sh.soapDot, { backgroundColor: C.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{f.key}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[sh.soapLabel, { color: C.textMuted }]}>{f.label}</Text>
                        <Text style={[sh.soapText, { color: C.text }]}>{f.val}</Text>
                      </View>
                    </View>
                  ) : null)}
                  {con.uploaded_files?.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[sh.soapLabel, { color: C.textMuted }]}>Attached files</Text>
                      {con.uploaded_files.map((f, i) => (
                        <View key={i} style={[sh.fileRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                          <Icon name={f.type === 'image' ? 'image' : 'file-text'} lib="feather" size={13} color={C.primary} />
                          <Text style={{ color: C.primary, fontSize: 12, marginLeft: 6 }}>{f.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' }}>
                  {con.type} consultation — {con.date}
                </Text>
              )}
            </Card>
          );
        })
      )}
    </View>
  );

  const renderPrescriptions = () => (
    <View>
      {prescriptions.length === 0 ? (
        <View style={sh.empty}>
          <Icon name="package" lib="feather" size={32} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No prescriptions</Text>
        </View>
      ) : prescriptions.map(rx => {
        const isPending    = rx.status === 'pending_dispatch';
        const isCancelled  = rx.status === 'cancelled';
        const isOwnRx      = rx.doctor_id === user?.id;
        const isRecent     = isWithinWindow(  // Rx edit window: always 48 hrs
          rx.date === 'Yesterday'
            ? new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
            : rx.date === 'Today'
            ? new Date().toISOString()
            : new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
          48 // Rx: fixed 48-hr window regardless of clinical settings
        );
        const canCancel = caps.canEditRx && isOwnRx && isPending;
        const canEdit   = caps.canEditRx && isOwnRx && isRecent && !isCancelled;

        const statusColor = isCancelled ? 'danger' : isPending ? 'warning' : 'success';
        const statusLabel = isCancelled ? 'Cancelled' : isPending ? 'Pending' : 'Dispatched';

        return (
          <Card key={rx.id} style={[sh.rxCard, isCancelled && { opacity: 0.55 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={[sh.rxIcon, { backgroundColor: C.primaryLight }]}>
                <Icon name="pill" lib="mc" size={18} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[sh.rxDrug, { color: C.text }]}>{rx.drug}</Text>
                <Text style={[sh.rxSub, { color: C.textSec }]}>{rx.qty} units · {rx.instructions}</Text>
                <Text style={[sh.rxDate, { color: C.textMuted }]}>{rx.date}</Text>
              </View>
              <Badge label={statusLabel} color={statusColor} />
            </View>
            {(canCancel || canEdit) && !isCancelled && (
              <View style={[sh.rxActions, { borderTopColor: C.divider }]}>
                {canEdit && (
                  <Btn label="Edit" size="sm" variant="ghost"
                    icon={<Icon name="edit-2" lib="feather" size={12} color={C.textSec} />}
                    style={{ marginRight: 8 }} />
                )}
                {canCancel && (
                  <Btn label="Cancel Rx" size="sm" variant="danger"
                    onPress={() => handleCancelRx(rx.id)} />
                )}
                {isOwnRx && !isRecent && !isCancelled && (
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>
                    Edit window expired (48 hr)
                  </Text>
                )}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );

  const renderLab = () => (
    <View>
      {patientLabs.length === 0 ? (
        <View style={sh.empty}>
          <Icon name="flask-outline" lib="mc" size={32} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No lab results</Text>
        </View>
      ) : patientLabs.map(l => (
        <Card key={l.id} style={[sh.labCard, l.critical && { borderLeftWidth: 3, borderLeftColor: C.danger }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[sh.labIcon, { backgroundColor: l.critical ? C.dangerLight : C.primaryLight }]}>
              <Icon name="flask-outline" lib="mc" size={18} color={l.critical ? C.danger : C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[sh.rxDrug, { color: C.text }]}>{l.test}</Text>
              <Text style={[sh.rxSub, { color: l.critical ? C.danger : C.textSec }]}>
                {l.result} · Normal: {l.range}
              </Text>
              <Text style={[sh.rxDate, { color: C.textMuted }]}>{l.date}</Text>
            </View>
            <Badge
              label={l.status}
              color={l.status === 'critical' ? 'danger' : l.status === 'high' ? 'warning' : 'success'}
            />
          </View>
        </Card>
      ))}
    </View>
  );

  const renderAppointments = () => (
    <View>
      {patientAppts.length === 0 ? (
        <View style={sh.empty}>
          <Icon name="calendar" lib="feather" size={32} color={C.textMuted} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>No appointments</Text>
        </View>
      ) : patientAppts.map(a => (
        <Card key={a.id} style={sh.aptCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[sh.labIcon, { backgroundColor: C.primaryLight }]}>
              <Icon name="calendar" lib="feather" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[sh.rxDrug, { color: C.text }]}>{a.reason}</Text>
              <Text style={[sh.rxSub, { color: C.textSec }]}>{a.type} · {a.date} {a.time}</Text>
            </View>
            <Badge label={a.status} color={a.status === 'confirmed' ? 'success' : a.status === 'unassigned' ? 'danger' : 'warning'} />
          </View>
        </Card>
      ))}
    </View>
  );

  const renderTimeline = () => {
    const TYPE_ICON = {
      consultation: { name: 'file-text',    lib: 'feather', color: 'primary' },
      lab:          { name: 'flask-outline', lib: 'mc',      color: 'warning' },
      rx:           { name: 'pill',          lib: 'mc',      color: 'success' },
      appointment:  { name: 'calendar',      lib: 'feather', color: 'primary' },
    };
    const TYPE_LABEL = {
      consultation: 'Consultation',
      lab: 'Lab result',
      rx: 'Prescription',
      appointment: 'Appointment',
    };

    return (
      <View>
        {timeline.map((item, i) => {
          const ti = TYPE_ICON[item._type] || TYPE_ICON.consultation;
          const iconColor = ti.color === 'warning' ? C.warning : ti.color === 'success' ? C.success : C.primary;
          const iconBg    = ti.color === 'warning' ? C.warningLight : ti.color === 'success' ? C.successLight : C.primaryLight;
          return (
            <View key={item.id + i} style={sh.timelineRow}>
              <View style={sh.timelineLine}>
                <View style={[sh.timelineDot, { backgroundColor: iconBg, borderColor: iconColor }]}>
                  <Icon name={ti.name} lib={ti.lib} size={13} color={iconColor} />
                </View>
                {i < timeline.length - 1 && <View style={[sh.timelineConnector, { backgroundColor: C.border }]} />}
              </View>
              <View style={[sh.timelineCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: iconColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {TYPE_LABEL[item._type]}
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
  };

  const RENDER_TAB = {
    overview:      renderOverview,
    consultations: renderConsultations,
    prescriptions: renderPrescriptions,
    lab:           renderLab,
    appointments:  renderAppointments,
    timeline:      renderTimeline,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* ── Header with back button ── */}
      <View style={[sh.pageHeader, { backgroundColor: C.navBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={sh.backBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Icon name="arrow-left" lib="feather" size={20} color={C.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[sh.headerName, { color: C.text }]} numberOfLines={1}>{patient?.name}</Text>
          <Text style={[sh.headerSub, { color: C.textMuted }]}>
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
        style={[sh.tabBar, { backgroundColor: C.navBg, borderBottomColor: C.border }]}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[sh.tab, activeTab === tab.id && { borderBottomColor: C.primary }]}
          >
            <Text style={[sh.tabLabel, { color: activeTab === tab.id ? C.primary : C.textMuted, fontWeight: activeTab === tab.id ? '700' : '400' }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ── */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {(RENDER_TAB[activeTab] || renderOverview)()}
      </ScrollView>

      {/* ── Consultation modal ── */}
      <ConsultationModal
        visible={consultModal.visible}
        existing={consultModal.existing}
        patientName={patient?.name}
        user={user}
        onClose={() => setConsultModal({ visible: false, existing: null })}
        onSave={loadConsultations}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sh = StyleSheet.create({
  // Page header
  pageHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerName:   { fontSize: 15, fontWeight: '800' },
  headerSub:    { fontSize: 11, marginTop: 1 },
  // Tabs
  tabBar:       { borderBottomWidth: 1, flexGrow: 0 },
  tab:          { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4 },
  tabLabel:     { fontSize: 13 },
  // Section header
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', paddingBottom: 10, marginBottom: 6, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', flex: 1 },
  countPill:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  // Info rows
  infoCard:     { marginBottom: 10, padding: 14 },
  infoRow:      { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1 },
  infoLbl:      { fontSize: 12, width: 110, flexShrink: 0 },
  infoVal:      { fontSize: 13, fontWeight: '500', flex: 1 },
  condTag:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  // Consultation card
  consultCard:  { marginBottom: 10, padding: 14 },
  consultHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  consultDate:  { fontSize: 13, fontWeight: '700' },
  consultDoc:   { fontSize: 11, marginTop: 2 },
  editBtn:      { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filesBadge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  // SOAP
  soapRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10, paddingLeft: 2 },
  soapDot:      { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  soapLabel:    { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  soapText:     { fontSize: 13, lineHeight: 19 },
  fileRow:      { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 7, borderWidth: 1, marginTop: 5 },
  // Rx
  rxCard:       { marginBottom: 8, padding: 12 },
  rxIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rxDrug:       { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  rxSub:        { fontSize: 11, marginBottom: 1 },
  rxDate:       { fontSize: 10 },
  rxActions:    { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  // Lab / Appt
  labCard:      { marginBottom: 8, padding: 12 },
  labIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  aptCard:      { marginBottom: 8, padding: 12 },
  // Timeline
  timelineRow:  { flexDirection: 'row', marginBottom: 12 },
  timelineLine: { width: 36, alignItems: 'center' },
  timelineDot:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  timelineConnector: { width: 2, flex: 1, marginTop: 4 },
  timelineCard: { flex: 1, marginLeft: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  // Misc
  restrictBanner: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  empty:        { alignItems: 'center', paddingVertical: 40 },
  // Modal
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, paddingBottom: 36 },
  handle:       { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle:   { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sheetSub:     { fontSize: 12, marginBottom: 14 },
  fieldLbl:     { fontSize: 11, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  typePill:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  textarea:     { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, minHeight: 80, textAlignVertical: 'top' },
  errTxt:       { fontSize: 12, marginBottom: 10 },
});
