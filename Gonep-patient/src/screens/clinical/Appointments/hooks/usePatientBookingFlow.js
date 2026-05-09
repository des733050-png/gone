import { useCallback, useEffect, useRef, useState } from 'react';
import { createAppointment, getDoctors, getDoctorSlots, getSpecialties } from '../../../../api';

const INITIAL_FORM = {
  specialty: '',
  doctor: null,
  appointmentType: 'In Facility',
  selectedDate: null,
  selectedTime: null,
  visitReason: '',
};

export function usePatientBookingFlow() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);

  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const slotsReqRef = useRef(0);

  const update = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);

  const reset = useCallback(() => {
    setStep(1);
    setForm(INITIAL_FORM);
    setSpecialties([]);
    setDoctors([]);
    setSlots([]);
    setSubmitError('');
  }, []);

  // Load specialties on mount
  useEffect(() => {
    let active = true;
    setSpecialtiesLoading(true);
    getSpecialties()
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.specialties ?? res?.results ?? [];
        setSpecialties(list.filter(Boolean));
      })
      .catch(() => { if (active) setSpecialties([]); })
      .finally(() => { if (active) setSpecialtiesLoading(false); });
    return () => { active = false; };
  }, []);

  // Load doctors when specialty changes
  useEffect(() => {
    if (!form.specialty) return;
    let active = true;
    setDoctorsLoading(true);
    getDoctors(form.specialty)
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res) ? res : res?.doctors ?? res?.results ?? [];
        setDoctors(rows.map((d) => ({ ...d, name: d.full_name || d.name || '' })));
      })
      .catch(() => { if (active) setDoctors([]); })
      .finally(() => { if (active) setDoctorsLoading(false); });
    return () => { active = false; };
  }, [form.specialty]);

  // Load slots when doctor + type changes (step 4)
  useEffect(() => {
    if (!form.doctor?.provider_code) return;
    const reqId = ++slotsReqRef.current;
    setSlotsLoading(true);
    getDoctorSlots(form.doctor.provider_code, form.appointmentType)
      .then((res) => {
        if (slotsReqRef.current !== reqId) return;
        const list = res?.slots || (Array.isArray(res) ? res : []);
        setSlots(list);
      })
      .catch(() => { if (slotsReqRef.current === reqId) setSlots([]); })
      .finally(() => { if (slotsReqRef.current === reqId) setSlotsLoading(false); });
  }, [form.doctor?.provider_code, form.appointmentType]);

  const nextStep = useCallback(() => setStep((s) => s + 1), []);
  const prevStep = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const slot = form.selectedTime;
      const slotDatetime = slot?.datetime || (slot?.date && slot?.time
        ? `${slot.date}T${slot.time}:00`
        : null);
      if (!slotDatetime) {
        setSubmitError('Missing appointment time. Go back and choose a slot.');
        return false;
      }
      await createAppointment({
        provider_code: form.doctor.provider_code,
        slot_datetime: slotDatetime,
        service_type: 'Consultation',
        appointment_type: form.appointmentType,
        reason: form.visitReason,
        specialty: form.specialty,
      });
      return true;
    } catch (e) {
      setSubmitError(e?.message || 'Unable to submit booking. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  return {
    step, form, update, nextStep, prevStep, reset, submit,
    specialties, specialtiesLoading,
    doctors, doctorsLoading,
    slots, slotsLoading,
    submitting, submitError,
  };
}
