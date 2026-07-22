// app/(helper)/profile/document-detail.tsx
// Document detail view — shown when tapping any document card in documents.tsx.
// PHP: helper/get_profile.php (document data via params from documents.tsx)

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator, Linking, SafeAreaView, ScrollView,
  Text, TouchableOpacity, View,
} from 'react-native';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { HelperTabBar } from '@/components/helper/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { DocumentAIScan, ScanResult } from '@/components/shared/DocumentAIScan';
import { ImageZoomModal } from '@/components/shared/ImageZoomModal';
import { useProfileTheme } from './profile.theme';
import { createStyles } from './document-detail.styles';

// Reconstruct a stored per-side scan result (front/back) with legacy fallback.
function buildSideResult(
  side: 'front' | 'back', extra: any, docType: string, docStatus: string,
  topAiStatus?: string, topClarity?: string,
): ScanResult | null {
  const sc = extra?.scans?.[side];
  if (sc?.ai_status && sc.ai_status !== 'Unchecked') {
    return {
      ai_verification_status: sc.ai_status,
      legitimacy_score: sc.legitimacy_score ?? null,
      quality_score: sc.quality_score ?? null,
      fields: Array.isArray(sc.fields) ? sc.fields : [],
      warnings: Array.isArray(sc.warnings) ? sc.warnings : [],
      document_type: docType,
      document_guess: sc.document_guess ?? '',
      doc_status: docStatus,
    };
  }
  if (side === 'front' && topAiStatus && topAiStatus !== 'Unchecked') {
    return {
      ai_verification_status: topAiStatus,
      legitimacy_score: extra?.legitimacy_score ?? null,
      quality_score: topClarity ? Number(topClarity) : null,
      fields: Array.isArray(extra?.fields) ? extra.fields : [],
      warnings: Array.isArray(extra?.warnings) ? extra.warnings : [],
      document_type: docType,
      document_guess: extra?.document_guess ?? '',
      doc_status: docStatus,
    };
  }
  return null;
}

// ─── Step definitions ─────────────────────────────────────────────────────────
// Real lifecycle in the database is Pending → Verified (or → Rejected).
// "Pending" means the document has been uploaded and is awaiting PESO review,
// so it sits at the "Under Review" step. Once Verified, the document is also
// considered "Active" (currently in use for verification/applications) — both
// of those final steps complete together.

const STEPS = [
  { label: 'Uploaded',     desc: 'Your document was submitted successfully.' },
  { label: 'AI Scanned',   desc: 'Our AI checked this document for legitimacy and clarity.' },
  { label: 'Under Review', desc: 'PESO staff are reviewing your document.' },
  { label: 'Verified',     desc: 'PESO confirmed your document is valid.' },
  { label: 'Active',       desc: 'This document is active and counted toward your verification.' },
] as const;

