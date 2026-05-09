// ─── screens/Auth/Onboarding/VerificationGateScreen.js ───────────────────────
//
// STATE MACHINE — what the user sees per verification_status:
//
//  UNVERIFIED  → Instructions card + upload rows (Select / Replace / Remove)
//                + Submit button. No banner.
//
//  PENDING     → "Under review" banner. Document rows shown as locked read-only
//                tiles (no upload controls, no instructions, no Submit).
//
//  REJECTED    → Rejection banner + reviewer note. Instructions card returns.
//                Upload rows re-enabled so admin can replace & resubmit.
//
//  VERIFIED    → Full-screen success splash. onUnlock() fires immediately AND
//                after a 2 s delay so the animation is visible. No other UI.
//
// UPLOAD FLOW (UNVERIFIED / REJECTED only):
//  • pickFile()        — stages a file locally. Zero network calls.
//  • removeStaged()    — discards a staged file before submission.
//  • submitDocuments() — uploads staged files sequentially then refreshes.
//
// Polls every 15 s so PENDING → VERIFIED auto-transitions without manual refresh.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Platform, ActivityIndicator, Animated,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { Btn } from '../../../atoms/Btn';
import { Icon } from '../../../atoms/Icon';
import {
  getVerificationStatus,
  uploadVerificationDocument,
  deleteVerificationDocument,
  logoutProvider,
} from '../../../api';

let GONEP_LOGO = null;
try { GONEP_LOGO = require('../../../../assets/GONEP Logo.png'); } catch (_) {}

// ─── Document catalogue ───────────────────────────────────────────────────────
const DOC_TYPES = [
  {
    id: 'REGISTRATION_CERTIFICATE',
    label: 'Registration certificate',
    desc: 'Ministry of Health registration document',
    whyNeeded:
      'Confirms the facility is officially registered with the Ministry of Health and ' +
      'authorised to operate as a health facility in Kenya. Upload the original certificate ' +
      'issued at registration or the most recent renewal.',
    icon: 'file-text',
    required: true,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG',
    maxSizeMB: 10,
  },
  {
    id: 'OPERATING_LICENSE',
    label: 'Operating licence',
    desc: 'Current licence to operate as a health facility',
    whyNeeded:
      'Proves the facility holds a valid, current licence to provide healthcare services. ' +
      'An expired licence will be rejected — please upload the latest renewal letter or certificate.',
    icon: 'award',
    required: true,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG',
    maxSizeMB: 10,
  },
  {
    id: 'TAX_COMPLIANCE',
    label: 'Tax compliance certificate',
    desc: 'KRA tax compliance certificate',
    whyNeeded:
      'Required by GONEP policy to confirm the facility is compliant with the Kenya Revenue ' +
      'Authority. Certificates must be current (not expired). Download a fresh copy from the ' +
      'KRA iTax portal if yours has lapsed.',
    icon: 'briefcase',
    required: true,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG',
    maxSizeMB: 10,
  },
  {
    id: 'ACCREDITATION',
    label: 'Accreditation certificate',
    desc: 'KENAS or relevant body accreditation',
    whyNeeded:
      'Optional but strongly recommended. Accreditation from KENAS or an equivalent recognised ' +
      'body strengthens your application and may accelerate the review.',
    icon: 'shield',
    required: false,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG',
    maxSizeMB: 10,
  },
];

const POLL_MS          = 15_000;
const MAX_NAME_DISPLAY = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const truncateName = (name = '', max = MAX_NAME_DISPLAY) => {
  if (name.length <= max) return name;
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  return `${name.slice(0, max - ext.length - 3)}…${ext}`;
};

