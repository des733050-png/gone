import { useCallback, useEffect, useState } from 'react';
import {
  createAppointment,
  getBookingDoctorSlots,
  getBookingDoctors,
  getBookingSpecialties,
} from '../../../../api';

const INITIAL_STATE = {
  specialty: null,
  doctor: null,
  patient: null,
  appointmentType: 'In Facility',
  selectedDate: null,
  selectedTime: null,
  visitReason: '',
  notes: '',
};

export function useBookingFlow({ isDoctor, user }) {
  const firstStep = isDoctor ? 3 : 1;
  const [step, setStep] = useState(firstStep);
  const [form, setForm] = useState(INITIAL_STATE);

  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // For doctors: pre-fill their own profile
  useEffect(() => {
    if (isDoctor && user) {
      setForm((f) => ({
        ...f,
        doctor: {
          doctor_id: user.id,
          provider_code: user.provider_code,
          full_name: user.name || user.full_name || 'You',
          specialty: user.specialty || '',
        },
      }));
    }
  }, [isDoctor, user]);

  // Load specialties on first step (admin/receptionist flow)
  useEffect(() => {
    if (step === 1 && !isDoctor) {
      setSpecialtiesLoading(true);
      getBookingSpecialties()
        .then((data) => setSpecialties(Array.isArray(data) ? data : (data?.results || [])))
        .catch(() => setSpecialties([]))
        .finally(() => setSpecialtiesLoading(false));
    }
  }, [step, isDoctor]);

  // Load doctors when specialty is selected
  useEffect(() => {
    if (form.specialty && step === 2) {
      setDoctorsLoading(true);
      getBookingDoctors(form.specialty?.name || form.specialty)
        .then((data) => setDoctors(Array.isArray(data) ? data : []))
        .catch(() => setDoctors([]))
        .finally(() => setDoctorsLoading(false));
    }
  }, [form.specialty, step]);

  // Load slots when type changes and doctor is selected
  useEffect(() => {
    const providerCode = form.doctor?.provider_code;
    const apptType = form.appointmentType;
    if (!providerCode || step !== 4) return;
    setSlotsLoading(true);
    getBookingDoctorSlots(providerCode, apptType)
      .then((data) => setSlots(data?.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.doctor?.provider_code, form.appointmentType, step]);

  const update = useCallback((patch) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const nextStep = useCallback(() => setStep((s) => s + 1), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(firstStep, s - 1)), [firstStep]);

  const reset = useCallback(() => {
    setStep(firstStep);
    setForm(INITIAL_STATE);
    setSpecialties([]);
    setDoctors([]);
    setSlots([]);
    setSubmitError('');
  }, [firstStep]);

  const submit = useCallback(async () => {
    const { doctor, patient, appointmentType, selectedDate, selectedTime, visitReason, notes } = form;
    if (!patient) { setSubmitError('Select a patient.'); return false; }
    if (!doctor) { setSubmitError('No doctor selected.'); return false; }
    if (!selectedDate || !selectedTime) { setSubmitError('Select a date and time.'); return false; }

    // Build scheduled_for ISO string
    const slotDatetime = selectedTime?.datetime || (() => {
      const d = typeof selectedDate === 'string' ? selectedDate : selectedDate?.toISOString?.().split('T')[0];
      const t = typeof selectedTime === 'string' ? selectedTime : '09:00';
      return `${d}T${t}:00`;
    })();

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        patient_id: patient.id || patient.patient_code,
        patient_name: patient.name,
        patient_phone: patient.phone || '',
        doctor_id: doctor.doctor_id,
        scheduled_for: slotDatetime,
        appointment_type: appointmentType,
        type: appointmentType,
        reason: visitReason,
        visit_reason: visitReason,
        notes,
      };
      await createAppointment(payload);
      return true;
    } catch (e) {
      const msg = e?.response?.data?.detail
        || e?.response?.data?.slot_datetime
        || (e instanceof Error ? e.message : 'Booking failed.');
      setSubmitError(String(msg));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  return {
    step,
    form,
    update,
    nextStep,
    prevStep,
    reset,
    submit,
    submitting,
    submitError,
    specialties,
    specialtiesLoading,
    doctors,
    doctorsLoading,
    slots,
    slotsLoading,
    isDoctor,
    firstStep,
  };
}
