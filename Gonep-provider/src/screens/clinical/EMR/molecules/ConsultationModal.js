// ─── screens/clinical/EMR/molecules/ConsultationModal.js ─────────────────────
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { BottomSheet } from '../../../../molecules/BottomSheet';
import { PillSelector } from '../../../../molecules/PillSelector';
import { useTheme } from '../../../../theme/ThemeContext';
import { CONSULTATION_TYPES, SOAP_FIELDS } from '../../../../constants/emr';
import { FormField } from '../../../../molecules/FormField';

export function ConsultationModal({ visible, existing, patientName, user, onClose, onSave }) {
  const { C }  = useTheme();
  const isEdit = !!existing;

  const [subj, setSubj] = useState(existing?.subjective || '');
  const [obj,  setObj]  = useState(existing?.objective  || '');
  const [ass,  setAss]  = useState(existing?.assessment || '');
  const [plan, setPlan] = useState(existing?.plan       || '');
  const [type, setType] = useState(existing?.type       || 'In Facility');
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const setters = { subjective: setSubj, objective: setObj, assessment: setAss, plan: setPlan };
  const values  = { subjective: subj,    objective: obj,    assessment: ass,    plan };

  const handleSave = async () => {
    if (!subj.trim() || !ass.trim()) { setErr('Subjective and Assessment are required.'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave(
        { subjective: subj.trim(), objective: obj.trim(), assessment: ass.trim(), plan: plan.trim(), type },
        existing
      );
      onClose();
    } catch (e) {
      setErr(e?.message || 'Failed to save note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} scrollable>
      <Text style={{ fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 }}>
        {isEdit ? 'Edit consultation note' : 'Add consultation note'}
      </Text>
      <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>{patientName}</Text>

      <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Type
      </Text>
      <PillSelector options={CONSULTATION_TYPES} selected={type} onSelect={setType} />

      {/* SOAP fields */}
      {SOAP_FIELDS.map(f => (
        <View key={f.key} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{f.key}</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              {f.label}
            </Text>
          </View>
          <FormField
            value={values[f.field]}
            onChangeText={v => { setters[f.field](v); if (err) setErr(''); }}
            placeholder={f.ph}
            multiline
            numberOfLines={3}
            style={{ marginBottom: 0 }}
          />
        </View>
      ))}

      {err ? <Text style={{ fontSize: 12, color: C.danger, marginBottom: 10 }}>{err}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <Btn label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={saving} />
        <Btn label={saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add note'}
          onPress={handleSave} loading={saving} style={{ flex: 1 }} />
      </View>
    </BottomSheet>
  );
}
