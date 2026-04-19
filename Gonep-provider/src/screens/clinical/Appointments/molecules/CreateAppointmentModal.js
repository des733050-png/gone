import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Btn } from '../../../../atoms/Btn';
import { Icon } from '../../../../atoms/Icon';
import { Input } from '../../../../atoms/Input';
import { BookingDateGrid } from '../../../../molecules/BookingDateGrid';
import { BookingTimeSlotList } from '../../../../molecules/BookingTimeSlotList';
import { ResponsiveModal } from '../../../../molecules/ResponsiveModal';
import { useDebounce } from '../../../../hooks/useDebounce';
import { useCreateAppointment } from '../../../../hooks/useCreateAppointment';
import { appendLog, getAppointments, getAvailability, getStaff, searchPatientsForBooking } from '../../../../api';
import { useTheme } from '../../../../theme/ThemeContext';
import {
  collectAvailableCalendarDates,
  collectBookableTimeSlots,
} from '../../../../utils/bookingAvailability';

const DURATIONS = [15, 30, 45, 60];

function pickDoctorAvailability(map, doctorId) {
  if (!map || doctorId == null) return null;
  if (map[doctorId]) return map[doctorId];
  const key = String(doctorId);
  if (map[key]) return map[key];
  return Object.values(map).find((row) => String(row?.doctor_id) === key) || null;
}

