// ─── hooks/useAvailability.js ─────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  getAvailability, addAvailabilitySlot,
  removeAvailabilitySlot, toggleBlockDay, appendLog,
} from '../api';
import { MOCK_STAFF } from '../mock/data';
import { isOwnDataOnly } from '../config/roles';

export function useAvailability(user) {
  const [availability, setAvailability] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [selectedDoc,  setSelectedDoc]  = useState(null);
  const [addModalVis,  setAddModalVis]  = useState(false);

  const isDoctor = isOwnDataOnly(user?.role);
  const isRec    = user?.role === 'receptionist';
  const doctors  = MOCK_STAFF.filter(s => s.role === 'doctor');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAvailability();
      setAvailability(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeDocId = isDoctor ? user.id : selectedDoc;
  const schedule    = availability[activeDocId] || null;
  const setBy       = isRec ? 'receptionist' : 'self';

  const handleAddSlot = useCallback(async ({ day, start, end, type }) => {
    await addAvailabilitySlot({ doctorId: activeDocId, slot: { day, start, end, type, setBy } });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Availability', action: 'Schedule updated',
      detail: `${day} ${start}–${end} ${type} slot added${isRec ? ' by receptionist' : ''}`,
      type:   'availability',
    });
    await load();
  }, [activeDocId, user, setBy, isRec, load]);

  const handleRemoveSlot = useCallback(async (slotId) => {
    await removeAvailabilitySlot({ doctorId: activeDocId, slotId });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Availability', action: 'Slot removed',
      detail: `Slot ${slotId} removed from ${schedule?.doctor_name || activeDocId}`,
      type:   'availability',
    });
    await load();
  }, [activeDocId, user, schedule, load]);

  const handleToggleBlock = useCallback(async (day) => {
    await toggleBlockDay({ doctorId: activeDocId, day });
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Availability', action: 'Day toggled',
      detail: `${day} for ${schedule?.doctor_name || activeDocId}`,
      type:   'availability',
    });
    await load();
  }, [activeDocId, user, schedule, load]);

  return {
    availability, loading,
    selectedDoc, setSelectedDoc,
    addModalVis, setAddModalVis,
    isDoctor, isRec, doctors,
    activeDocId, schedule, setBy,
    handleAddSlot, handleRemoveSlot, handleToggleBlock,
  };
}
