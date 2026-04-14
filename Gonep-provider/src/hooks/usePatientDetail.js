// ─── hooks/usePatientDetail.js ────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  getPatientConsultations, addConsultation,
  updateConsultation, cancelPrescription, appendLog,
  getClinicalSettings,
} from '../api';
import { MOCK_LAB, MOCK_APPOINTMENTS } from '../mock/data';
import { roleCapabilities } from '../constants/emr';

export function usePatientDetail(patient, user) {
  const [consultations,  setConsultations]  = useState([]);
  const [prescriptions,  setPrescriptions]  = useState([]);
  const [editWindowHrs,  setEditWindowHrs]  = useState(24);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('overview');
  const [consultModal,   setConsultModal]   = useState({ visible: false, existing: null });

  const caps         = roleCapabilities(user?.role);
  const patientLabs  = MOCK_LAB.filter(l => l.patient === patient?.name);
  const patientAppts = MOCK_APPOINTMENTS.filter(a => a.patient === patient?.name);

  // Load admin-configured edit window
  useEffect(() => {
    getClinicalSettings()
      .then(s => { if (s?.edit_window_hours) setEditWindowHrs(s.edit_window_hours); })
      .catch(() => {});
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
    const { MOCK_PRESCRIPTIONS: rxs } = require('../mock/data');
    setPrescriptions(rxs.filter(r => r.patient === patient?.name));
  }, [loadConsultations, patient]);

  const handleCancelRx = useCallback(async (rxId) => {
    await cancelPrescription(rxId);
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'Prescription', action: 'Rx cancelled',
      detail: `${prescriptions.find(r => r.id === rxId)?.drug} for ${patient?.name}`,
      type: 'rx',
    });
    setPrescriptions(prev => prev.map(r => r.id === rxId ? { ...r, status: 'cancelled' } : r));
  }, [user, patient, prescriptions]);

  const handleSaveConsultation = useCallback(async (payload, existing) => {
    const isEdit = !!existing;
    if (isEdit) {
      await updateConsultation(existing.id, payload);
    } else {
      await addConsultation({
        ...payload,
        patient_name:   patient.name,
        doctor_id:      user.id,
        doctor_name:    `${user.first_name} ${user.last_name}`,
        date:           'Today',
        appointment_id: null,
        uploaded_files: [],
      });
    }
    appendLog({
      staff: `${user.first_name} ${user.last_name}`, staff_id: user.id, role: user.role,
      module: 'EMR',
      action: isEdit ? 'Consultation note edited' : 'Consultation note added',
      detail: patient.name,
      type:   'emr',
    });
    await loadConsultations();
  }, [patient, user, loadConsultations]);

  // Build timeline
  const timeline = [
    ...consultations.map(c => ({ ...c, _type: 'consultation', _date: c.date })),
    ...patientLabs.map(l =>   ({ ...l, _type: 'lab',          _date: l.date })),
    ...prescriptions.map(r => ({ ...r, _type: 'rx',           _date: r.date })),
    ...patientAppts.map(a => ({ ...a, _type: 'appointment',   _date: a.date })),
  ];

  const TABS = [
    { id: 'overview',      label: 'Overview'  },
    { id: 'consultations', label: 'Notes'     },
    { id: 'prescriptions', label: 'Rx'        },
    caps.canSeeLab   && { id: 'lab',          label: 'Lab'     },
    caps.canSeeAppts && { id: 'appointments', label: 'Visits'  },
    { id: 'timeline',      label: 'Timeline'  },
  ].filter(Boolean);

  return {
    // state
    consultations, prescriptions, editWindowHrs,
    loading, activeTab, setActiveTab,
    consultModal, setConsultModal,
    // derived
    caps, patientLabs, patientAppts, timeline, TABS,
    // actions
    handleCancelRx, handleSaveConsultation,
  };
}
