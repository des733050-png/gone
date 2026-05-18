// ─── VerificationDashboard.js ─────────────────────────────────────────────────
//
// Full-width, dashboard-native verification page.
// Rendered inside MainShell's main content area when the facility is not yet
// VERIFIED or has been SUSPENDED.
//
// States:
//   UNVERIFIED  → Hero + progress (step 3) + upload grid + status panel
//   PENDING     → Locked upload grid + "Under review" status panel (step 4)
//   REJECTED    → Upload grid re-enabled + rejection reason + instructions
//   VERIFIED    → Animated "Approved!" fullscreen overlay with CTA (step 5)
//   SUSPENDED   → Suspended warning hero (no upload section)
//
// Upload logic is the same as the original VerificationGateScreen:
//   - Files staged locally, zero network until Submit is pressed
//   - Sequential per-doc upload with per-file error tracking
//   - Failed batch rolled back (succeeded docs deleted) — user fixes and retries
//   - 15-second poll while PENDING → auto-transitions to VERIFIED
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme }      from '../../../theme/ThemeContext';
import { useResponsive } from '../../../theme/responsive';
import { Btn }           from '../../../atoms/Btn';
import { Icon }          from '../../../atoms/Icon';
import {
  getVerificationStatus,
  uploadVerificationDocument,
  deleteVerificationDocument,
  getCurrentUser,
} from '../../../api';
import { normalizeRole } from '../../../config/roles';

// ─── Document catalogue ───────────────────────────────────────────────────────
const DOC_TYPES = [
  {
    id: 'REGISTRATION_CERTIFICATE',
    label: 'Registration certificate',
    desc: 'Ministry of Health registration document',
    whyNeeded:
      'Confirms the facility is officially registered with the Ministry of Health ' +
      'and authorised to operate as a health facility in Kenya.',
    icon: 'file-text',
    required: true,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG · max 10 MB',
    maxSizeMB: 10,
  },
  {
    id: 'OPERATING_LICENSE',
    label: 'Operating licence',
    desc: 'Current licence to operate as a health facility',
    whyNeeded:
      'Proves the facility holds a valid, current licence to provide healthcare ' +
      'services. An expired licence will be rejected — upload the latest renewal.',
    icon: 'award',
    required: true,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG · max 10 MB',
    maxSizeMB: 10,
  },
  {
    id: 'TAX_COMPLIANCE',
    label: 'Tax compliance certificate',
    desc: 'KRA tax compliance certificate',
    whyNeeded:
      'Required to confirm the facility is compliant with the Kenya Revenue ' +
      'Authority. Certificates must be current — download a fresh copy from KRA iTax if yours has lapsed.',
    icon: 'briefcase',
    required: true,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG · max 10 MB',
    maxSizeMB: 10,
  },
  {
    id: 'ACCREDITATION',
    label: 'Accreditation certificate',
    desc: 'KENAS or relevant body accreditation',
    whyNeeded:
      'Optional but strongly recommended. Accreditation from KENAS or an ' +
      'equivalent recognised body strengthens your application.',
    icon: 'shield',
    required: false,
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    acceptLabel: 'PDF, PNG or JPG · max 10 MB',
    maxSizeMB: 10,
  },
];

const POLL_MS = 15_000;
const REQUIRED_IDS = DOC_TYPES.filter((d) => d.required).map((d) => d.id);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const truncate = (s = '', max = 32) => {
  if (s.length <= max) return s;
  const ext = s.includes('.') ? s.slice(s.lastIndexOf('.')) : '';
  return `${s.slice(0, max - ext.length - 3)}…${ext}`;
};
const fmtBytes = (b = 0) => {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};
const validateFile = (f, docType) => {
  if (f.size && f.size > docType.maxSizeMB * 1048576)
    return `File too large (${fmtBytes(f.size)}). Max ${docType.maxSizeMB} MB.`;
  const mime = f.mimeType || f.type || '';
  if (mime && !docType.accept.includes(mime))
    return `"${mime}" not accepted. Upload ${docType.acceptLabel}.`;
  return null;
};

// ─── Progress tracker step data ───────────────────────────────────────────────
const STEPS = [
  { label: 'Account created' },
  { label: 'Facility registered' },
  { label: 'Documents uploaded' },
  { label: 'Under review' },
  { label: 'Approved' },
];

function stepIndexFromStatus(vs) {
  if (vs === 'VERIFIED')  return 5; // all done
  if (vs === 'PENDING')   return 3; // step 4 active (0-indexed: 3)
  return 2;                         // UNVERIFIED / REJECTED → step 3 active (0-indexed: 2)
}

