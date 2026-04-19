import { useCallback, useState } from 'react';
import { createAppointment, getAppointments, getAvailability } from '../api';
import { parseExistingDateTime, toMinutes } from '../utils/bookingAvailability';

function parseDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function useCreateAppointment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [collision, setCollision] = useState(null);

  const checkCollision = useCallback(async (payload) => {
    const { doctor_id, scheduled_for, duration_minutes } = payload || {};
    if (!doctor_id || !scheduled_for || !duration_minutes) {
      return { collision: false, conflictingAppointment: null };
    }

    const start = new Date(scheduled_for);
    const end = new Date(start.getTime() + Number(duration_minutes) * 60 * 1000);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { collision: false, conflictingAppointment: null };
    }

    const [appointments, availability] = await Promise.all([
      getAppointments(),
      getAvailability(),
    ]);

    const conflictingAppointment = (appointments || []).find((item) => {
      if (String(item?.doctor_id || '') !== String(doctor_id)) return false;
      const status = String(item?.status || '').toLowerCase();
      if (status !== 'confirmed') return false;
      const itemStart = parseExistingDateTime(item);
      if (!itemStart) return false;
      const itemEnd = new Date(itemStart.getTime() + Number(item?.duration_minutes || 30) * 60 * 1000);
      return start < itemEnd && end > itemStart;
    });

    if (conflictingAppointment) {
      return { collision: true, conflictingAppointment, noSlot: false };
    }

    const doctorAvailability = availability?.[doctor_id];
    if (doctorAvailability) {
      const day = start.toLocaleDateString('en-US', { weekday: 'short' });
      const requiredStart = toMinutes(start.toTimeString().slice(0, 5));
      const requiredEnd = requiredStart + Number(duration_minutes);
      const withinSlot = (doctorAvailability.slots || []).some((slot) => {
        if (String(slot?.day || '') !== day) return false;
        const slotStart = toMinutes(slot.start);
        const slotEnd = toMinutes(slot.end);
        return requiredStart >= slotStart && requiredEnd <= slotEnd;
      });
      if (!withinSlot) {
        return {
          collision: true,
          conflictingAppointment: null,
          noSlot: true,
        };
      }
    }

    return { collision: false, conflictingAppointment: null, noSlot: false };
  }, []);

  const submit = useCallback(
    async (payload) => {
      setLoading(true);
      setError('');
      setCollision(null);
      try {
        const check = await checkCollision(payload);
        if (check.collision) {
          setCollision(check);
          return { collision: true, conflictingAppointment: check.conflictingAppointment, noSlot: check.noSlot };
        }
        const created = await createAppointment(payload);
        setCollision(null);
        return created;
      } catch (err) {
        setError(err?.message || 'Unable to create appointment.');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [checkCollision]
  );

  return {
    submit,
    checkCollision,
    loading,
    error,
    collision,
    parseDateTime,
  };
}
