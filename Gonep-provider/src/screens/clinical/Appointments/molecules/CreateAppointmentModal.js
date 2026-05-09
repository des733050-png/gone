import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ResponsiveModal } from '../../../../molecules/ResponsiveModal';
import { useTheme } from '../../../../theme/ThemeContext';
import { useBookingFlow } from '../hooks/useBookingFlow';
import { usePatientSearch } from '../hooks/usePatientSearch';
import { Step1Specialization } from '../booking/Step1Specialization';
import { Step2Doctor } from '../booking/Step2Doctor';
import { Step3Patient } from '../booking/Step3Patient';
import { Step4TypeAndSlots } from '../booking/Step4TypeAndSlots';
import { Step5Details } from '../booking/Step5Details';

const STEP_TITLES = {
  1: 'Select Specialization',
  2: 'Select Doctor',
  3: 'Select Patient',
  4: 'Date & Time',
  5: 'Appointment Details',
};

export function CreateAppointmentModal({ visible, user, onClose, onSuccess }) {
  const { C } = useTheme();
  const isDoctor = user?.role === 'doctor';

  const flow = useBookingFlow({ isDoctor, user });
  const patientSearch = usePatientSearch();

  const { step, form, update, nextStep, prevStep, submit, submitting, submitError, reset,
    specialties, specialtiesLoading, doctors, doctorsLoading, slots, slotsLoading, firstStep } = flow;

  async function handleSubmit() {
    const ok = await submit();
    if (ok) {
      reset();
      patientSearch.clear();
      onSuccess?.();
      onClose?.();
    }
  }

  function handleClose() {
    reset();
    patientSearch.clear();
    onClose?.();
  }

  function canProceed() {
    if (step === 1) return !!form.specialty;
    if (step === 2) return !!form.doctor;
    if (step === 3) return !!form.patient;
    if (step === 4) return !!form.selectedDate && !!form.selectedTime;
    return true;
  }

  const totalSteps = isDoctor ? 3 : 5;
  const displayStep = step - firstStep + 1;

  return (
    <ResponsiveModal visible={visible} onClose={handleClose} contentMaxHeight={620}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.title, { color: C.text }]}>{STEP_TITLES[step] || 'Book Appointment'}</Text>
        <Text style={[styles.stepCount, { color: C.textMuted }]}>{displayStep} / {totalSteps}</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: C.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
        {step === 1 && !isDoctor && (
          <Step1Specialization
            specialties={specialties}
            loading={specialtiesLoading}
            selected={form.specialty}
            onSelect={(s) => update({ specialty: s })}
          />
        )}
        {step === 2 && !isDoctor && (
          <Step2Doctor
            doctors={doctors}
            loading={doctorsLoading}
            selected={form.doctor}
            onSelect={(d) => update({ doctor: d })}
            specialty={form.specialty}
          />
        )}
        {step === 3 && (
          <Step3Patient
            search={patientSearch.query}
            onSearchChange={patientSearch.setQuery}
            results={patientSearch.results}
            loading={patientSearch.loading}
            error={patientSearch.error}
            selected={form.patient}
            onSelect={(p) => { update({ patient: p }); patientSearch.clear(); }}
            onClear={() => { update({ patient: null }); patientSearch.clear(); }}
          />
        )}
        {step === 4 && (
          <Step4TypeAndSlots
            appointmentType={form.appointmentType}
            onTypeChange={(t) => { update({ appointmentType: t, selectedDate: null, selectedTime: null }); }}
            slots={slots}
            slotsLoading={slotsLoading}
            selectedDate={form.selectedDate}
            onDateChange={(d) => update({ selectedDate: d, selectedTime: null })}
            selectedTime={form.selectedTime}
            onTimeChange={(t) => update({ selectedTime: t })}
          />
        )}
        {step === 5 && (
          <Step5Details
            visitReason={form.visitReason}
            onReasonChange={(v) => update({ visitReason: v.slice(0, 300) })}
            notes={form.notes}
            onNotesChange={(v) => update({ notes: v.slice(0, 500) })}
            submitting={submitting}
            error={submitError}
            onSubmit={handleSubmit}
          />
        )}
      </ScrollView>

      {/* Footer nav */}
      {step < 5 && (
        <View style={[styles.footer, { borderTopColor: C.border }]}>
          {step > firstStep ? (
            <TouchableOpacity onPress={prevStep} style={[styles.backBtn, { borderColor: C.border }]}>
              <Text style={[styles.backText, { color: C.text }]}>Back</Text>
            </TouchableOpacity>
          ) : <View style={styles.spacer} />}
          <TouchableOpacity
            onPress={nextStep}
            disabled={!canProceed()}
            style={[
              styles.nextBtn,
              { backgroundColor: canProceed() ? C.primary : C.border },
            ]}
          >
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </ResponsiveModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '600' },
  stepCount: { fontSize: 13 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 18 },
  body: { flex: 1 },
  bodyContent: { padding: 20, paddingBottom: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  spacer: { flex: 1 },
  backBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 15, fontWeight: '500' },
  nextBtn: {
    flex: 2,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