// ─── ProgressTracker ─────────────────────────────────────────────────────────
function ProgressTracker({ vs, C, isSmall }) {
  const activeIdx  = stepIndexFromStatus(vs);
  const isSuspended = false; // caller shows a different view entirely for suspended

  return (
    <View style={pt.wrap}>
      {STEPS.map((step, i) => {
        const done    = i < activeIdx;
        const active  = i === activeIdx;
        const pending = i > activeIdx;
        const color   = done || active ? C.primary : C.border;
        const textCol = done ? C.primary : active ? C.text : C.textMuted;
        const dotBg   = done ? C.primary : active ? C.primaryLight : C.surface;
        const dotBorder = done || active ? C.primary : C.border;

        return (
          <View key={step.label} style={pt.stepWrap}>
            {/* connector line before */}
            {i > 0 && (
              <View style={[pt.line, { backgroundColor: i <= activeIdx ? C.primary : C.border }]} />
            )}
            <View style={{ alignItems: 'center' }}>
              <View style={[pt.dot, { backgroundColor: dotBg, borderColor: dotBorder }]}>
                {done
                  ? <Icon name="check" lib="feather" size={10} color="#fff" />
                  : active
                    ? <View style={[pt.activePulse, { backgroundColor: C.primary }]} />
                    : null
                }
              </View>
              {!isSmall && (
                <Text style={[pt.stepLabel, { color: textCol }]} numberOfLines={2}>
                  {step.label}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const pt = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  stepWrap:    { flex: 1, flexDirection: 'row', alignItems: 'center' },
  line:        { flex: 1, height: 2, marginHorizontal: -2 },
  dot:         { width: 26, height: 26, borderRadius: 13, borderWidth: 2,
                 alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  activePulse: { width: 8, height: 8, borderRadius: 4 },
  stepLabel:   { fontSize: 10, textAlign: 'center', marginTop: 5, maxWidth: 72, lineHeight: 13 },
});

// ─── UploadCard ───────────────────────────────────────────────────────────────
function UploadCard({
  doc, staged, onServer, serverName,
  isPicking, isUploading, canUpload,
  submitting, rowError,
  onPick, onRemove, C,
}) {
  const hasStaged = !!staged;
  const locked    = !canUpload;

  let borderCol = C.border;
  let bgCol     = C.surface;
  if      (rowError)  { borderCol = C.danger;  bgCol = `${C.danger}07`;  }
  else if (hasStaged) { borderCol = C.primary; bgCol = `${C.primary}05`; }
  else if (onServer)  { borderCol = C.success; bgCol = `${C.success}08`; }
  else if (locked)    { borderCol = C.border;  bgCol = C.surface;        }

  return (
    <View style={[uc.card, { borderColor: borderCol, backgroundColor: bgCol }]}>
      {/* Icon column */}
      <View style={[uc.iconWrap, {
        backgroundColor: onServer   ? `${C.success}20`
          : hasStaged   ? `${C.primary}14`
          : locked      ? `${C.textMuted}08`
          : `${C.textMuted}10`,
      }]}>
        {isUploading
          ? <ActivityIndicator size="small" color={C.primary} />
          : <Icon
              name={onServer ? 'check-circle' : doc.icon}
              lib="feather" size={20}
              color={onServer ? C.success : hasStaged ? C.primary : C.textMuted}
            />
        }
      </View>

      {/* Content column */}
      <View style={uc.content}>
        <View style={uc.labelRow}>
          <Text style={[uc.label, { color: C.text }]}>
            {doc.label}
            {doc.required
              ? <Text style={{ color: C.danger }}> *</Text>
              : <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '400' }}> optional</Text>
            }
          </Text>
        </View>

        <Text style={[uc.desc, { color: C.textMuted }]}>{doc.desc}</Text>

        {/* Why box */}
        <View style={[uc.whyBox, { backgroundColor: `${C.primary}07`, borderColor: `${C.primary}18` }]}>
          <Icon name="info" lib="feather" size={10} color={C.primary} style={{ marginRight: 5, marginTop: 1 }} />
          <Text style={[uc.whyText, { color: C.textSec }]}>{doc.whyNeeded}</Text>
        </View>

        {/* PENDING locked chip */}
        {locked && onServer && (
          <View style={[uc.chip, { backgroundColor: `${C.success}10`, borderColor: `${C.success}28` }]}>
            <Icon name="lock" lib="feather" size={9} color={C.success} style={{ marginRight: 4 }} />
            <Text style={[uc.chipText, { color: C.success }]}>
              {serverName ? truncate(serverName) : 'Submitted — awaiting review'}
            </Text>
          </View>
        )}
        {locked && !onServer && (
          <View style={[uc.chip, { backgroundColor: `${C.warning}10`, borderColor: `${C.warning}28` }]}>
            <Icon name="alert-triangle" lib="feather" size={9} color={C.warning} style={{ marginRight: 4 }} />
            <Text style={[uc.chipText, { color: C.warning }]}>Not submitted</Text>
          </View>
        )}

        {/* Upload mode: staged chip */}
        {!locked && hasStaged && (
          <View style={[uc.chip, { backgroundColor: `${C.primary}10`, borderColor: `${C.primary}28` }]}>
            <Icon name="paperclip" lib="feather" size={9} color={C.primary} style={{ marginRight: 4 }} />
            <Text style={[uc.chipText, { color: C.primary }]} numberOfLines={1}>
              {truncate(staged.name)}
              {staged.size ? ` · ${fmtBytes(staged.size)}` : ''}
            </Text>
          </View>
        )}

        {/* Upload mode: already on server (REJECTED resubmit) */}
        {!locked && onServer && !hasStaged && (
          <View style={[uc.chip, { backgroundColor: `${C.success}10`, borderColor: `${C.success}28` }]}>
            <Icon name="check" lib="feather" size={9} color={C.success} style={{ marginRight: 4 }} />
            <Text style={[uc.chipText, { color: C.success }]}>
              {serverName ? truncate(serverName) : 'Previously submitted'} — tap Replace to update
            </Text>
          </View>
        )}

        {/* Per-file error */}
        {!!rowError && (
          <View style={uc.errRow}>
            <Icon name="alert-triangle" lib="feather" size={11} color={C.danger} style={{ marginRight: 4 }} />
            <Text style={[uc.errText, { color: C.danger }]}>{rowError}</Text>
          </View>
        )}

        <Text style={[uc.hint, { color: C.textMuted }]}>{doc.acceptLabel}</Text>
      </View>

      {/* Action buttons (upload mode only) */}
      {!locked && (
        <View style={uc.actions}>
          <TouchableOpacity
            onPress={() => onPick(doc)}
            disabled={isPicking || submitting}
            activeOpacity={0.75}
            style={[uc.selectBtn, {
              borderColor:     rowError ? C.danger : hasStaged ? C.primary : C.border,
              backgroundColor: hasStaged ? `${C.primary}10` : 'transparent',
              opacity: submitting ? 0.45 : 1,
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
                  <Text style={[uc.selectLabel, {
                    color: rowError ? C.danger : (hasStaged || onServer) ? C.primary : C.textMuted,
                  }]}>
                    {(hasStaged || onServer) ? 'Replace' : 'Select file'}
                  </Text>
                </>
            }
          </TouchableOpacity>

          {hasStaged && !submitting && (
            <TouchableOpacity
              onPress={() => onRemove(doc.id)}
              style={[uc.removeBtn, { borderColor: `${C.danger}35` }]}
              hitSlop={8} activeOpacity={0.75}
            >
              <Icon name="x" lib="feather" size={12} color={C.danger} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const uc = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12,
               borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  iconWrap:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center',
               justifyContent: 'center', flexShrink: 0 },
  content:   { flex: 1, gap: 3 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  label:     { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  desc:      { fontSize: 11, lineHeight: 15 },
  whyBox:    { flexDirection: 'row', borderWidth: 1, borderRadius: 7,
               padding: 7, marginTop: 4 },
  whyText:   { flex: 1, fontSize: 10, lineHeight: 14, fontStyle: 'italic' },
  chip:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
               borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
               marginTop: 6, maxWidth: '100%' },
  chipText:  { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  errRow:    { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  errText:   { fontSize: 11, lineHeight: 15, flex: 1 },
  hint:      { fontSize: 10, marginTop: 5 },
  actions:   { flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
               borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
               minWidth: 100, justifyContent: 'center' },
  selectLabel: { fontSize: 12, fontWeight: '600' },
  removeBtn: { borderWidth: 1, borderRadius: 8, padding: 6,
               alignItems: 'center', justifyContent: 'center' },
});

// ─── ApprovedOverlay ─────────────────────────────────────────────────────────
function ApprovedOverlay({ user, onUnlock, C }) {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 55, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  const handleOpen = async () => {
    try {
      const fresh = await getCurrentUser();
      if (fresh) onUnlock({ ...fresh, role: normalizeRole(fresh.role) });
      else       onUnlock(user);
    } catch (_) {
      onUnlock(user);
    }
  };

  return (
    <Animated.View style={[ao.wrap, { opacity, backgroundColor: C.bg }]}>
      <Animated.View style={[ao.iconWrap, {
        backgroundColor: `${C.success}15`,
        borderColor:     `${C.success}35`,
        transform: [{ scale }],
      }]}>
        <Icon name="check-circle" lib="feather" size={56} color={C.success} />
      </Animated.View>

      <Text style={[ao.title, { color: C.text }]}>Facility approved!</Text>
      <Text style={[ao.sub,   { color: C.textSec }]}>
        Your facility has been verified by GONEP.{'\n'}
        Full portal access is now unlocked.
      </Text>

      <View style={[ao.badge, { backgroundColor: `${C.success}12`, borderColor: `${C.success}30` }]}>
        <Icon name="shield" lib="feather" size={13} color={C.success} style={{ marginRight: 6 }} />
        <Text style={[ao.badgeText, { color: C.success }]}>Verified provider</Text>
      </View>

      <Btn
        label="Open your dashboard →"
        onPress={handleOpen}
        full
        style={{ marginTop: 32, maxWidth: 340 }}
      />
      <Text style={[ao.hint, { color: C.textMuted }]}>
        Your data is loading — tap above to continue.
      </Text>
    </Animated.View>
  );
}

const ao = StyleSheet.create({
  wrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 120, height: 120, borderRadius: 36, borderWidth: 2,
              alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title:    { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 10, textAlign: 'center' },
  sub:      { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  badge:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20,
              paddingHorizontal: 14, paddingVertical: 6 },
  badgeText:{ fontSize: 13, fontWeight: '700' },
  hint:     { fontSize: 12, marginTop: 12, textAlign: 'center' },
});

// ─── SuspendedView ────────────────────────────────────────────────────────────
function SuspendedView({ user, onLogout, C }) {
  return (
    <View style={sv.wrap}>
      <View style={[sv.iconWrap, { backgroundColor: `${C.danger}12`, borderColor: `${C.danger}30` }]}>
        <Icon name="alert-octagon" lib="feather" size={48} color={C.danger} />
      </View>
      <Text style={[sv.title, { color: C.text }]}>Account suspended</Text>
      <Text style={[sv.sub, { color: C.textSec }]}>
        Your facility account has been suspended by GONEP administration.{'\n'}
        You cannot access the portal until the suspension is lifted.
      </Text>
      <View style={[sv.infoBox, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Icon name="info" lib="feather" size={14} color={C.primary} style={{ marginRight: 8 }} />
        <Text style={[sv.infoText, { color: C.textSec }]}>
          If you believe this is an error, contact GONEP support at{' '}
          <Text style={{ color: C.primary, fontWeight: '700' }}>support@gonep.co.ke</Text>
        </Text>
      </View>
      <Btn
        label="Sign out"
        variant="ghost"
        onPress={onLogout}
        style={{ marginTop: 24, minWidth: 160 }}
      />
    </View>
  );
}

const sv = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconWrap:{ width: 100, height: 100, borderRadius: 28, borderWidth: 2,
             alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title:   { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 10, textAlign: 'center' },
  sub:     { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 460, marginBottom: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12,
             padding: 14, maxWidth: 460 },
  infoText:{ flex: 1, fontSize: 13, lineHeight: 19 },
});

// ─── StatusPanel ─────────────────────────────────────────────────────────────
function StatusPanel({
  vs, C, status,
  submitting, stagedCount, allRequiredStaged,
  missingCount, globalError, uploadingId, DOC_TYPES,
  onSubmit, canUpload, onRefresh, submissionComplete,
  effectiveOnServer, refreshing,
}) {
  const statusConfig = {
    UNVERIFIED: { color: C.primary,  icon: 'upload-cloud', label: 'Upload required',   bg: `${C.primary}10`,  border: `${C.primary}28`  },
    PENDING:    { color: C.warning,  icon: 'clock',        label: 'Under review',      bg: `${C.warning}10`,  border: `${C.warning}28`  },
    VERIFIED:   { color: C.success,  icon: 'check-circle', label: 'Verified',          bg: `${C.success}10`,  border: `${C.success}28`  },
    REJECTED:   { color: C.danger,   icon: 'x-circle',     label: 'Rejected',          bg: `${C.danger}10`,   border: `${C.danger}28`   },
  };
  const cfg = statusConfig[vs] || statusConfig.UNVERIFIED;

  const totalRequired  = REQUIRED_IDS.length;
  // Use effectiveOnServer (server + local session) so the counter updates
  // immediately as each file uploads without waiting for the next poll.
  const doneRequired   = REQUIRED_IDS.filter(
    (id) => (effectiveOnServer || []).includes(id)
  ).length;

  return (
    <View style={[sp.panel, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Status badge */}
      <View style={[sp.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Icon name={cfg.icon} lib="feather" size={14} color={cfg.color} style={{ marginRight: 6 }} />
        <Text style={[sp.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>

      {/* Review time note */}
      {vs === 'PENDING' && (
        <Text style={[sp.note, { color: C.textSec }]}>
          The GONEP team typically reviews within 2–3 business days. We will notify you by email and in-app.
        </Text>
      )}
      {vs === 'UNVERIFIED' && (
        <Text style={[sp.note, { color: C.textSec }]}>
          Select all required (*) documents and tap Submit. Files stay on your device until you submit.
        </Text>
      )}
      {vs === 'REJECTED' && (
        <Text style={[sp.note, { color: C.textSec }]}>
          Review the rejection reason above, replace the flagged documents, and resubmit.
        </Text>
      )}

      {/* Doc summary */}
      <View style={[sp.summary, { backgroundColor: C.bg, borderColor: C.border }]}>
        <View style={sp.summaryRow}>
          <Text style={[sp.summaryLabel, { color: C.textMuted }]}>Required docs</Text>
          <Text style={[sp.summaryVal, { color: doneRequired === totalRequired ? C.success : C.text }]}>
            {doneRequired} / {totalRequired}
          </Text>
        </View>
        <View style={[sp.summaryDiv, { backgroundColor: C.border }]} />
        <View style={sp.summaryRow}>
          <Text style={[sp.summaryLabel, { color: C.textMuted }]}>Staged (unsent)</Text>
          <Text style={[sp.summaryVal, { color: stagedCount > 0 ? C.primary : C.textMuted }]}>
            {stagedCount}
          </Text>
        </View>
      </View>

      {/* Global error */}
      {!!globalError && (
        <View style={[sp.errBox, { backgroundColor: `${C.danger}08`, borderColor: `${C.danger}25` }]}>
          <Icon name="alert-circle" lib="feather" size={12} color={C.danger} style={{ marginRight: 6, flexShrink: 0 }} />
          <Text style={[sp.errText, { color: C.danger }]}>{globalError}</Text>
        </View>
      )}

      {/* Submit CTA — hidden once the full batch is on the server (under review) */}
      {canUpload && !submissionComplete && (
        <>
          <Btn
            label={
              submitting && uploadingId
                ? `Uploading ${DOC_TYPES.findIndex((d) => d.id === uploadingId) + 1} of ${stagedCount}…`
                : stagedCount === 0
                  ? 'Select documents first'
                  : allRequiredStaged
                    ? 'Submit for review →'
                    : `Submit (${stagedCount} selected)`
            }
            full
            onPress={onSubmit}
            disabled={submitting || stagedCount === 0}
            variant={allRequiredStaged && stagedCount > 0 ? 'primary' : 'ghost'}
            style={{ marginTop: 10 }}
          />
          {stagedCount > 0 && !allRequiredStaged && missingCount > 0 && (
            <Text style={[sp.warn, { color: C.warning }]}>
              {missingCount} required doc{missingCount !== 1 ? 's' : ''} still missing
            </Text>
          )}
        </>
      )}

      {/* "Under review" completion state — all required docs submitted */}
      {submissionComplete && (
        <View style={[sp.completeBox, { backgroundColor: `${C.warning}08`, borderColor: `${C.warning}28` }]}>
          <Icon name="clock" lib="feather" size={13} color={C.warning} style={{ marginRight: 8, flexShrink: 0 }} />
          <Text style={[sp.completeText, { color: C.warning }]}>
            All documents submitted. The GONEP team will review within 2–3 business days.
          </Text>
        </View>
      )}

      {/* Refresh status button — green, prominent, spins while checking */}
      <TouchableOpacity
        onPress={onRefresh}
        disabled={refreshing || submitting}
        style={[
          sp.refreshBtn,
          { backgroundColor: C.success, borderColor: C.success, opacity: (refreshing || submitting) ? 0.7 : 1 },
        ]}
        activeOpacity={0.82}
      >
        {refreshing
          ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          : <Icon name="refresh-cw" lib="feather" size={13} color="#fff" style={{ marginRight: 8 }} />
        }
        <Text style={[sp.refreshText, { color: '#fff', fontWeight: '700' }]}>
          {refreshing ? 'Checking status…' : 'Check verification status'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const sp = StyleSheet.create({
  panel:      { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  badge:      { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
                borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText:  { fontSize: 13, fontWeight: '700' },
  note:       { fontSize: 12, lineHeight: 17 },
  summary:    { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel:{ fontSize: 12 },
  summaryVal:  { fontSize: 12, fontWeight: '700' },
  summaryDiv:  { height: 1, marginVertical: 2 },
  errBox:     { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1,
                borderRadius: 8, padding: 10 },
  errText:    { flex: 1, fontSize: 12, lineHeight: 16 },
  warn:       { fontSize: 11, textAlign: 'center', marginTop: 2 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderRadius: 10, paddingVertical: 11,
                paddingHorizontal: 14, marginTop: 6 },
  refreshText:  { fontSize: 13 },
  completeBox:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1,
                  borderRadius: 8, padding: 10, marginTop: 4 },
  completeText: { flex: 1, fontSize: 12, lineHeight: 16 },
});

// ─── Main component ───────────────────────────────────────────────────────────
export function VerificationDashboard({ user, facilityStatus, onUnlock, onLogout }) {
  const { C }                   = useTheme();
  const { isSmall, sidebarDocked } = useResponsive();

  // ── Server state ──────────────────────────────────────────────────────────
  const [status,      setStatus]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [globalError, setGlobalError] = useState('');

  // ── Local upload staging ──────────────────────────────────────────────────
  const [staged,         setStaged]         = useState({});  // { [docTypeId]: { file, name, size, mimeType } }
  const [fileErrors,     setFileErrors]     = useState({});
  const [pickingId,      setPickingId]      = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [uploadingId,    setUploadingId]    = useState(null);
  const [refreshing,     setRefreshing]     = useState(false);
  // Tracks doc types successfully uploaded in the current session so each
  // card locks immediately as its file finishes — before the next refresh.
  const [localOnServer,  setLocalOnServer]  = useState([]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const vs = status?.verification_status || 'UNVERIFIED';
  const canUpload       = !!status?.can_upload_verification_documents;
  const serverSubmitted = Array.isArray(status?.submitted_document_types)
    ? status.submitted_document_types : [];
  const serverNames     = status?.submitted_document_names || {};
  // Combine server-confirmed docs with docs uploaded in the current session
  // (not yet confirmed by the next refresh) for immediate per-card locking.
  const effectiveOnServer = Array.from(new Set([...serverSubmitted, ...localOnServer]));
  const stagedCount       = Object.keys(staged).length;
  const allRequiredStaged = REQUIRED_IDS.every((id) => !!staged[id]);
  // How many required slots still have neither a staged file nor an uploaded doc
  const missingCount      = REQUIRED_IDS.filter(
    (id) => !staged[id] && !effectiveOnServer.includes(id),
  ).length;
  // True when every required doc is on the server and nothing is staged —
  // the submission is complete (show "under review" state, hide Submit CTA).
  const submissionComplete = (
    vs === 'PENDING' &&
    stagedCount === 0 &&
    REQUIRED_IDS.every((id) => effectiveOnServer.includes(id))
  );

  // ── Fetch / refresh ───────────────────────────────────────────────────────
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setGlobalError('');
    setRefreshing(true);
    try {
      const res  = await getVerificationStatus();
      const data = res?.data || res;
      setStatus(data);
    } catch (e) {
      if (!silent) setGlobalError(e?.message || 'Could not load verification status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Poll while not VERIFIED ───────────────────────────────────────────────
  useEffect(() => {
    if (vs === 'VERIFIED') return;
    const id = setInterval(() => refresh(true), POLL_MS);
    return () => clearInterval(id);
  }, [vs, refresh]);

  // ── File picker ───────────────────────────────────────────────────────────
  const pickFile = async (docType) => {
    if (!canUpload || pickingId) return;
    setFileErrors((p) => ({ ...p, [docType.id]: undefined }));
    setPickingId(docType.id);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: docType.accept, multiple: false, copyToCacheDirectory: true,
      });
      if (result?.canceled) return;
      const f = result?.assets?.[0];
      if (!f?.uri) return;
      const err = validateFile(f, docType);
      if (err) { setFileErrors((p) => ({ ...p, [docType.id]: err })); return; }

      // ── Duplicate-filename guard ──────────────────────────────────────────
      // Prevent the same physical file from being staged under two different
      // document types, which would silently submit identical content.
      const fileName = f.name || '';
      const duplicateSlot = fileName
        ? Object.entries(staged).find(
            ([otherId, otherEntry]) =>
              otherId !== docType.id &&
              (otherEntry?.name || '') === fileName,
          )
        : null;
      if (duplicateSlot) {
        const [otherId] = duplicateSlot;
        const otherDoc  = DOC_TYPES.find((d) => d.id === otherId);
        setFileErrors((p) => ({
          ...p,
          [docType.id]:
            `"${fileName}" is already staged as "${otherDoc?.label || otherId}". ` +
            'Each document slot must have a unique file.',
        }));
        return;
      }

      const fileObj = (Platform.OS === 'web' && f.file)
        ? f.file
        : { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream', size: f.size };
      setStaged((p) => ({
        ...p,
        [docType.id]: { file: fileObj, name: f.name || 'document', size: f.size || 0, mimeType: f.mimeType || '' },
      }));
    } catch (e) {
      setFileErrors((p) => ({ ...p, [docType.id]: e?.message || 'Could not open file picker.' }));
    } finally {
      setPickingId(null);
    }
  };

  const removeStaged = (id) => {
    setStaged((p) => { const n = { ...p }; delete n[id]; return n; });
    setFileErrors((p) => ({ ...p, [id]: undefined }));
  };

  // ── Submit (sequential upload with rollback on failure) ───────────────────
  const submitDocuments = async () => {
    if (submitting || !canUpload) return;
    const toUpload = DOC_TYPES.filter((d) => staged[d.id]);
    if (!toUpload.length) {
      setGlobalError('Please select at least one document before submitting.');
      return;
    }

    // ── Pre-flight: re-fetch status to guard against stale canUpload flag ──
    // can_upload_verification_documents is false only when VERIFIED or SUSPENDED.
    // Uploading while VERIFIED is the main case to block — prevent a stale tab
    // from attempting uploads after the admin has already approved the facility.
    try {
      const freshRes  = await getVerificationStatus();
      const freshData = freshRes?.data || freshRes;
      if (!freshData?.can_upload_verification_documents) {
        setStatus(freshData);
        setStaged({});
        const freshVs = freshData?.verification_status || '';
        if (freshVs === 'VERIFIED') {
          // ApprovedOverlay will render on the next tick — no message needed.
        } else {
          setGlobalError('Documents cannot be uploaded right now. Please refresh and try again.');
        }
        return;
      }
    } catch (_) {
      // Network hiccup — proceed optimistically; a backend error will surface below if needed.
    }

    setSubmitting(true);
    setGlobalError('');
    setFileErrors({});

    const succeeded = [];
    let anyError    = false;

    for (const docType of toUpload) {
      setUploadingId(docType.id);
      try {
        await uploadVerificationDocument({ documentType: docType.id, file: staged[docType.id].file });
        succeeded.push(docType.id);
        // Lock this card immediately — don't wait for the next poll refresh.
        setLocalOnServer((prev) => prev.includes(docType.id) ? prev : [...prev, docType.id]);
      } catch (e) {
        anyError = true;
        setFileErrors((p) => ({ ...p, [docType.id]: e?.message || 'Upload failed. Please try again.' }));
      }
    }

    setUploadingId(null);
    setSubmitting(false);

    if (anyError) {
      // Roll back every file that succeeded so the submission stays consistent.
      for (const id of succeeded) {
        try { await deleteVerificationDocument(id); } catch (_) {}
      }
      // Remove rolled-back ids from localOnServer
      setLocalOnServer((prev) => prev.filter((id) => !succeeded.includes(id)));
      setGlobalError('Some files failed to upload — all uploads were rolled back. Fix the errors and resubmit.');
      await refresh(true);
    } else {
      // All good — clear staged files; server state will confirm on next refresh.
      setStaged({});
      await refresh();
      // After refresh serverSubmitted is up-to-date; clear the local mirror.
      setLocalOnServer([]);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SPECIAL STATES
  // ─────────────────────────────────────────────────────────────────────────

  // Suspended: show dedicated view immediately (no upload UI)
  if (facilityStatus === 'suspended') {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <SuspendedView user={user} onLogout={onLogout} C={C} />
      </View>
    );
  }

  // Approved: show overlay with CTA
  if (!loading && vs === 'VERIFIED') {
    return (
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <ApprovedOverlay user={user} onUnlock={onUnlock} C={C} />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN VERIFICATION UI
  // ─────────────────────────────────────────────────────────────────────────

  const facilityName = user?.facility || user?.active_facility_name || 'Your facility';
  const isPending    = vs === 'PENDING';

  // Banner config for PENDING / REJECTED
  const BANNER = {
    PENDING:  { color: C.warning, icon: 'clock',    title: 'Verification under review',
                msg: 'The GONEP team typically reviews within 2–3 business days. We will notify you here and by email.' },
    REJECTED: { color: C.danger,  icon: 'x-circle', title: 'Verification rejected',
                msg: 'Review the feedback below, replace the flagged documents and resubmit.' },
  };
  const banner = BANNER[vs] || null;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <ScrollView
        contentContainerStyle={[s.scroll, isSmall && s.scrollSm]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={[s.hero, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[s.heroIconWrap, { backgroundColor: `${C.primary}12`, borderColor: `${C.primary}25` }]}>
            <Icon name="shield" lib="feather" size={28} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.heroTitle, { color: C.text }]}>
              Complete your provider verification
            </Text>
            <Text style={[s.heroSub, { color: C.textSec }]}>
              Upload the required documents to unlock full portal access for{' '}
              <Text style={{ fontWeight: '700', color: C.text }}>{facilityName}</Text>.
            </Text>
          </View>
        </View>

        {/* ── Progress tracker ── */}
        <View style={[s.progressCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[s.sectionTitle, { color: C.textMuted }]}>VERIFICATION PROGRESS</Text>
          <ProgressTracker vs={vs} C={C} isSmall={isSmall} />
          {isSmall && (
            <Text style={[s.stepLabelMobile, { color: C.textSec }]}>
              Step {stepIndexFromStatus(vs) + 1} of {STEPS.length}:&nbsp;
              <Text style={{ fontWeight: '700', color: C.text }}>{STEPS[stepIndexFromStatus(vs)]?.label}</Text>
            </Text>
          )}
        </View>

        {/* ── Rejection / pending banner ── */}
        {!!banner && (
          <View style={[s.banner, { backgroundColor: `${banner.color}10`, borderColor: `${banner.color}30` }]}>
            <Icon name={banner.icon} lib="feather" size={18} color={banner.color} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.bannerTitle, { color: banner.color }]}>{banner.title}</Text>
              <Text style={[s.bannerMsg,   { color: C.textSec }]}>{banner.msg}</Text>
              {!!status?.rejection_reason && vs === 'REJECTED' && (
                <View style={[s.rejBox, { backgroundColor: `${C.danger}08`, borderColor: `${C.danger}25` }]}>
                  <Icon name="alert-circle" lib="feather" size={11} color={C.danger} style={{ marginRight: 5, marginTop: 1 }} />
                  <Text style={[s.rejText, { color: C.danger }]}>
                    Reviewer note: {status.rejection_reason}
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => refresh()} hitSlop={12} style={{ padding: 4 }}>
              <Icon name="refresh-cw" lib="feather" size={13} color={banner.color} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Instructions (upload mode only) ── */}
        {canUpload && (
          <View style={[s.instrCard, { backgroundColor: `${C.primary}06`, borderColor: `${C.primary}18` }]}>
            <Icon name="info" lib="feather" size={14} color={C.primary} style={{ marginRight: 10, marginTop: 1 }} />
            <Text style={[s.instrText, { color: C.textSec }]}>
              Tap <Text style={{ fontWeight: '700', color: C.text }}>Select file</Text> on each row.
              Nothing uploads until you tap{' '}
              <Text style={{ fontWeight: '700', color: C.text }}>Submit for review</Text> — you can
              replace files before submitting.
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
        ) : (
          /* ── Main two-column layout ── */
          <View style={[s.bodyRow, !sidebarDocked && s.bodyRowMobile]}>

            {/* LEFT: document cards */}
            <View style={[s.cardsCol, !sidebarDocked && s.cardsColFull]}>
              <Text style={[s.colTitle, { color: C.text }]}>
                Verification documents
                <Text style={[s.colTitleSub, { color: C.textMuted }]}>  ·  Required docs marked *</Text>
              </Text>
              {DOC_TYPES.map((doc) => (
                <UploadCard
                  key={doc.id}
                  doc={doc}
                  staged={staged[doc.id]}
                  onServer={effectiveOnServer.includes(doc.id)}
                  serverName={serverNames[doc.id] || null}
                  isPicking={pickingId === doc.id}
                  isUploading={uploadingId === doc.id}
                  canUpload={canUpload && !submissionComplete}
                  submitting={submitting}
                  rowError={fileErrors[doc.id]}
                  onPick={pickFile}
                  onRemove={removeStaged}
                  C={C}
                />
              ))}
            </View>

            {/* RIGHT: status panel */}
            <View style={[s.panelCol, !sidebarDocked && s.panelColFull]}>
              <Text style={[s.colTitle, { color: C.text }]}>Submission status</Text>
              <StatusPanel
                vs={vs}
                C={C}
                status={status}
                submitting={submitting}
                stagedCount={stagedCount}
                allRequiredStaged={allRequiredStaged}
                missingCount={missingCount}
                globalError={globalError}
                uploadingId={uploadingId}
                DOC_TYPES={DOC_TYPES}
                onSubmit={submitDocuments}
                canUpload={canUpload}
                onRefresh={() => refresh()}
                submissionComplete={submissionComplete}
                effectiveOnServer={effectiveOnServer}
                refreshing={refreshing}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  scrollSm: { padding: 14, paddingBottom: 40 },

  // Hero
  hero:       { flexDirection: 'row', alignItems: 'flex-start', gap: 16,
                borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 14 },
  heroIconWrap: { width: 52, height: 52, borderRadius: 16, borderWidth: 1.5,
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroTitle:  { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  heroSub:    { fontSize: 13, lineHeight: 19 },

  // Progress card
  progressCard: { borderWidth: 1, borderRadius: 16, padding: 18, marginBottom: 14 },
  sectionTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 12 },
  stepLabelMobile: { fontSize: 12, marginTop: 8 },

  // Banner
  banner:      { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5,
                 borderRadius: 14, padding: 14, marginBottom: 14 },
  bannerTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  bannerMsg:   { fontSize: 12, lineHeight: 17 },
  rejBox:      { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1,
                 borderRadius: 8, padding: 8, marginTop: 8 },
  rejText:     { flex: 1, fontSize: 12, lineHeight: 16, fontStyle: 'italic' },

  // Instructions
  instrCard:  { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1,
                borderRadius: 12, padding: 12, marginBottom: 14 },
  instrText:  { flex: 1, fontSize: 12, lineHeight: 18 },

  // Body two-column layout
  bodyRow:      { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  bodyRowMobile:{ flexDirection: 'column' },
  cardsCol:     { flex: 3 },
  cardsColFull: { flex: undefined, width: '100%' },
  panelCol:     { flex: 2, minWidth: 240 },
  panelColFull: { flex: undefined, width: '100%', marginTop: 6 },

  colTitle:    { fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: -0.2 },
  colTitleSub: { fontSize: 12, fontWeight: '400' },
});
