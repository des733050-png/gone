// ─── hooks/usePatientDetail.js ────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  getPatientConsultations, addConsultation,
  updateConsultation, cancelPrescription, appendLog,
  getClinicalSettings, getLabResults, getAppointments, getPrescriptions,
} from '../api';
import { roleCapabilities } from '../constants/emr';

export function usePatientDetail(patient, user) {
  const [consultations,  setConsultations]  = useState([]);
  const [prescriptions,  setPrescriptions]  = useState([]);
  const [editWindowHrs,  setEditWindowHrs]  = useState(24);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [activeTab,      setActiveTab]      = useState('overview');
  const [consultModal,   setConsultModal]   = useState({ visible: false, existing: null });
  const [patientLabs,    setPatientLabs]    = useState([]);
  const [patientAppts,   setPatientAppts]   = useState([]);

  const caps         = roleCapabilities(user?.role);

  // Load admin-configured edit window
  useEffect(() => {
    getClinicalSettings()
      .then(s => { if (s?.edit_window_hours) setEditWindowHrs(s.edit_window_hours); })
      .catch(() => {});
  }, []);

  const loadConsultations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [consults, labs, appts, rxs] = await Promise.all([
        getPatientConsultations(patient?.id),
        getLabResults().catch(() => []),
        getAppointments().catch(() => []),
        getPrescriptions().catch(() => []),
      ]);
      setConsultations(consults || []);
      setPatientLabs((labs || []).filter((l) => l.patient_id === patient?.id || l.patient === patient?.name));
      setPatientAppts((appts || []).filter((a) => a.patient_id === patient?.id || a.patient === patient?.name));
      setPrescriptions((rxs || []).filter((r) => r.patient_id === patient?.id || r.patient === patient?.name));
    } catch (err) {
      setError(err?.message || 'Unable to load patient detail.');
    } finally {
      setLoading(false);
    }
  }, [patient?.id, patient?.name]);

  useEffect(() => {
    loadConsultations();
  }, [loadConsultations]);

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
    error,
    // derived
    caps, patientLabs, patientAppts, timeline, TABS,
    // actions
    handleCancelRx, handleSaveConsultation,
  };
}