export function CreateAppointmentModal({ visible, user, onClose, onSuccess }) {
  const { C } = useTheme();
  const isDoctor = user?.role === 'doctor';
  const [step, setStep] = useState(1);
  const [staff, setStaff] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  const [patientSearch, setPatientSearch] = useState('');
  const debouncedSearch = useDebounce(patientSearch, 300);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchRequestId = useRef(0);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(isDoctor ? user?.id : '');

  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);

  const [appointmentType, setAppointmentType] = useState('In Facility');
  const [visitReason, setVisitReason] = useState('');
  const [notes, setNotes] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { submit, checkCollision, loading, error, collision, parseDateTime } = useCreateAppointment();
  const [liveCollision, setLiveCollision] = useState(null);
  const [availabilityMap, setAvailabilityMap] = useState({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [appointmentsForBooking, setAppointmentsForBooking] = useState([]);
  const prevStepRef = useRef(1);

  const requestedDateTime = useMemo(() => parseDateTime(dateValue, timeValue), [dateValue, timeValue, parseDateTime]);
  const isPastTimeToday = useMemo(() => {
    if (!requestedDateTime) return false;
    const now = new Date();
    return requestedDateTime <= now;
  }, [requestedDateTime]);

  useEffect(() => {
    if (!visible) {
      searchRequestId.current += 1;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setLoadingLookups(true);
    getStaff()
      .then((staffRows) => {
        setStaff((staffRows || []).filter((item) => item?.role === 'doctor'));
      })
      .finally(() => setLoadingLookups(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setStep(1);
    setPatientSearch('');
    setSearchResults([]);
    setSearchError('');
    setSearchLoading(false);
    setSelectedPatient(null);
    setSelectedDoctorId(isDoctor ? user?.id : '');
    setDateValue('');
    setTimeValue('');
    setDurationMinutes(30);
    setAppointmentType('In Facility');
    setVisitReason('');
    setNotes('');
    setInlineError('');
    setSuccessMessage('');
    setLiveCollision(null);
    prevStepRef.current = 1;
  }, [visible, isDoctor, user?.id]);

  useEffect(() => {
    if (!visible) return;
    setAvailabilityLoading(true);
    getAvailability()
      .then((data) => {
        setAvailabilityMap(
          data && typeof data === 'object' && !Array.isArray(data) ? data : {}
        );
      })
      .catch(() => setAvailabilityMap({}))
      .finally(() => setAvailabilityLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible || step < 2) return;
    getAppointments()
      .then((rows) => setAppointmentsForBooking(rows || []))
      .catch(() => setAppointmentsForBooking([]));
  }, [visible, step]);

  useEffect(() => {
    const enteredStep2 = step === 2 && prevStepRef.current !== 2;
    prevStepRef.current = step;
    if (!enteredStep2) return;
    setDateValue('');
    setTimeValue('');
  }, [step]);

  useEffect(() => {
    if (step !== 2 || !selectedDoctorId) return;
    const doc = pickDoctorAvailability(availabilityMap, selectedDoctorId);
    const dates = collectAvailableCalendarDates(doc, { fromDate: new Date(), horizonDays: 120 });
    setDateValue((prev) => {
      if (prev && dates.includes(prev)) return prev;
      return dates[0] || '';
    });
  }, [step, selectedDoctorId, availabilityMap]);

  useEffect(() => {
    if (!visible) return;
    const q = debouncedSearch.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError('');
      return;
    }
    const id = ++searchRequestId.current;
    setSearchLoading(true);
    setSearchError('');
    searchPatientsForBooking(q)
      .then((body) => {
        if (searchRequestId.current !== id) return;
        setSearchResults(Array.isArray(body?.results) ? body.results : []);
      })
      .catch((err) => {
        if (searchRequestId.current !== id) return;
        setSearchError(err?.message || 'Unable to search patients.');
        setSearchResults([]);
      })
      .finally(() => {
        if (searchRequestId.current !== id) return;
        setSearchLoading(false);
      });
  }, [debouncedSearch, visible]);

  useEffect(() => {
    if (step !== 2 || !selectedDoctorId || !requestedDateTime) return;
    const timer = setTimeout(async () => {
      const result = await checkCollision({
        doctor_id: selectedDoctorId,
        scheduled_for: requestedDateTime.toISOString(),
        duration_minutes: durationMinutes,
      });
      setLiveCollision(result?.collision ? result : null);
    }, 400);
    return () => clearTimeout(timer);
  }, [step, selectedDoctorId, requestedDateTime, durationMinutes, checkCollision]);

  const patientList = useMemo(() => (searchResults || []).slice(0, 10), [searchResults]);
  const showPatientEmpty =
    patientSearch.trim().length >= 2 &&
    !searchLoading &&
    !searchError &&
    patientList.length === 0;

  const endTimeLabel = useMemo(() => {
    if (!requestedDateTime) return '';
    const end = new Date(requestedDateTime.getTime() + durationMinutes * 60 * 1000);
    return end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }, [requestedDateTime, durationMinutes]);

  const doctors = useMemo(() => {
    if (isDoctor) {
      return [{ id: user?.id, label: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Current doctor' }];
    }
    return (staff || []).map((doc) => ({
      id: doc.id,
      label: `${doc.first_name || ''} ${doc.last_name || ''}`.trim(),
    }));
  }, [isDoctor, staff, user?.first_name, user?.id, user?.last_name]);

  const doctorAvailability = useMemo(
    () => (step === 2 ? pickDoctorAvailability(availabilityMap, selectedDoctorId) : null),
    [step, availabilityMap, selectedDoctorId]
  );

  const availableDates = useMemo(
    () =>
      step === 2
        ? collectAvailableCalendarDates(doctorAvailability, {
            fromDate: new Date(),
            horizonDays: 120,
          })
        : [],
    [step, doctorAvailability]
  );

  const bookableTimes = useMemo(
    () =>
      step === 2 && dateValue
        ? collectBookableTimeSlots(dateValue, doctorAvailability, durationMinutes, {
            now: new Date(),
            appointments: appointmentsForBooking,
            doctorId: selectedDoctorId,
          })
        : [],
    [step, dateValue, doctorAvailability, durationMinutes, appointmentsForBooking, selectedDoctorId]
  );

  useEffect(() => {
    if (step !== 2) return;
    setTimeValue((t) => (t && bookableTimes.includes(t) ? t : ''));
  }, [step, bookableTimes]);

  const canGoStep2 = Boolean(selectedPatient && selectedDoctorId);
  const canGoStep3 =
    Boolean(
      dateValue &&
        timeValue &&
        durationMinutes &&
        bookableTimes.length > 0 &&
        bookableTimes.includes(timeValue)
    ) &&
    !liveCollision &&
    !isPastTimeToday;
  const canSubmit = Boolean(visitReason.trim()) && visitReason.length <= 300 && notes.length <= 500 && !loading;

  const currentDate = new Date().toISOString().slice(0, 10);

  const handleBook = async () => {
    setInlineError('');
    setSuccessMessage('');
    try {
      const result = await submit({
        patient_id: selectedPatient?.id,
        patient_name: selectedPatient?.name || selectedPatient?.patient,
        patient_phone: selectedPatient?.phone || '',
        doctor_id: selectedDoctorId,
        scheduled_for: requestedDateTime.toISOString(),
        duration_minutes: durationMinutes,
        appointment_type: appointmentType,
        visit_reason: visitReason.trim(),
        notes: notes.trim(),
      });
      if (result?.collision) {
        setInlineError(
          result?.noSlot
            ? 'Doctor is unavailable for this time slot. Choose another slot.'
            : 'Doctor has an appointment at this time. Choose another slot.'
        );
        return;
      }
      appendLog({
        staff: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || 'Provider',
        staff_id: user?.id,
        role: user?.role,
        module: 'Appointments',
        action: 'appointment_created',
        detail: JSON.stringify({
          patient_id: selectedPatient?.id,
          doctor_id: selectedDoctorId,
          scheduled_for: requestedDateTime.toISOString(),
          duration_minutes: durationMinutes,
          appointment_type: appointmentType,
        }),
        type: 'appointments',
      });
      const message = 'Appointment booked successfully.';
      setSuccessMessage(message);
      onSuccess?.(message);
      onClose?.();
    } catch (err) {
      setInlineError(err?.message || 'Unable to create appointment.');
    }
  };

  const headerTitle = step === 1 ? 'Patient & Doctor' : step === 2 ? 'Date, Time & Duration' : 'Type, Reason & Confirmation';

  return (
    <ResponsiveModal visible={visible} onClose={onClose}>
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep((v) => Math.max(1, v - 1))} style={styles.backBtn}>
            <Icon name="chevron-left" lib="feather" size={18} color={C.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: C.text }]}>{headerTitle}</Text>
          <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Step ${step} of 3`}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <Icon name="x" lib="feather" size={18} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <View>
            <Input
              label="Search patient"
              placeholder="Search by name, phone, or patient ID"
              value={patientSearch}
              onChangeText={setPatientSearch}
              icon="search"
            />
            {searchError ? (
              <Text style={[styles.searchError, { color: C.danger }]}>{searchError}</Text>
            ) : null}
            {searchLoading ? (
              <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Searching…</Text>
            ) : null}
            {selectedPatient ? (
              <View style={[styles.selectedChip, { backgroundColor: C.primaryLight }]}>
                <Text style={{ color: C.primary, flex: 1 }}>{selectedPatient?.name || selectedPatient?.patient}</Text>
                <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                  <Icon name="x" lib="feather" size={14} color={C.primary} />
                </TouchableOpacity>
              </View>
            ) : null}
            {showPatientEmpty ? (
              <Text style={{ color: C.textMuted, fontSize: 13, marginBottom: 12 }}>
                No patient matching those details.
              </Text>
            ) : null}
            <View style={{ marginBottom: 12 }}>
              {patientList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setSelectedPatient(item)}
                  style={[styles.listItem, { borderColor: C.border, backgroundColor: C.surface }]}
                >
                  <Text style={{ color: C.text, fontWeight: '600' }}>{item?.name || item?.patient}</Text>
                  <Text style={{ color: C.textMuted, fontSize: 11 }}>
                    {[item?.phone, item?.id].filter(Boolean).join(' · ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Doctor</Text>
            {loadingLookups ? (
              <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading doctors...</Text>
            ) : (
              <View style={styles.pillRow}>
                {doctors.map((doc) => (
                  <Btn
                    key={doc.id}
                    label={doc.label}
                    size="sm"
                    variant={selectedDoctorId === doc.id ? 'primary' : 'ghost'}
                    onPress={() => !isDoctor && setSelectedDoctorId(doc.id)}
                    style={{ marginRight: 8, marginBottom: 8 }}
                    disabled={isDoctor}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            {availabilityLoading ? (
              <Text style={{ color: C.textMuted, marginBottom: 12 }}>Loading schedule…</Text>
            ) : !doctorAvailability?.slots?.length ? (
              <Text style={{ color: C.warning, marginBottom: 12 }}>
                No weekly availability is configured for this doctor. Add slots under Availability before booking.
              </Text>
            ) : availableDates.length === 0 ? (
              <Text style={{ color: C.warning, marginBottom: 12 }}>
                No bookable days in the next few months for this doctor's schedule.
              </Text>
            ) : (
              <>
                <BookingDateGrid
                  availableDates={availableDates}
                  value={dateValue}
                  onChange={setDateValue}
                  minDateIso={currentDate}
                />
                <BookingTimeSlotList
                  label="Time"
                  times={bookableTimes}
                  value={timeValue}
                  onChange={setTimeValue}
                />
              </>
            )}
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 8 }}>Duration</Text>
            <View style={styles.pillRow}>
              {DURATIONS.map((mins) => (
                <Btn
                  key={mins}
                  label={`${mins} min`}
                  size="sm"
                  variant={durationMinutes === mins ? 'primary' : 'ghost'}
                  onPress={() => setDurationMinutes(mins)}
                  style={{ marginRight: 8, marginBottom: 8 }}
                />
              ))}
            </View>
            {endTimeLabel ? <Text style={{ color: C.textMuted, marginBottom: 8 }}>{`Ends at ${endTimeLabel}`}</Text> : null}
            {liveCollision?.collision ? (
              <Text style={{ color: C.warning, fontSize: 12 }}>
                {liveCollision?.noSlot
                  ? 'That slot is no longer available. Choose another time.'
                  : 'Doctor has another appointment at this time. Choose another slot.'}
              </Text>
            ) : null}
            {isPastTimeToday ? (
              <Text style={{ color: C.warning, fontSize: 12 }}>
                Selected time must be in the future.
              </Text>
            ) : null}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={{ color: C.textMuted, fontSize: 12, marginBottom: 6 }}>Appointment type</Text>
            <View style={styles.pillRow}>
              {['In Facility', 'Home Visit'].map((type) => (
                <Btn
                  key={type}
                  label={type}
                  size="sm"
                  variant={appointmentType === type ? 'primary' : 'ghost'}
                  onPress={() => setAppointmentType(type)}
                  style={{ marginRight: 8, marginBottom: 8 }}
                />
              ))}
            </View>
            <Input
              label="Visit reason"
              value={visitReason}
              onChangeText={setVisitReason}
              placeholder="Describe reason for visit"
            />
            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: -8, marginBottom: 10 }}>{`${visitReason.length}/300`}</Text>
            <Input
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes"
            />
            <Text style={{ color: C.textMuted, fontSize: 11, marginTop: -8, marginBottom: 10 }}>{`${notes.length}/500`}</Text>

            <View style={[styles.summaryCard, { borderColor: C.border, backgroundColor: C.surface }]}>
              <Text style={{ color: C.text, fontWeight: '700', marginBottom: 6 }}>Confirmation</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Patient: ${selectedPatient?.name || selectedPatient?.patient || '-'}`}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Doctor: ${(doctors.find((d) => d.id === selectedDoctorId)?.label) || '-'}`}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Date/Time: ${dateValue || '-'} ${timeValue || ''}`}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Duration: ${durationMinutes} min`}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Type: ${appointmentType}`}</Text>
              <Text style={{ color: C.textMuted, fontSize: 12 }}>{`Reason: ${visitReason || '-'}`}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {inlineError || error ? <Text style={{ color: C.danger, marginTop: 8 }}>{inlineError || error}</Text> : null}
      {successMessage ? <Text style={{ color: C.success, marginTop: 8 }}>{successMessage}</Text> : null}

      <View style={styles.footer}>
        {step < 3 ? (
          <Btn
            label="Next"
            onPress={() => setStep((v) => Math.min(3, v + 1))}
            full
            disabled={(step === 1 && !canGoStep2) || (step === 2 && !canGoStep3)}
          />
        ) : (
          <Btn label={loading ? 'Booking...' : 'Book Appointment'} onPress={handleBook} full disabled={!canSubmit} loading={loading} />
        )}
      </View>
    </ResponsiveModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  backBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 24,
    height: 24,
  },
  selectedChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  listItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  searchError: {
    fontSize: 13,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  footer: {
    marginTop: 10,
  },
});
