import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '../../../atoms/Icon';
import { ScreenContainer } from '../../../organisms/ScreenContainer';
import { useTheme } from '../../../theme/ThemeContext';
import { Step1Specialty } from './booking/Step1Specialty';
import { Step2Doctor } from './booking/Step2Doctor';
import { Step3TypeAndSlots } from './booking/Step3TypeAndSlots';
import { Step4Details } from './booking/Step4Details';
import { usePatientBookingFlow } from './hooks/usePatientBookingFlow';

const STEP_TITLES = {
  1: 'Choose Specialty',
  2: 'Choose Doctor',
  3: 'Date & Time',
  4: 'Confirm',
};

const TOTAL_STEPS = 4;

export function BookAppointmentScreen({ onBack, onBooked }) {
  const { C } = useTheme();
  const flow = usePatientBookingFlow();

  const {
    step, form, update, nextStep, prevStep, reset, submit,
    specialties, specialtiesLoading,
    doctors, doctorsLoading,
    slots, slotsLoading,
    submitting, submitError,
  } = flow;

  function canProceed() {
    if (step === 1) return !!form.specialty;
    if (step === 2) return !!form.doctor;
    if (step === 3) return !!form.selectedDate && !!form.selectedTime;
    return true;
  }

  async function handleSubmit() {
    const ok = await submit();
    if (ok) {
      reset();
      onBooked?.();
    }
  }

  function handleBack() {
    if (step === 1) {
      reset();
      onBack?.();
      return;
    }
    prevStep();
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Icon name="arrow-left" lib="feather" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>{STEP_TITLES[step]}</Text>
        </View>
        <Text style={[styles.stepCount, { color: C.textMuted }]}>{step} / {TOTAL_STEPS}</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <Step1Specialty
            specialties={specialties}
            loading={specialtiesLoading}
            selected={form.specialty}
            onSelect={(s) => { update({ specialty: s, doctor: null, selectedDate: null, selectedTime: null }); nextStep(); }}
          />
        )}
        {step === 2 && (
          <Step2Doctor
            doctors={doctors}
            loading={doctorsLoading}
            selected={form.doctor}
            onSelect={(d) => { update({ doctor: d, selectedDate: null, selectedTime: null }); nextStep(); }}
            specialty={form.specialty}
          />
        )}
        {step === 3 && (
          <Step3TypeAndSlots
            appointmentType={form.appointmentType}
            onTypeChange={(t) => update({ appointmentType: t, selectedDate: null, selectedTime: null })}
            slots={slots}
            slotsLoading={slotsLoading}
            selectedDate={form.selectedDate}
            onDateChange={(d) => update({ selectedDate: d, selectedTime: null })}
            selectedTime={form.selectedTime}
            onTimeChange={(t) => update({ selectedTime: t })}
          />
        )}
        {step === 4 && (
          <Step4Details
            specialty={form.specialty}
            doctor={form.doctor}
            selectedTime={form.selectedTime}
            appointmentType={form.appointmentType}
            visitReason={form.visitReason}
            onReasonChange={(v) => update({ visitReason: v })}
            submitting={submitting}
            error={submitError}
            onSubmit={handleSubmit}
          />
        )}
      </ScrollView>

      {/* Footer nav — only for steps 1-3 */}
      {step < 4 && (
        <View style={[styles.footer, { borderTopColor: C.border }]}>
          {step > 1 ? (
            <TouchableOpacity onPress={handleBack} style={[styles.backFooterBtn, { borderColor: C.border }]}>
              <Text style={[styles.backText, { color: C.text }]}>Back</Text>
            </TouchableOpacity>
          ) : <View style={styles.spacer} />}
          <TouchableOpacity
            onPress={nextStep}
            disabled={!canProceed()}
            style={[styles.nextBtn, { backgroundColor: canProceed() ? C.primary : C.border }]}
          >
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  stepCount: { fontSize: 13 },
  body: { padding: 20, paddingBottom: 12 },
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
  backFooterBtn: {
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