const formatBytes = (b = 0) => {
  if (b < 1024)        return `${b} B`;
  if (b < 1048576)     return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const validateFile = (f, docType) => {
  if (f.size && f.size > docType.maxSizeMB * 1048576)
    return `File too large (${formatBytes(f.size)}). Max is ${docType.maxSizeMB} MB.`;
  const mime = f.mimeType || f.type || '';
  if (mime && !docType.accept.includes(mime))
    return `"${mime}" is not accepted here. Please upload ${docType.acceptLabel}.`;
  return null;
};

// ─── Verified splash ──────────────────────────────────────────────────────────
// Shown instead of the whole upload UI the moment verification_status = VERIFIED.
// Calls onUnlock after a short delay so the animation is visible.
function VerifiedSplash({ onUnlock, C }) {
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Give the admin a moment to see the success state, then open the portal
    const t = setTimeout(() => onUnlock?.(), 2200);
    return () => clearTimeout(t);
  }, [onUnlock, scale, opacity]);

  return (
    <Animated.View style={[s.splash, { opacity }]}>
      <Animated.View style={[s.splashIconWrap, {
        backgroundColor: `${C.success}18`,
        borderColor:     `${C.success}35`,
        transform:       [{ scale }],
      }]}>
        <Icon name="check-circle" lib="feather" size={52} color={C.success} />
      </Animated.View>

      <Text style={[s.splashTitle, { color: C.text }]}>Facility verified!</Text>
      <Text style={[s.splashSub,   { color: C.textSec }]}>
        Your facility has been approved by GONEP.{'\n'}
        Full portal access is now unlocked.
      </Text>

      <ActivityIndicator color={C.success} style={{ marginTop: 28 }} />
      <Text style={[s.splashHint, { color: C.textMuted }]}>Opening your dashboard…</Text>

      <Btn
        label="Continue to portal →"
        full
        onPress={onUnlock}
        style={{ marginTop: 24 }}
      />
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function VerificationGateScreen({ user, onUnlock, onLogout }) {
  const { C } = useTheme();

  // Server state
  const [status,      setStatus]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [globalError, setGlobalError] = useState('');

  // Local staging — { [docTypeId]: { file, name, size, mimeType, uri } }
  const [staged,      setStaged]      = useState({});
  const [fileErrors,  setFileErrors]  = useState({});  // { [docTypeId]: string }
  const [pickingId,   setPickingId]   = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  // Submit button pulse when all required docs staged
  const submitPulse = useRef(new Animated.Value(1)).current;

  // ── Fetch / refresh ─────────────────────────────────────────────────────────
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setGlobalError('');
    try {
      const res  = await getVerificationStatus();
      const data = res?.data || res;
      setStatus(data);
      // onUnlock is also called by VerifiedSplash after animation — this handles
      // the case where status is VERIFIED on initial load (no animation needed).
      if (data?.verification_status === 'VERIFIED') onUnlock?.();
    } catch (e) {
      if (!silent) setGlobalError(e?.message || 'Could not load verification status.');
    } finally {
      setLoading(false);
    }
  }, [onUnlock]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Poll while not yet VERIFIED ──────────────────────────────────────────────
  useEffect(() => {
    if (status?.verification_status === 'VERIFIED') return;
    const id = setInterval(() => refresh(true), POLL_MS);
    return () => clearInterval(id);
  }, [status?.verification_status, refresh]);

  // ── Submit button pulse animation ────────────────────────────────────────────
  const requiredIds       = DOC_TYPES.filter((d) => d.required).map((d) => d.id);
  const allRequiredStaged = requiredIds.every((id) => !!staged[id]);

  useEffect(() => {
    if (!allRequiredStaged) { submitPulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(submitPulse, { toValue: 1.025, duration: 750, useNativeDriver: true }),
      Animated.timing(submitPulse, { toValue: 1,     duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [allRequiredStaged, submitPulse]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const vs = status?.verification_status || 'UNVERIFIED';

  // Docs the server already holds — persists across reloads.
  // API must return: submitted_document_types: string[]
  // Optionally:      submitted_document_names: { [docTypeId]: string }
  const serverSubmitted     = Array.isArray(status?.submitted_document_types)
    ? status.submitted_document_types : [];
  const serverSubmittedNames = status?.submitted_document_names || {};

  // Only UNVERIFIED and REJECTED allow uploads
  const canUpload  = !!status?.can_upload_verification_documents;
  const stagedCount = Object.keys(staged).length;
  const missingCount = requiredIds.filter(
    (id) => !staged[id] && !serverSubmitted.includes(id),
  ).length;

  // Banner shown for PENDING and REJECTED only
  const BANNERS = {
    PENDING: {
      color: 'primary', icon: 'clock',
      title: 'Verification under review',
      msg: 'The GONEP team typically reviews submissions within 2–3 business days. We will notify you here and by email.',
    },
    REJECTED: {
      color: 'danger', icon: 'x-circle',
      title: 'Verification rejected',
      msg: 'Review the feedback below, replace the flagged documents and resubmit.',
    },
  };
  const banner = BANNERS[vs] || null;

  // ── Colour helpers ───────────────────────────────────────────────────────────
  const bc  = (k) => ({ success: C.success, primary: C.primary, danger: C.danger, warning: C.warning }[k] || C.primary);
  const bcl = (k) => ({ success: C.successLight, primary: C.primaryLight, danger: C.dangerLight, warning: C.warningLight }[k] || C.primaryLight);

  // ── pickFile ─────────────────────────────────────────────────────────────────
  const pickFile = async (docType) => {
    if (!canUpload || pickingId) return;
    setFileErrors((p) => ({ ...p, [docType.id]: undefined }));
    setPickingId(docType.id);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: docType.accept,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result?.canceled) return;
      const f = result?.assets?.[0];
      if (!f?.uri) return;

      const err = validateFile(f, docType);
      if (err) { setFileErrors((p) => ({ ...p, [docType.id]: err })); return; }

      const fileObj = (Platform.OS === 'web' && f.file)
        ? f.file
        : { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream', size: f.size };

      setStaged((p) => ({
        ...p,
        [docType.id]: { file: fileObj, name: f.name || 'document', size: f.size || 0, mimeType: f.mimeType || '', uri: f.uri },
      }));
    } catch (e) {
      setFileErrors((p) => ({ ...p, [docType.id]: e?.message || 'Could not open the file picker.' }));
    } finally {
      setPickingId(null);
    }
  };

  // ── removeStaged ─────────────────────────────────────────────────────────────
  const removeStaged = (id) => {
    setStaged((p) => { const n = { ...p }; delete n[id]; return n; });
    setFileErrors((p) => ({ ...p, [id]: undefined }));
  };

  // ── submitDocuments ──────────────────────────────────────────────────────────
  // Atomic batch: all staged files upload together or none are kept on the server.
  // If any upload fails, succeeded docs are rolled back (deleted from server) and
  // all files remain staged so the user can fix and retry the full set.
  const submitDocuments = async () => {
    if (submitting || !canUpload) return;
    const toUpload = DOC_TYPES.filter((d) => staged[d.id]);
    if (!toUpload.length) {
      setGlobalError('Please select at least one document before submitting.');
      return;
    }
    setSubmitting(true);
    setGlobalError('');
    setFileErrors({});

    const succeeded = []; // doc type IDs that uploaded successfully this run
    let anyError = false;

    for (const docType of toUpload) {
      setUploadingId(docType.id);
      try {
        await uploadVerificationDocument({ documentType: docType.id, file: staged[docType.id].file });
        succeeded.push(docType.id);
        // DO NOT clear staged here — wait until the whole batch succeeds.
      } catch (e) {
        anyError = true;
        setFileErrors((p) => ({ ...p, [docType.id]: e?.message || 'Upload failed. Please try again.' }));
      }
    }

    setUploadingId(null);
    setSubmitting(false);

    if (anyError) {
      // Roll back every document that did upload so the server stays in sync.
      for (const id of succeeded) {
        try { await deleteVerificationDocument(id); } catch (_) {}
      }
      // Keep ALL staged files — user must fix and resubmit the full set.
      setGlobalError(
        'Some files could not be uploaded. All uploads were rolled back — fix the errors shown and resubmit.',
      );
      await refresh(true);
    } else {
      // Full success: clear local staging, refresh to show server-side state.
      setStaged({});
      await refresh();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // ── VERIFIED → show only the success splash, nothing else ───────────────────
  if (!loading && vs === 'VERIFIED') {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <View style={s.splashOuter}>
          {/* Logo stays visible for brand continuity */}
          <View style={s.logoWrap}>
            {GONEP_LOGO
              ? <Image source={GONEP_LOGO} style={s.logoImg} resizeMode="contain" />
              : <View style={[s.logoIcon, { backgroundColor: C.primary }]}>
                  <Icon name="hospital-building" lib="mc" size={28} color="#fff" />
                </View>
            }
            <Text style={[s.logoTitle, { color: C.text }]}>GONEP Healthcare</Text>
          </View>
          <VerifiedSplash onUnlock={onUnlock} C={C} />
        </View>
      </View>
    );
  }

  // ── All other states ─────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.inner}>

          {/* Logo */}
          <View style={s.logoWrap}>
            {GONEP_LOGO
              ? <Image source={GONEP_LOGO} style={s.logoImg} resizeMode="contain" />
              : <View style={[s.logoIcon, { backgroundColor: C.primary }]}>
                  <Icon name="hospital-building" lib="mc" size={28} color="#fff" />
                </View>
            }
            <Text style={[s.logoTitle, { color: C.text }]}>GONEP Healthcare</Text>
            <Text style={[s.logoSub,   { color: C.primary }]}>Facility Verification</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* ── Banner: PENDING or REJECTED only ── */}
              {!!banner && (
                <View style={[s.banner, { backgroundColor: bcl(banner.color), borderColor: bc(banner.color) }]}>
                  <Icon name={banner.icon} lib="feather" size={20} color={bc(banner.color)} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.bannerTitle, { color: bc(banner.color) }]}>{banner.title}</Text>
                    <Text style={[s.bannerMsg,   { color: C.textSec }]}>{banner.msg}</Text>
                    {/* Rejection reason */}
                    {!!status?.rejection_reason && vs === 'REJECTED' && (
                      <View style={[s.rejBox, { backgroundColor: `${C.danger}10`, borderColor: `${C.danger}30` }]}>
                        <Icon name="alert-circle" lib="feather" size={12} color={C.danger} style={{ marginTop: 1 }} />
                        <Text style={[s.rejText, { color: C.danger }]}>
                          Reviewer note: {status.rejection_reason}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => refresh()} hitSlop={12} style={{ padding: 4 }}>
                    <Icon name="refresh-cw" lib="feather" size={14} color={bc(banner.color)} />
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Instructions — only when uploads are open ── */}
              {canUpload && (
                <View style={[s.instrCard, { backgroundColor: C.card, borderColor: C.border }]}>
                  <View style={s.instrRow}>
                    <View style={[s.stepBadge, { backgroundColor: `${C.primary}16` }]}>
                      <Text style={[s.stepNum, { color: C.primary }]}>1</Text>
                    </View>
                    <Text style={[s.instrText, { color: C.textSec }]}>
                      Tap <Text style={{ fontWeight: '700', color: C.text }}>Select file</Text> on
                      each row to choose a document from your device.{' '}
                      <Text style={{ color: C.text }}>Nothing is uploaded yet.</Text>{' '}
                      Tap again to replace the wrong file.
                    </Text>
                  </View>
                  <View style={[s.instrDivider, { backgroundColor: C.border }]} />
                  <View style={s.instrRow}>
                    <View style={[s.stepBadge, { backgroundColor: `${C.primary}16` }]}>
                      <Text style={[s.stepNum, { color: C.primary }]}>2</Text>
                    </View>
                    <Text style={[s.instrText, { color: C.textSec }]}>
                      Once satisfied, tap{' '}
                      <Text style={{ fontWeight: '700', color: C.text }}>Submit documents</Text>.
                      {' '}All files are sent to GONEP for review at once.
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Document rows ── */}
              <View style={[s.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[s.cardTitle, { color: C.text }]}>Verification documents</Text>
                <Text style={[s.cardDesc,  { color: C.textMuted }]}>
                  {canUpload
                    ? 'Select all required (*) documents. Files stay on your device until you tap Submit.'
                    : vs === 'PENDING'
                      ? 'Your documents are locked while the review is in progress.'
                      : 'Documents submitted and awaiting review.'}
                </Text>

                {DOC_TYPES.map((doc, idx) => {
                  const stagedEntry = staged[doc.id];
                  const onServer    = serverSubmitted.includes(doc.id);
                  const serverName  = serverSubmittedNames[doc.id] || null;
                  const hasStaged   = !!stagedEntry;
                  const isPicking   = pickingId  === doc.id;
                  const isUploading = uploadingId === doc.id;
                  const rowError    = fileErrors[doc.id];
                  const isLast      = idx === DOC_TYPES.length - 1;
                  const isPending   = vs === 'PENDING';

                  let rowBorder = C.border;
                  let rowBg     = C.surface;
                  if      (rowError)  { rowBorder = C.danger;  rowBg = `${C.danger}07`;  }
                  else if (hasStaged) { rowBorder = C.primary; rowBg = `${C.primary}05`; }
                  else if (onServer)  { rowBorder = C.success; rowBg = C.successLight;   }

                  return (
                    <View key={doc.id}>
                      <View style={[s.docRow, { borderColor: rowBorder, backgroundColor: rowBg }]}>

                        {/* Icon */}
                        <View style={[s.docIconWrap, {
                          backgroundColor: onServer
                            ? `${C.success}20`
                            : hasStaged ? `${C.primary}14` : `${C.textMuted}10`,
                        }]}>
                          {isUploading
                            ? <ActivityIndicator size="small" color={C.primary} />
                            : <Icon
                                name={onServer ? 'check-circle' : doc.icon}
                                lib="feather" size={18}
                                color={onServer ? C.success : hasStaged ? C.primary : C.textMuted}
                              />
                          }
                        </View>

                        {/* Text */}
                        <View style={s.docMeta}>
                          <Text style={[s.docLabel, { color: C.text }]}>
                            {doc.label}
                            {doc.required
                              ? <Text style={{ color: C.danger }}> *</Text>
                              : <Text style={{ color: C.textMuted, fontWeight: '400', fontSize: 11 }}> (optional)</Text>
                            }
                          </Text>

                          <Text style={[s.docDesc, { color: C.textMuted }]}>{doc.desc}</Text>

                          {/* Why this document is needed */}
                          <View style={[s.whyBox, { backgroundColor: `${C.primary}07`, borderColor: `${C.primary}16` }]}>
                            <Icon name="info" lib="feather" size={11} color={C.primary} style={{ marginTop: 1, flexShrink: 0 }} />
                            <Text style={[s.whyText, { color: C.textSec }]}>{doc.whyNeeded}</Text>
                          </View>

                          {/* PENDING: locked submitted chip */}
                          {isPending && onServer && (
                            <View style={[s.chip, { backgroundColor: `${C.success}10`, borderColor: `${C.success}28` }]}>
                              <Icon name="lock" lib="feather" size={10} color={C.success} style={{ marginRight: 4 }} />
                              <Text style={[s.chipText, { color: C.success }]}>
                                {serverName ? truncateName(serverName) : 'Submitted — awaiting review'}
                              </Text>
                            </View>
                          )}

                          {/* PENDING: not submitted chip */}
                          {isPending && !onServer && (
                            <View style={[s.chip, { backgroundColor: `${C.warning}10`, borderColor: `${C.warning}28` }]}>
                              <Icon name="alert-triangle" lib="feather" size={10} color={C.warning} style={{ marginRight: 4 }} />
                              <Text style={[s.chipText, { color: C.warning }]}>Not submitted</Text>
                            </View>
                          )}

                          {/* UPLOAD MODE: staged file chip */}
                          {!isPending && hasStaged && (
                            <View style={[s.chip, { backgroundColor: `${C.primary}10`, borderColor: `${C.primary}28` }]}>
                              <Icon name="paperclip" lib="feather" size={10} color={C.primary} style={{ marginRight: 4 }} />
                              <Text style={[s.chipText, { color: C.primary }]} numberOfLines={1}>
                                {truncateName(stagedEntry.name)}
                                {!!stagedEntry.size && ` (${formatBytes(stagedEntry.size)})`}
                              </Text>
                            </View>
                          )}

                          {/* UPLOAD MODE: already on server (e.g. REJECTED resubmit) */}
                          {!isPending && onServer && !hasStaged && (
                            <View style={[s.chip, { backgroundColor: `${C.success}10`, borderColor: `${C.success}28` }]}>
                              <Icon name="check" lib="feather" size={10} color={C.success} style={{ marginRight: 4 }} />
                              <Text style={[s.chipText, { color: C.success }]}>
                                {serverName ? truncateName(serverName) : 'Previously submitted'}
                                {' '}— tap Replace to update
                              </Text>
                            </View>
                          )}

                          {/* Per-file error */}
                          {!!rowError && (
                            <View style={s.fileErrRow}>
                              <Icon name="alert-triangle" lib="feather" size={11} color={C.danger} style={{ marginRight: 4, flexShrink: 0 }} />
                              <Text style={[s.fileErrText, { color: C.danger }]}>{rowError}</Text>
                            </View>
                          )}
                        </View>

                        {/* Action buttons — upload mode only */}
                        {!isPending && (
                          <View style={s.docActions}>
                            <TouchableOpacity
                              onPress={() => pickFile(doc)}
                              disabled={!canUpload || isPicking || submitting}
                              activeOpacity={0.75}
                              style={[s.selectBtn, {
                                borderColor:     rowError ? C.danger : hasStaged ? C.primary : C.border,
                                backgroundColor: hasStaged ? `${C.primary}10` : C.bg,
                                opacity: (!canUpload || submitting) ? 0.45 : 1,
                              }]}
                            >
                              {isPicking
                                ? <ActivityIndicator size="small" color={C.primary} />
                                : <>
                                    <Icon
                                      name={(hasStaged || onServer) ? 'refresh-cw' : 'upload'}
                                      lib="feather" size={12}
                                      color={rowError ? C.danger : (hasStaged || onServer) ? C.primary : C.textMuted}
                                      style={{ marginRight: 4 }}
                                    />
                                    <Text style={[s.selectLabel, {
                                      color: rowError ? C.danger : (hasStaged || onServer) ? C.primary : C.textMuted,
                                    }]}>
                                      {(hasStaged || onServer) ? 'Replace' : 'Select file'}
                                    </Text>
                                  </>
                              }
                            </TouchableOpacity>

                            {hasStaged && !submitting && (
                              <TouchableOpacity
                                onPress={() => removeStaged(doc.id)}
                                style={[s.removeBtn, { borderColor: `${C.danger}38` }]}
                                hitSlop={8} activeOpacity={0.75}
                              >
                                <Icon name="x" lib="feather" size={12} color={C.danger} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Format hint */}
                      {!isPending && (
                        <Text style={[s.acceptHint, { color: C.textMuted }]}>
                          Accepted: {doc.acceptLabel} · Max {doc.maxSizeMB} MB
                        </Text>
                      )}

                      {!isLast && <View style={[s.rowSep, { backgroundColor: C.border }]} />}
                    </View>
                  );
                })}

                {/* Global error */}
                {!!globalError && (
                  <View style={[s.globalErr, { backgroundColor: `${C.danger}09`, borderColor: `${C.danger}28` }]}>
                    <Icon name="alert-circle" lib="feather" size={13} color={C.danger} style={{ marginRight: 6 }} />
                    <Text style={[s.globalErrText, { color: C.danger }]}>{globalError}</Text>
                  </View>
                )}

                {/* Submit button — upload mode only */}
                {canUpload && (
                  <Animated.View style={[s.submitWrap, { transform: [{ scale: submitPulse }] }]}>
                    <Btn
                      label={
                        submitting && uploadingId
                          ? `Uploading ${DOC_TYPES.findIndex((d) => d.id === uploadingId) + 1} of ${stagedCount}…`
                          : 'Submit documents'
                      }
                      full
                      onPress={submitDocuments}
                      disabled={submitting || stagedCount === 0}
                      variant={allRequiredStaged ? 'primary' : 'ghost'}
                    />
                  </Animated.View>
                )}

                {/* Staged count hint */}
                {canUpload && stagedCount > 0 && !submitting && (
                  <Text style={[s.stagedHint, { color: C.textMuted }]}>
                    {stagedCount} file{stagedCount !== 1 ? 's' : ''} selected
                    {allRequiredStaged
                      ? ' — all required documents ready to submit.'
                      : ` — ${missingCount} required document${missingCount !== 1 ? 's' : ''} still missing.`}
                  </Text>
                )}
              </View>

              {/* Footer */}
              <View style={s.footer}>
                <Btn label="Refresh status" variant="ghost" onPress={() => refresh()}
                  style={[s.footerBtn, { borderColor: C.border }]} />
                <Btn label="Sign out" variant="ghost"
                  onPress={async () => { try { await logoutProvider(); } catch (_) {} onLogout?.(); }}
                  style={[s.footerBtn, { borderColor: C.border }]} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1 },
  scroll:       { flexGrow: 1, padding: 20, paddingBottom: 44 },
  inner:        { maxWidth: 580, width: '100%', alignSelf: 'center' },

  // Logo
  logoWrap:     { alignItems: 'center', marginBottom: 22 },
  logoImg:      { width: 72, height: 72, marginBottom: 8 },
  logoIcon:     { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoTitle:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  logoSub:      { fontSize: 12, fontWeight: '600', marginTop: 2 },

  // Verified splash
  splashOuter:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  splash:       { width: '100%', maxWidth: 420, alignItems: 'center' },
  splashIconWrap:{ width: 110, height: 110, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  splashTitle:  { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10 },
  splashSub:    { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  splashHint:   { fontSize: 12, marginTop: 8 },

  // Banner
  banner:       { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 14 },
  bannerTitle:  { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  bannerMsg:    { fontSize: 12, lineHeight: 17 },
  rejBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 10 },
  rejText:      { fontSize: 12, lineHeight: 16, flex: 1, fontStyle: 'italic' },

  // Instructions
  instrCard:    { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, gap: 10 },
  instrRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepBadge:    { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNum:      { fontSize: 13, fontWeight: '800' },
  instrText:    { flex: 1, fontSize: 12, lineHeight: 18, paddingTop: 3 },
  instrDivider: { height: 1 },

  // Card
  card:         { borderWidth: 1, borderRadius: 16, padding: 18 },
  cardTitle:    { fontSize: 16, fontWeight: '800', marginBottom: 4, letterSpacing: -0.2 },
  cardDesc:     { fontSize: 12, lineHeight: 17, marginBottom: 16 },

  // Doc rows
  docRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  docIconWrap:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  docMeta:      { flex: 1, gap: 2 },
  docLabel:     { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  docDesc:      { fontSize: 11, lineHeight: 15 },

  // Why box
  whyBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 6, borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 6 },
  whyText:      { flex: 1, fontSize: 11, lineHeight: 16, fontStyle: 'italic' },

  // Generic chip (submitted / staged / warning)
  chip:         { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 7, maxWidth: '100%' },
  chipText:     { fontSize: 11, fontWeight: '600', flexShrink: 1 },

  // Per-file error
  fileErrRow:   { flexDirection: 'row', alignItems: 'flex-start', marginTop: 5 },
  fileErrText:  { fontSize: 11, lineHeight: 15, flex: 1 },

  // Actions
  docActions:   { flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  selectBtn:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, minWidth: 100, justifyContent: 'center' },
  selectLabel:  { fontSize: 12, fontWeight: '600' },
  removeBtn:    { borderWidth: 1, borderRadius: 8, padding: 6, alignItems: 'center', justifyContent: 'center' },

  // Hints
  acceptHint:   { fontSize: 10, marginTop: 6, marginBottom: 12, marginLeft: 2 },
  rowSep:       { height: 1, marginBottom: 12 },

  // Global error
  globalErr:    { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 14 },
  globalErrText:{ flex: 1, fontSize: 12, lineHeight: 17 },

  // Submit
  submitWrap:   { marginTop: 20 },
  stagedHint:   { fontSize: 11, textAlign: 'center', marginTop: 8 },

  // Footer
  footer:       { flexDirection: 'row', marginTop: 14, gap: 10 },
  footerBtn:    { flex: 1 },
});