// currentStep = index of the furthest completed step (done = i <= currentStep).
function computeStep(status: string, scanned: boolean): number {
  switch (status?.toLowerCase()) {
    case 'verified': return 4; // Verified + Active both complete
    case 'rejected': return -1; // not shown on the stepper — uses the rejected banner instead
    default:         return scanned ? 2 : 0; // Pending: at Under Review once AI-scanned, else just Uploaded
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentDetailScreen() {
  const router = useRouter();
  const t = useProfileTheme();
  const { GREEN, MUTED, ORANGE } = t;
  const s = useMemo(() => createStyles(t), [t]);
  const params = useLocalSearchParams<{
    document_id?:   string;
    document_type?: string;
    file_url?:      string;
    file_url_back?: string;
    file_path?:     string;
    file_path_back?: string;
    status?:        string;
    uploaded_at?:   string;
    autoscan?:      string;
    autoscan_side?: string;
    ai_status?:     string;
    ai_confidence_score?: string;
    ai_extracted_data?:   string;
    // extended fields (returned by backend when available)
    expiry_date?:      string;
    verified_by?:      string;
    verified_at?:      string;
    rejection_reason?: string;
  }>();

  const {
    document_id      = '',
    document_type    = 'Document',
    file_url         = '',
    file_url_back    = '',
    file_path        = '',
    file_path_back   = '',
    status           = 'Pending',
    uploaded_at      = '',
    autoscan         = '',
    autoscan_side    = 'front',
    ai_status        = '',
    ai_confidence_score = '',
    ai_extracted_data   = '',
    expiry_date,
    verified_by,
    verified_at,
    rejection_reason,
  } = params;

  // Live status — updated when the AI scan finishes (e.g. auto-reject of a fake).
  const [docStatus, setDocStatus] = useState<string>(status || 'Pending');
  const [aiStatus, setAiStatus]   = useState<string>(ai_status || '');
  const [aiReason, setAiReason]   = useState<string>('');
  // Two-sided docs (Valid ID): flip the preview between front and back.
  const [imgSide, setImgSide]     = useState<'front' | 'back'>('front');
  const [zoomUri, setZoomUri]     = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // When deleting this document paused PESO verification, show that warning
  // first and only navigate back once the helper has acknowledged it.
  const [backOnNoticeClose, setBackOnNoticeClose] = useState(false);
  const [notice, setNotice] = useState<{
    visible: boolean;
    title?: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ visible: false, message: '', type: 'info' });

  const showNotice = (message: string, type: typeof notice.type = 'error', title?: string) => {
    setNotice({ visible: true, title, message, type });
  };

  const handleScanned = (res: any) => {
    if (res?.overall_status) setAiStatus(res.overall_status);
    else if (res?.ai_verification_status) setAiStatus(res.ai_verification_status);
    if (res?.doc_status) setDocStatus(res.doc_status);
    if (res?.auto_rejected) {
      setAiReason('Our AI could not confirm this is a genuine document, so it was not sent for PESO verification. Please re-upload a clear, authentic copy.');
    }
  };

  const statusKey  = (docStatus ?? '').toLowerCase();
  const isVerified = statusKey === 'verified';
  const isRejected = statusKey === 'rejected';
  const isPending  = !isVerified && !isRejected;
  const scanned    = !!aiStatus && aiStatus !== 'Unchecked';

  // Reconstruct the stored per-side scan results so each widget shows its result
  // directly instead of re-scanning (which would drain the AI). A re-scan only
  // happens for the freshly uploaded side (autoscan=1 + autoscan_side).
  const extraObj = React.useMemo(() => {
    try { return ai_extracted_data ? JSON.parse(ai_extracted_data) : {}; } catch { return {}; }
  }, [ai_extracted_data]);
  const frontInitial = React.useMemo(
    () => buildSideResult('front', extraObj, document_type, docStatus, aiStatus, ai_confidence_score),
    [extraObj, document_type, docStatus, aiStatus, ai_confidence_score],
  );
  const backInitial = React.useMemo(
    () => buildSideResult('back', extraObj, document_type, docStatus),
    [extraObj, document_type, docStatus],
  );
  const stepIndex  = computeStep(docStatus ?? '', scanned);
  const rejectReason = aiReason || rejection_reason;
  const isPdf      = file_url.toLowerCase().endsWith('.pdf');
  const hasImage   = !!file_url && !isPdf;
  // Back side (Valid ID). When present, the preview can flip between sides.
  const hasBack     = !!file_url_back && !file_url_back.toLowerCase().endsWith('.pdf');
  const shownUrl    = imgSide === 'back' && hasBack ? file_url_back : file_url;
  const shownIsPdf  = shownUrl.toLowerCase().endsWith('.pdf');
  const shownHasImage = !!shownUrl && !shownIsPdf;

  const uploadedLabel = uploaded_at
    ? new Date(uploaded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const expiryLabel = expiry_date
    ? new Date(expiry_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const verifiedLabel = verified_at
    ? new Date(verified_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const handleDownload = () => {
    const openUrl = shownUrl || file_url;
    if (!openUrl) {
      showNotice('This document has no file attached.', 'warning', 'No file');
      return;
    }
    Linking.openURL(openUrl).catch(() =>
      showNotice('Could not open the document. Please try again.', 'error')
    );
  };

  const handleDelete = () => {
    if (!document_id) {
      showNotice('This document cannot be identified for deletion.', 'error');
      return;
    }
    setConfirmDelete(true);
  };

  const executeDelete = async () => {
    setConfirmDelete(false);
    if (deleting) return;
    setDeleting(true);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/helper/delete_document.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id, user_id: user.user_id, requester_id: user.user_id }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Failed to delete document');

      if (data.verification_reverted) {
        setBackOnNoticeClose(true);
        showNotice(
          'Deleting this document paused your PESO verification. Your profile is now hidden from families until you re-upload it and PESO re-verifies your account.',
          'warning',
          'Verification Paused'
        );
      } else {
        router.back();
      }
    } catch (err: any) {
      showNotice(err.message || 'Could not delete the document. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#2A1608" />
          </TouchableOpacity>
          <Text style={s.barTitle}>Document Details</Text>
          <View style={s.barSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Status banner ── */}
          <View style={isVerified ? s.bannerVerified : isRejected ? s.bannerRejected : s.bannerPending}>
            <View style={[
              s.bannerIconCircle,
              { backgroundColor: isVerified ? '#A7F3D0' : isRejected ? '#FECACA' : '#FEF3C7' },
            ]}>
              <Ionicons
                name={isVerified ? 'shield-checkmark' : isRejected ? 'close-circle' : 'time-outline'}
                size={22}
                color={isVerified ? GREEN : isRejected ? '#DC2626' : '#D97706'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>
                {isVerified ? 'Verified by PESO' : isRejected ? 'Rejected by PESO' : 'Pending — Under Review'}
              </Text>
              <Text style={s.bannerSub}>
                {isVerified
                  ? 'This document has been reviewed and verified by PESO.'
                  : isRejected
                    ? (rejectReason || 'This document was rejected. Please re-upload a corrected copy.')
                    : 'This document is currently being reviewed by PESO.'}
              </Text>
            </View>
          </View>

          {/* ── Document info card ── */}
          <View style={s.docCard}>
            <View style={s.docRow}>
              {/* Left: document thumbnail — tap to view/zoom full-screen */}
              <TouchableOpacity
                style={s.docThumb}
                activeOpacity={shownHasImage ? 0.85 : 1}
                onPress={shownHasImage ? () => setZoomUri(shownUrl) : undefined}
              >
                {shownHasImage ? (
                  <>
                    <Image
                      source={{ uri: shownUrl }}
                      style={s.docThumbImg}
                      contentFit="cover"
                    />
                    <View style={{ position: 'absolute', right: 6, bottom: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="expand" size={13} color="#fff" /></View>
                  </>
                ) : (
                  <View style={s.docThumbFallback}>
                    <Ionicons
                      name={shownIsPdf ? 'document-text' : 'document-outline'}
                      size={40}
                      color="#B8956A"
                    />
                    <Text style={{
                      fontFamily: FontFamily.fredokaSemiBold,
                      fontSize: 11, color: '#B8956A',
                    }}>
                      {shownIsPdf ? 'PDF' : 'No preview'}
                    </Text>
                  </View>
                )}
                {hasBack ? (
                  <>
                    <View style={s.sideBadge}>
                      <Text style={s.sideBadgeText}>{imgSide === 'back' ? 'Back' : 'Front'}</Text>
                    </View>
                    <View style={s.flipBadge}>
                      <Ionicons name="sync-outline" size={13} color="#fff" />
                    </View>
                  </>
                ) : null}
              </TouchableOpacity>

              {/* Right: document details */}
              <View style={s.docDetails}>
                <Text style={s.docName}>{document_type}</Text>

                <View>
                  <Text style={s.detailLabel}>Document Type</Text>
                  <Text style={s.detailValue}>{document_type}</Text>
                </View>

                {(uploadedLabel || expiryLabel) ? (
                  <View style={s.datesRow}>
                    {uploadedLabel ? (
                      <View style={s.dateBlock}>
                        <Text style={s.detailLabel}>Uploaded On</Text>
                        <Text style={s.detailValue}>{uploadedLabel}</Text>
                      </View>
                    ) : null}
                    {expiryLabel ? (
                      <View style={s.dateBlock}>
                        <Text style={s.detailLabel}>Expiry Date</Text>
                        <Text style={s.detailValue}>{expiryLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View>
                  <Text style={s.detailLabel}>Status</Text>
                  <Text style={[s.detailValue, { color: isVerified ? GREEN : isRejected ? '#DC2626' : '#D97706' }]}>
                    {isVerified ? 'Verified by PESO' : isRejected ? 'Rejected by PESO' : 'Pending Review'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Front / Back switch for two-sided IDs */}
            {hasBack ? (
              <View style={s.sideToggle}>
                {(['front', 'back'] as const).map((side) => {
                  const active = imgSide === side;
                  return (
                    <TouchableOpacity
                      key={side}
                      style={[s.sideToggleBtn, active && s.sideToggleBtnActive]}
                      onPress={() => setImgSide(side)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={active ? 'card' : 'card-outline'} size={14} color={active ? '#fff' : MUTED} />
                      <Text style={[s.sideToggleText, active && s.sideToggleTextActive]}>
                        {side === 'front' ? 'Front' : 'Back'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* ── AI Document Scan (front & back scan independently) ── */}
          {document_id ? (
            <View style={s.statusSection}>
              <Text style={s.statusTitle}>AI Document Scan</Text>
              <View style={{ gap: 14 }}>
                <DocumentAIScan
                  key={`${document_id}-front`}
                  doc={{ document_id, document_type, file_url: isPdf ? null : file_url, file_path }}
                  themeKey="helper"
                  side="front"
                  title={file_url_back || document_type === 'Valid ID' ? 'Front side' : undefined}
                  autoStart={autoscan === '1' && autoscan_side !== 'back' && !frontInitial}
                  initialResult={frontInitial}
                  onScanned={handleScanned}
                  onViewImage={(uri) => setZoomUri(uri)}
                />
                {!!file_url_back && (
                  <DocumentAIScan
                    key={`${document_id}-back`}
                    doc={{ document_id, document_type, file_url: file_url_back.toLowerCase().endsWith('.pdf') ? null : file_url_back, file_path: file_path_back }}
                    themeKey="helper"
                    side="back"
                    title="Back side"
                    autoStart={autoscan === '1' && autoscan_side === 'back' && !backInitial}
                    initialResult={backInitial}
                    onScanned={handleScanned}
                    onViewImage={(uri) => setZoomUri(uri)}
                  />
                )}
              </View>
            </View>
          ) : null}

          {/* ── Verification Details ── */}
          <View style={s.verifyCard}>
            <Text style={s.verifyCardTitle}>Verification Details</Text>
            <View style={s.verifyRow}>
              <View style={[s.verifyCheck, isRejected && { backgroundColor: '#FECACA' }]}>
                <Ionicons
                  name={isVerified ? 'checkmark' : isRejected ? 'close' : 'time-outline'}
                  size={18}
                  color={isVerified ? GREEN : isRejected ? '#DC2626' : '#D97706'}
                />
              </View>
              <View style={s.verifyText}>
                <Text style={s.verifyBy}>
                  {isVerified
                    ? `Verified by PESO${verified_by ? ` (${verified_by})` : ''}`
                    : isRejected
                      ? `Rejected by PESO${verified_by ? ` (${verified_by})` : ''}`
                      : 'Pending PESO verification'}
                </Text>
                {isRejected && rejectReason ? (
                  <Text style={[s.verifyDate, { color: '#DC2626' }]}>{rejectReason}</Text>
                ) : verifiedLabel ? (
                  <Text style={s.verifyDate}>on {verifiedLabel}</Text>
                ) : null}
              </View>
              <View style={s.verifyBadge}>
                <Ionicons
                  name={isVerified ? 'ribbon' : isRejected ? 'alert-circle' : 'ellipse-outline'}
                  size={28}
                  color={isVerified ? '#D97706' : isRejected ? '#DC2626' : MUTED}
                />
              </View>
            </View>
          </View>

          {/* ── Document Status progress ── */}
          <View style={s.statusSection}>
            <Text style={s.statusTitle}>Document Status</Text>
            {isRejected ? (
              <View style={s.rejectedTrack}>
                <View style={[s.progressCircle, { backgroundColor: '#DC2626' }]}>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </View>
                <Text style={s.rejectedTrackText}>
                  This document was rejected and is not part of the verification pipeline. Re-upload a corrected copy to restart the review.
                </Text>
              </View>
            ) : (
              <StatusProgress currentStep={stepIndex} />
            )}
          </View>

          {/* ── Action buttons ── */}
          <View style={s.actionsRow}>
            <TouchableOpacity style={s.downloadBtn} onPress={handleDownload} activeOpacity={0.85}>
              <Ionicons name="download-outline" size={18} color="#2A1608" />
              <Text style={s.downloadText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" />
              <Text style={s.deleteText}>Delete Document</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <HelperTabBar />
      </SafeAreaView>

      <ImageZoomModal
        visible={!!zoomUri}
        uri={zoomUri}
        title={`${document_type}${hasBack ? ` — ${imgSide === 'front' ? 'Front' : 'Back'}` : ''}`}
        onClose={() => setZoomUri(null)}
      />
      <ConfirmationModal
        visible={confirmDelete}
        title="Delete Document"
        message={`Are you sure you want to delete "${document_type}"? This cannot be undone.`}
        confirmText="Delete" cancelText="Cancel" type="danger"
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(false)}
      />
      <NotificationModal
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        type={notice.type}
        onClose={() => {
          setNotice((n) => ({ ...n, visible: false }));
          if (backOnNoticeClose) { setBackOnNoticeClose(false); router.back(); }
        }}
      />
    </View>
  );
}

// ─── StatusProgress ───────────────────────────────────────────────────────────

function StatusProgress({ currentStep }: { currentStep: number }) {
  const t = useProfileTheme();
  const { GREEN } = t;
  const s = useMemo(() => createStyles(t), [t]);
  return (
    <View style={s.trackWrap}>
      {STEPS.map((step, i) => {
        const done = i <= currentStep;
        const isLast = i === STEPS.length - 1;
        return (
          <View key={step.label} style={s.trackRow}>
            {/* Icon + connecting line */}
            <View style={s.trackRail}>
              <View style={[s.progressCircle, { backgroundColor: done ? GREEN : '#E5E7EB' }]}>
                <Ionicons
                  name={done ? 'checkmark' : 'ellipse-outline'}
                  size={16}
                  color={done ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
              {!isLast && (
                <View style={[s.trackLine, { backgroundColor: i < currentStep ? GREEN : '#E5E7EB' }]} />
              )}
            </View>
            {/* Label + description */}
            <View style={s.trackTextWrap}>
              <Text style={[s.trackLabel, done && s.trackLabelDone]}>{step.label}</Text>
              <Text style={s.trackDesc}>{step.desc}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
