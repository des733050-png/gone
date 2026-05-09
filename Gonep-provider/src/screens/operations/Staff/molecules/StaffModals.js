// ─── screens/operations/Staff/molecules/StaffModals.js ───────────────────────
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { Input } from '../../../../atoms/Input';
import { ResponsiveModal } from '../../../../molecules/ResponsiveModal';
import { useTheme } from '../../../../theme/ThemeContext';
import {
  updateStaff,
  addStaffMember,
  appendLog,
  invitePatient,
  getFacilitySpecialties,
} from '../../../../api';
import { ROLE_LABELS } from '../../../../config/roles';
import { INVITE_ROLE_OPTS, ROLE_DESC } from '../../../../constants/staff';

function sanitizeName(s) {
  return String(s || '')
    .replace(/[^a-zA-ZÀ-ÿ0-9\s'.-]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function sanitizeEmail(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .slice(0, 254);
}

function sanitizePhone(s) {
  return String(s || '').replace(/[^\d+\s()-]/g, '').trim().slice(0, 32);
}

function sanitizeIsoDate(s) {
  const t = String(s || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  return t;
}

function SpecialtyCatalogBlock({
  C,
  catalog,
  loading,
  selectedId,
  onSelectId,
  newName,
  onChangeNew,
}) {
  return (
    <>
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Specialty *</Text>
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginVertical: 14 }} />
      ) : null}
      {!loading && catalog.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }}
          contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
        >
          {catalog.map((row) => {
            const on = selectedId === row.id;
            return (
              <TouchableOpacity
                key={row.id}
                onPress={() => {
                  onSelectId(row.id);
                  onChangeNew('');
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  marginRight: 6,
                  marginBottom: 6,
                  backgroundColor: on ? C.primary : C.surface,
                  borderColor: on ? C.primary : C.border,
                }}
              >
                <Text style={{ color: on ? '#fff' : C.text, fontSize: 12, fontWeight: '600' }}>
                  {row.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
      
    </>
  );
}

function modalHeader(C, title, subtitle, onClose) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: C.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: C.textMuted, fontSize: 12 }}>{subtitle}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
        <Icon name="x" lib="feather" size={18} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── EditMemberModal ──────────────────────────────────────────────────────────
export function EditMemberModal({ visible, member, user, onClose, onSave }) {
  const { C } = useTheme();
  const [form, setForm] = useState({ ...member });
  const [saving, setSaving] = useState(false);
  const [specCatalog, setSpecCatalog] = useState([]);
  const [specLoading, setSpecLoading] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [newSpecName, setNewSpecName] = useState('');

  useEffect(() => {
    if (visible && member) setForm({ ...member });
  }, [visible, member]);

  useEffect(() => {
    if (!visible || !member || member.role !== 'doctor') {
      setSpecCatalog([]);
      setSelectedSpecId('');
      setNewSpecName('');
      return undefined;
    }
    let cancelled = false;
    setSpecLoading(true);
    setSelectedSpecId(member.facility_specialty_id || '');
    setNewSpecName('');
    getFacilitySpecialties()
      .then((rows) => {
        if (!cancelled) setSpecCatalog(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setSpecCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setSpecLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, member?.id, member?.role]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        first_name: sanitizeName(form.first_name),
        last_name: sanitizeName(form.last_name),
        phone: sanitizePhone(form.phone || ''),
      };
      if (member.role === 'doctor') {
        if (selectedSpecId) patch.facility_specialty_id = selectedSpecId;
        else if (String(newSpecName).trim())
          patch.new_specialty_name = String(newSpecName).trim().slice(0, 120);
        else
          patch.specialty =
            form.specialty != null ? String(form.specialty).trim().slice(0, 120) : '';
      }
      const updated = await updateStaff(member.id, patch);
      appendLog({
        staff: user ? `${user.first_name} ${user.last_name}` : 'Admin',
        staff_id: user?.id,
        role: user?.role || 'hospital_admin',
        module: 'Staff',
        action: 'Staff details edited',
        detail: `${form.first_name} ${form.last_name}`,
        type: 'staff',
      });
      onSave(updated || form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!member) return null;

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      {modalHeader(C, 'Edit member', 'Update profile details for this team member.', onClose)}
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Input label="First name" value={form.first_name} onChangeText={(v) => set('first_name', v)} icon="user" />
        <Input label="Last name" value={form.last_name} onChangeText={(v) => set('last_name', v)} />
        <Input
          label="Phone"
          value={form.phone || ''}
          onChangeText={(v) => set('phone', v)}
          icon="phone"
          keyboardType="phone-pad"
        />
        {member.role === 'doctor' && (
          <SpecialtyCatalogBlock
            C={C}
            catalog={specCatalog}
            loading={specLoading}
            selectedId={selectedSpecId}
            onSelectId={setSelectedSpecId}
            newName={newSpecName}
            onChangeNew={setNewSpecName}
          />
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </ResponsiveModal>
  );
}

// ─── AddMemberModal ───────────────────────────────────────────────────────────
export function AddMemberModal({ visible, user, onClose, onAdd, onPatientInvited }) {
  const { C } = useTheme();
  const { height: winH } = useWindowDimensions();
  const modalCap = Math.round(Math.min(winH * 0.88, 640));
  const bodyScrollMax = Math.max(160, Math.round(winH * 0.42));

  const [phase, setPhase] = useState('form');
  /** 1 = role, 2 = details (two-step wizard before submit) */
  const [wizardStep, setWizardStep] = useState(1);
  const [role, setRole] = useState('doctor');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [newSpecName, setNewSpecName] = useState('');
  const [specCatalog, setSpecCatalog] = useState([]);
  const [specLoading, setSpecLoading] = useState(false);
  const [license, setLicense] = useState('');
  const [professionalNotes, setProfessionalNotes] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [inviteSummary, setInviteSummary] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setPhase('form');
    setWizardStep(1);
    setRole('doctor');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    // Specialty selection lives in selectedSpecId / newSpecName — no setSpecialty exists.
    setSelectedSpecId('');
    setNewSpecName('');
    setLicense('');
    setProfessionalNotes('');
    setDob('');
    setGender('');
    setEmergencyPhone('');
    setSaving(false);
    setErr('');
    setInviteSummary(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || wizardStep !== 2 || role !== 'doctor') return undefined;
    let cancelled = false;
    setSpecLoading(true);
    getFacilitySpecialties()
      .then((rows) => {
        if (!cancelled) setSpecCatalog(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setSpecCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setSpecLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, wizardStep, role]);

  const roleOptions = useMemo(
    () => INVITE_ROLE_OPTS.map((r) => ({ value: r, label: ROLE_LABELS[r] || r })),
    []
  );

  const validate = () => {
    const fn = sanitizeName(firstName);
    const em = sanitizeEmail(email);
    if (!fn) return 'First name is required.';
    if (!em) return 'A valid email is required.';
    if (role === 'doctor') {
      if (!selectedSpecId && String(newSpecName).trim().length < 2) {
        return 'Choose a specialty from the list or enter a new name (at least 2 characters).';
      }
      if (String(license).trim().length < 3) return 'Licence number is required for doctors.';
    }
    if (role === 'patient') {
      const d = sanitizeIsoDate(dob);
      if (!d) return 'Date of birth is required (YYYY-MM-DD) for patient accounts.';
    }
    if (
      ['billing_manager', 'lab_manager', 'receptionist'].includes(role)
      && !String(professionalNotes).trim()
    ) {
      return 'Add professional / compliance notes (ID, credentials, or desk reference) for this role.';
    }
    return '';
  };

  const handleAdd = async () => {
    const msg = validate();
    if (msg) {
      setErr(msg);
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (role === 'patient') {
        const res = await invitePatient({
          email: sanitizeEmail(email),
          first_name: sanitizeName(firstName),
          last_name: sanitizeName(lastName),
          phone: sanitizePhone(phone),
          date_of_birth: sanitizeIsoDate(dob),
          gender: String(gender || '').trim().slice(0, 20),
          emergency_contact_phone: sanitizePhone(emergencyPhone),
        });
        onPatientInvited?.(res);
        appendLog({
          staff: user ? `${user.first_name} ${user.last_name}` : 'Admin',
          staff_id: user?.id,
          role: user?.role || 'hospital_admin',
          module: 'Staff',
          action: 'patient_portal_invited',
          detail: JSON.stringify({ email: res.email, patient_code: res.patient_code }),
          type: 'staff',
        });
        setInviteSummary(res);
        setPhase('done');
      } else {
        const doctorSpec =
          role === 'doctor'
            ? selectedSpecId
              ? { facility_specialty_id: selectedSpecId }
              : { new_specialty_name: String(newSpecName).trim() }
            : {};
        const member = await addStaffMember({
          role,
          first_name: sanitizeName(firstName),
          last_name: sanitizeName(lastName),
          email: sanitizeEmail(email),
          phone: sanitizePhone(phone),
          ...doctorSpec,
          license: role === 'doctor' ? String(license).trim() : '',
          professional_notes: ['billing_manager', 'lab_manager', 'receptionist'].includes(role)
            ? String(professionalNotes).trim().slice(0, 500)
            : '',
          facility: 'Nairobi General Hospital',
          hospital_id: 'hosp-001',
        });
        appendLog({
          staff: user ? `${user.first_name} ${user.last_name}` : 'Admin',
          staff_id: user?.id,
          role: user?.role || 'hospital_admin',
          module: 'Staff',
          action: 'Account created',
          detail: `${firstName} ${lastName} — ${ROLE_LABELS[role]}`,
          type: 'staff',
        });
        onAdd(member);
        // If a temporary password was generated, drop into the "done" phase
        // so the admin can copy it before the modal closes. Re-using the
        // inviteSummary slot keeps the existing UI surface.
        if (member.temporary_password || member.invitation) {
          setInviteSummary(member);
          setPhase('done');
        } else {
          onClose();
        }
      }
    } catch (e) {
      setErr(e?.message || 'Unable to complete invite.');
    } finally {
      setSaving(false);
    }
  };

  const closeDone = () => {
    setInviteSummary(null);
    setPhase('form');
    setWizardStep(1);
    onClose();
  };

  const isWeb = Platform.OS === 'web';

  const rolePicker = (
    <>
      <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Role</Text>
      {isWeb ? (
        <View style={{ marginBottom: 12 }}>
          {React.createElement(
            'select',
            {
              value: role,
              onChange: (e) => setRole(e?.target?.value || 'doctor'),
              style: {
                width: '100%',
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '10px 12px',
                backgroundColor: C.inputBg,
                color: C.text,
              },
            },
            roleOptions.map((o) =>
              React.createElement('option', { key: o.value, value: o.value }, o.label)
            )
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {INVITE_ROLE_OPTS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setRole(r)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                marginRight: 6,
                backgroundColor: role === r ? C.primary : C.surface,
                borderColor: role === r ? C.primary : C.border,
              }}
            >
              <Text style={{ color: role === r ? '#fff' : C.textSec, fontSize: 11, fontWeight: '700' }}>
                {ROLE_LABELS[r]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
          marginBottom: 4,
          backgroundColor: C.primaryLight,
          borderColor: C.primaryMid,
        }}
      >
        <Icon name="shield" lib="feather" size={13} color={C.primary} style={{ marginRight: 6 }} />
        <Text style={{ color: C.primary, fontSize: 12, flex: 1 }}>{ROLE_DESC[role]}</Text>
      </View>
    </>
  );

  const detailFields = (
    <>
      <Input label="First name *" value={firstName} onChangeText={setFirstName} icon="user" />
      <Input label="Last name" value={lastName} onChangeText={setLastName} />
      <Input
        label="Email *"
        value={email}
        onChangeText={setEmail}
        icon="mail"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Input label="Phone" value={phone} onChangeText={setPhone} icon="phone" keyboardType="phone-pad" />

      {role === 'doctor' && (
        <>
          <SpecialtyCatalogBlock
            C={C}
            catalog={specCatalog}
            loading={specLoading}
            selectedId={selectedSpecId}
            onSelectId={setSelectedSpecId}
            newName={newSpecName}
            onChangeNew={setNewSpecName}
          />
          <Input label="Professional licence no. *" value={license} onChangeText={setLicense} icon="award" />
        </>
      )}

      {['billing_manager', 'lab_manager', 'receptionist'].includes(role) && (
        <Input
          label="Professional / compliance notes *"
          value={professionalNotes}
          onChangeText={setProfessionalNotes}
          placeholder="e.g. staff ID, professional body registration, desk extension"
          multiline
        />
      )}

      {role === 'patient' && (
        <>
          <Input
            label="Date of birth * (YYYY-MM-DD)"
            value={dob}
            onChangeText={setDob}
            placeholder="1990-04-15"
            autoCapitalize="none"
          />
          <Input label="Gender (optional)" value={gender} onChangeText={setGender} />
          <Input
            label="Emergency contact phone (optional)"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            keyboardType="phone-pad"
          />
        </>
      )}
    </>
  );

  return (
    <ResponsiveModal
      visible={visible}
      onClose={phase === 'form' ? onClose : closeDone}
      contentMaxHeight={modalCap}
    >
      {phase === 'form' ? (
        <View style={[styles.addMemberShell, { maxHeight: modalCap - 32, minHeight: 0 }]}>
          {wizardStep === 1 ? (
            <>
              {modalHeader(
                C,
                'Add team member',
                'Step 1 of 2 — choose a role. You will enter name, email, and credentials next.',
                onClose
              )}
              <Text style={[styles.stepHint, { color: C.textMuted }]}>Step 1 of 2</Text>
              <ScrollView
                style={[styles.addMemberScroll, { maxHeight: bodyScrollMax }]}
                contentContainerStyle={styles.addMemberScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {rolePicker}
              </ScrollView>
              <View style={styles.footer}>
                <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
                <Btn label="Next" onPress={() => { setErr(''); setWizardStep(2); }} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              {modalHeader(
                C,
                'Add team member',
                'Step 2 of 2 — invite details. One-time password is issued after you send.',
                onClose
              )}
              <View style={styles.step2Bar}>
                <Text style={[styles.stepHint, { color: C.textMuted, marginBottom: 0 }]}>
                  {`Step 2 · ${ROLE_LABELS[role] || role}`}
                </Text>
                <TouchableOpacity onPress={() => { setErr(''); setWizardStep(1); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>Change role</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                style={[styles.addMemberScroll, { maxHeight: bodyScrollMax }]}
                contentContainerStyle={styles.addMemberScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                {detailFields}
              </ScrollView>
              {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>{err}</Text> : null}
              <View style={styles.footer}>
                <Btn label="Back" variant="ghost" onPress={() => { setErr(''); setWizardStep(1); }} style={{ flex: 1 }} disabled={saving} />
                <Btn label={saving ? 'Sending…' : 'Send invitation'} onPress={handleAdd} loading={saving} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={[styles.addMemberShell, { maxHeight: modalCap - 32, minHeight: 0 }]}>
          {modalHeader(C, 'Invitation ready', 'Copy the details below and send them through your secure process.', closeDone)}
          <ScrollView
            style={[styles.addMemberScroll, { maxHeight: bodyScrollMax }]}
            contentContainerStyle={styles.addMemberScrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 10 }}>
              The temporary password is shown once. Ask the user to change it after first sign-in.
            </Text>
            {inviteSummary?.patient_invite ? (
              <>
                <Text style={[styles.kv, { color: C.text }]}>{`Patient code: ${inviteSummary.patient_code}`}</Text>
                <Text style={[styles.kv, { color: C.text }]}>{`Email: ${inviteSummary.email}`}</Text>
                <Text style={[styles.kv, { color: C.text }]}>{`Temporary password: ${inviteSummary.temporary_password}`}</Text>
                {inviteSummary.login_url ? (
                  <Text style={[styles.kv, { color: C.text }]}>{`Login URL: ${inviteSummary.login_url}`}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={[styles.kv, { color: C.text }]}>{`Email: ${inviteSummary?.email || sanitizeEmail(email)}`}</Text>
                {/* Surface either the new staff temporary_password (set by the
                    backend on create) or the legacy invitation.temporary_password
                    payload (used in older flows). */}
                <Text style={[styles.kv, { color: C.text }]}>
                  {`Temporary password: ${inviteSummary?.temporary_password
                                        || inviteSummary?.invitation?.temporary_password
                                        || '—'}`}
                </Text>
                {(inviteSummary?.temporary_password) ? (
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        if (typeof navigator !== 'undefined' && navigator?.clipboard) {
                          navigator.clipboard.writeText(inviteSummary.temporary_password);
                        }
                      } catch (_) {}
                    }}
                    style={{
                      alignSelf: 'flex-start', borderWidth: 1, borderColor: C.primary,
                      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
                      marginTop: 4,
                    }}
                  >
                    <Text style={{ color: C.primary, fontSize: 11, fontWeight: '700' }}>
                      Copy password
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {inviteSummary?.password_note ? (
                  <Text style={{ color: C.warning, fontSize: 11, marginTop: 6 }}>
                    {inviteSummary.password_note}
                  </Text>
                ) : null}
                {inviteSummary?.invitation?.login_url ? (
                  <Text style={[styles.kv, { color: C.text }]}>{`Login URL: ${inviteSummary.invitation.login_url}`}</Text>
                ) : null}
              </>
            )}
          </ScrollView>
          <Btn label="Done" onPress={closeDone} full style={{ marginTop: 10, flexShrink: 0 }} />
        </View>
      )}
    </ResponsiveModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  headerSide: { width: 24, height: 24 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  scroll: { maxHeight: 480 },
  addMemberShell: {
    width: '100%',
    minHeight: 0,
    alignSelf: 'stretch',
    flexDirection: 'column',
  },
  addMemberScroll: {
    minHeight: 0,
    width: '100%',
  },
  addMemberScrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  stepHint: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  step2Bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  footer: { flexDirection: 'row', gap: 10, marginTop: 10, flexShrink: 0 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  kv: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
});
