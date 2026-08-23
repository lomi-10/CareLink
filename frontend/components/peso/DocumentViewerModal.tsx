// components/peso/DocumentViewerModal.tsx
// Full-screen document review for PESO staff.
//
// WHY THIS REPLACED THE OLD VIEWER (PESO request, Aug 2026): both panels opened
// a document in a 560px-wide box with a 440px-tall image inside it. A barangay
// clearance is a dense A4 page of small print — at that size an officer could
// see that a document existed but not actually read it, and there was no way to
// zoom. Verifying a name against an ID was guesswork.
//
// Two things fix that:
//
//  1. The document gets the whole screen, on a dark stage, with zoom and pan.
//     Dark ground is the convention for document and image viewers because the
//     paper reads as paper against it.
//
//  2. The AI-extracted details move NEXT TO the document instead of living on
//     the card behind the modal. Comparing "what the scan read" against "what
//     the page says" is the actual verification task, and it used to require
//     closing the viewer to see one of the two halves.
//
// The approve / reject actions come along for the ride, so a decision can be
// made from the one screen where the evidence is legible.

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView, Image,
  ActivityIndicator, Platform, Linking, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import { CredentialBadge, credentialStateFor } from '../shared/CredentialBadge';
import { credentialSpec } from '@/constants/credentials';
import { isPdfDocument } from '@/lib/documentType';

const ZOOM_STEPS = [1, 1.5, 2, 3, 4] as const;
const STAGE_BG = '#101013';

export type ViewerDoc = {
  document_id?: number | string;
  document_type?: string | null;
  id_type?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
  uploaded_at?: string | null;
  verified_at?: string | null;
  file_url?: string | null;
  file_url_back?: string | null;
  file_path?: string | null;
  is_pdf?: boolean;
  ai_verification_status?: string | null;
  ai_confidence_score?: number | null;
  ai_legitimacy_score?: number | null;
  ai_fields?: Array<{ label?: string; value?: any }>;
  ai_warnings?: string[];
} | null;

export function DocumentViewerModal({
  visible, doc, side = 'front', onChangeSide, onClose,
  onApprove, onReject, onFlag, processing,
}: {
  visible: boolean;
  doc: ViewerDoc;
  side?: 'front' | 'back';
  onChangeSide?: (side: 'front' | 'back') => void;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onFlag?: () => void;
  processing?: boolean;
}) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { width, height } = useWindowDimensions();
  const wide = width >= 980;

  const [zoomIdx, setZoomIdx] = useState(0);
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const [imgLoading, setImgLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  const zoom = ZOOM_STEPS[zoomIdx];
  const url = side === 'back' ? doc?.file_url_back : doc?.file_url;
  const isPdf = doc?.is_pdf ?? isPdfDocument(doc?.file_path, url);
  const hasBack = !!doc?.file_url_back;

  // Reset per document / per side — otherwise the next document opens at 4x
  // scrolled to wherever the last one was left.
  useEffect(() => { setZoomIdx(0); setImgLoading(true); setImgRatio(null); }, [doc?.document_id, side]);

  // Natural aspect ratio, so a portrait clearance isn't letterboxed into a
  // landscape box and lost half its height.
  useEffect(() => {
    if (!url || isPdf) return;
    let alive = true;
    Image.getSize(url, (w, h) => { if (alive && h > 0) setImgRatio(w / h); }, () => {});
    return () => { alive = false; };
  }, [url, isPdf]);

  // Escape closes, +/- zoom. A full-screen viewer that traps you until you find
  // the X is the classic lightbox mistake.
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const onKey = (e: any) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') setZoomIdx((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
      else if (e.key === '-' || e.key === '_') setZoomIdx((i) => Math.max(i - 1, 0));
      else if (e.key === '0') setZoomIdx(0);
    };
    // @ts-ignore web-only
    window.addEventListener('keydown', onKey);
    // @ts-ignore web-only
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!doc) return null;

  const spec = credentialSpec(doc.document_type);
  const state = credentialStateFor(doc, doc.document_type);
  const fields = (doc.ai_fields ?? []).filter((f) => f?.label && f?.value != null && String(f.value).trim() !== '');
  const warnings = doc.ai_warnings ?? [];
  const legit = doc.ai_legitimacy_score != null ? Math.round(Number(doc.ai_legitimacy_score)) : null;
  const clarity = doc.ai_confidence_score != null ? Math.round(Number(doc.ai_confidence_score)) : null;
  const scanned = !!doc.ai_verification_status && doc.ai_verification_status !== 'Unchecked';
  const isPending = doc.status === 'Pending';

  const panelW = wide ? Math.round(Math.min(420, Math.max(330, width * 0.26))) : 0;
  const stageW = wide && panelOpen ? width - panelW : width;
  // Leave room for the toolbar and, on narrow screens, the stacked panel.
  const stageH = wide ? height - 132 : Math.max(260, height * 0.46);

  // 100% must mean "the whole page is visible", so the fit size is bounded by
  // BOTH axes. Sizing off the width alone (as this first did) overflowed a
  // portrait A4 clearance vertically and cropped it at the default zoom — the
  // one zoom level where nothing should be cut off.
  const PAD = 48;
  const availW = Math.max(80, stageW - PAD);
  const availH = Math.max(80, stageH - PAD);
  const fitW = imgRatio ? Math.min(availW, availH * imgRatio) : availW;
  const imgW = fitW * zoom;
  const imgH = imgRatio ? imgW / imgRatio : availH * zoom;

  const fmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—';

  // ── The document stage ─────────────────────────────────────────────────────
  const stage = (
    <View style={[s.stage, { height: stageH }]}>
      {!url ? (
        <View style={s.stageEmpty}>
          <Ionicons name="document-outline" size={44} color="#5B5B63" />
          <Text style={s.stageEmptyText}>No file on record for this side.</Text>
        </View>
      ) : isPdf ? (
        Platform.OS === 'web' ? (
          // react-native-web renders through React DOM, so a real <iframe> works
          // and gives the browser's own PDF reader — scroll, search, print — at
          // full size. Far better than telling the officer to open a new tab.
          React.createElement('iframe', {
            src: url,
            style: { width: '100%', height: '100%', border: 'none', background: STAGE_BG },
            title: doc.document_type ?? 'Document',
          })
        ) : (
          <View style={s.stageEmpty}>
            <Ionicons name="document-text" size={54} color={c.info} />
            <Text style={s.stageEmptyText}>This document is a PDF.</Text>
            <Pressable style={s.openBtn} onPress={() => Linking.openURL(url)}>
              <Ionicons name="open-outline" size={15} color="#fff" />
              <Text style={s.openBtnText}>Open PDF</Text>
            </Pressable>
          </View>
        )
      ) : (
        // Nested scrollers give two-axis panning once zoomed, with no gesture
        // library and identical behaviour on web and native.
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ minHeight: '100%', justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <ScrollView
            horizontal
            contentContainerStyle={{ minWidth: '100%', justifyContent: 'center', alignItems: 'center', padding: 24 }}
            showsHorizontalScrollIndicator={false}
          >
            <View>
              <Image
                source={{ uri: url }}
                style={{ width: imgW, height: imgH, backgroundColor: '#fff', borderRadius: 4 }}
                resizeMode="contain"
                onLoadEnd={() => setImgLoading(false)}
              />
              {imgLoading && (
                <View style={s.imgLoading}><ActivityIndicator size="large" color="#fff" /></View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );

  // ── The details panel ──────────────────────────────────────────────────────
  // The ScrollView is wrapped in a plain View that owns the width.
  //
  // A ScrollView's own base style carries flexGrow: 1, so putting `width` on it
  // directly inside a flex row made that width a flex BASIS which then grew:
  // the stage (flex: 1, basis 0) and the panel (basis 420) split the free space
  // evenly, leaving a ~1160px panel beside a ~700px stage. A non-flexing wrapper
  // is what actually pins the width.
  const panelBody = (
    <View style={{ padding: 16, paddingBottom: 22 }}>
      <CredentialBadge documentType={doc.document_type} state={state} dark={dark} />

      <View style={s.metaBox}>
        <MetaRow label="Document" value={doc.document_type ?? '—'} />
        {!!doc.id_type && <MetaRow label="ID type" value={doc.id_type} />}
        <MetaRow label="Uploaded" value={fmt(doc.uploaded_at)} />
        <MetaRow label="Verified" value={fmt(doc.verified_at)} last />
      </View>

      {!spec.pesoVerifiable && (
        <View style={s.policy}>
          <Ionicons name="information-circle-outline" size={14} color={c.subtle} />
          <Text style={s.policyText}>{spec.blurb}</Text>
        </View>
      )}

      {scanned && (legit != null || clarity != null) && (
        <>
          <Text style={s.sectionLabel}>AI pre-check</Text>
          <View style={s.scoreRow}>
            {legit != null && <Score label="Legitimacy" value={legit} />}
            {clarity != null && <Score label="Clarity" value={clarity} />}
          </View>
        </>
      )}

      {/* The half that used to be behind the modal. */}
      <Text style={s.sectionLabel}>Extracted details</Text>
      {fields.length === 0 ? (
        <Text style={s.emptyFields}>
          {scanned
            ? 'The scan did not read any fields from this document.'
            : 'This document has not been scanned yet. Read the details from the page itself.'}
        </Text>
      ) : (
        <View style={s.fieldBox}>
          {fields.map((f, i) => {
            const text = String(f.value);
            // A short value pairs with its label on one line. A paragraph — the
            // "Purpose" clause on a barangay certification runs several
            // sentences — gets its own left-aligned block, because ragged-left
            // body copy squeezed against a label is unreadable at panel width.
            const long = text.length > 48;
            const last = i === fields.length - 1;
            return (
              <View key={`${f.label}-${i}`} style={[long ? s.fieldStack : s.fieldRow, last && { borderBottomWidth: 0 }]}>
                <Text style={[s.fieldLabel, long && s.fieldLabelStacked]}>{f.label}</Text>
                <Text style={[s.fieldValue, long && s.fieldValueStacked]} selectable>{text}</Text>
              </View>
            );
          })}
        </View>
      )}
      {fields.length > 0 && (
        <Text style={s.fieldHint}>
          Read from the document by AI. Check each line against the page before approving.
        </Text>
      )}

      {warnings.length > 0 && (
        <View style={s.warnBox}>
          <View style={s.warnHead}>
            <Ionicons name="warning" size={13} color={c.warn} />
            <Text style={s.warnTitle}>Flagged by the pre-check</Text>
          </View>
          {warnings.map((wtext, i) => <Text key={i} style={s.warnText}>• {wtext}</Text>)}
        </View>
      )}

      {doc.status === 'Rejected' && !!doc.rejection_reason && (
        <View style={s.rejBox}>
          <Ionicons name="close-circle" size={14} color={c.bad} />
          <Text style={s.rejText}>{doc.rejection_reason}</Text>
        </View>
      )}
    </View>
  );

  // Only the desktop panel scrolls on its own. On a phone the whole modal is
  // already one vertical ScrollView, and nesting a second one inside it fights
  // the outer scroll — the panel would trap the gesture and the page above it
  // would become unreachable.
  const panel = wide ? (
    <View style={[s.panel, { width: panelW }]}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>{panelBody}</ScrollView>
    </View>
  ) : (
    <View style={[s.panel, { width: '100%' }]}>{panelBody}</View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        {/* Toolbar */}
        <View style={s.bar}>
          <View style={s.barLeft}>
            <View style={s.barIcon}><Ionicons name={spec.icon} size={16} color={c.accent} /></View>
            <View style={{ minWidth: 0, flexShrink: 1 }}>
              <Text style={s.barTitle} numberOfLines={1}>{doc.document_type ?? 'Document'}</Text>
              {hasBack && <Text style={s.barSub}>{side === 'back' ? 'Back side' : 'Front side'}</Text>}
            </View>
          </View>

          <View style={s.barRight}>
            {hasBack && onChangeSide && (
              <View style={s.segment}>
                {(['front', 'back'] as const).map((sd) => (
                  <Pressable key={sd} onPress={() => onChangeSide(sd)} style={[s.segBtn, side === sd && s.segBtnOn]}>
                    <Text style={[s.segText, side === sd && s.segTextOn]}>{sd === 'front' ? 'Front' : 'Back'}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {!isPdf && !!url && (
              <View style={s.zoomGroup}>
                <Pressable onPress={() => setZoomIdx((i) => Math.max(i - 1, 0))} disabled={zoomIdx === 0} style={[s.zoomBtn, zoomIdx === 0 && s.zoomOff]}>
                  <Ionicons name="remove" size={16} color={c.ink} />
                </Pressable>
                <Pressable onPress={() => setZoomIdx(0)} style={s.zoomLabelBtn}>
                  <Text style={s.zoomLabel}>{Math.round(zoom * 100)}%</Text>
                </Pressable>
                <Pressable onPress={() => setZoomIdx((i) => Math.min(i + 1, ZOOM_STEPS.length - 1))} disabled={zoomIdx === ZOOM_STEPS.length - 1} style={[s.zoomBtn, zoomIdx === ZOOM_STEPS.length - 1 && s.zoomOff]}>
                  <Ionicons name="add" size={16} color={c.ink} />
                </Pressable>
              </View>
            )}

            {wide && (
              <Pressable onPress={() => setPanelOpen((v) => !v)} style={s.iconBtn}>
                <Ionicons name={panelOpen ? 'chevron-forward' : 'list-outline'} size={17} color={c.muted} />
              </Pressable>
            )}
            <Pressable onPress={onClose} style={s.iconBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={c.muted} />
            </Pressable>
          </View>
        </View>

        {/* Body */}
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: 'timing', duration: 200 }} style={{ flex: 1 }}>
          {wide ? (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>{stage}</View>
              {panelOpen && panel}
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
              {stage}
              {panel}
            </ScrollView>
          )}
        </MotiView>

        {/* Decide without leaving the evidence.
            Flag is independent of status — an already-verified document is
            exactly the one an officer needs to be able to dispute. */}
        {(onFlag || (isPending && (onApprove || onReject))) && (
          <View style={s.footer}>
            {onFlag && (
              <Pressable style={s.flagBtn} onPress={onFlag} disabled={processing}>
                <Ionicons name="flag-outline" size={16} color={c.bad} />
                <Text style={s.flagText}>Flag as altered</Text>
              </Pressable>
            )}
            <View style={{ flex: 1 }} />
            {isPending && onReject && (
              <Pressable style={[s.rejectBtn, processing && s.dim]} onPress={onReject} disabled={processing}>
                <Ionicons name="close-circle-outline" size={17} color="#fff" />
                <Text style={s.actText}>Reject</Text>
              </Pressable>
            )}
            {isPending && onApprove && (
              <Pressable style={[s.approveBtn, processing && s.dim]} onPress={onApprove} disabled={processing}>
                {processing ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />
                    <Text style={s.actText}>
                      {spec.pesoVerifiable ? 'Approve' : 'Accept on file'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────
function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={[s.metaRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const tone = value >= 85 ? c.ok : value >= 60 ? c.warn : c.bad;
  const word = label === 'Clarity'
    ? (value >= 85 ? 'Very clear' : value >= 60 ? 'Readable' : 'Hard to read')
    : (value >= 90 ? 'High' : value >= 70 ? 'Medium' : 'Low');
  return (
    <View style={[s.score, { borderColor: tone + '38' }]}>
      <Text style={s.scoreLabel}>{label}</Text>
      <Text style={[s.scoreVal, { color: tone }]}>{value}%</Text>
      <View style={s.scoreTrack}>
        <MotiView
          from={{ width: '0%' }} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ type: 'timing', duration: 520 }}
          style={{ height: 4, borderRadius: 2, backgroundColor: tone }}
        />
      </View>
      <Text style={s.scoreWord}>{word}</Text>
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.canvas },

  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line,
  },
  barLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  barIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  barTitle: { fontFamily: font.display, fontSize: 15.5, color: c.ink },
  barSub: { fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 1 },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  segment: { flexDirection: 'row', backgroundColor: c.sunken, borderRadius: radius.sm, padding: 2 },
  segBtn: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: radius.sm - 2 },
  segBtnOn: { backgroundColor: c.surface },
  segText: { fontFamily: font.semibold, fontSize: 12.5, color: c.muted },
  segTextOn: { color: c.accent },

  zoomGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.sunken, borderRadius: radius.sm, padding: 2, gap: 1 },
  zoomBtn: { width: 30, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm - 2 },
  zoomOff: { opacity: 0.35 },
  zoomLabelBtn: { paddingHorizontal: 8, height: 28, justifyContent: 'center' },
  zoomLabel: { fontFamily: font.semibold, fontSize: 12, color: c.muted, fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'center' },
  iconBtn: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sunken },

  // Height is always passed explicitly by the caller. No flex:1 here on purpose:
  // in the narrow layout the stage sits inside a ScrollView, where a flex child
  // collapses to zero height and the document disappears entirely.
  stage: { backgroundColor: STAGE_BG, overflow: 'hidden' },
  stageEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 },
  stageEmptyText: { fontFamily: font.regular, fontSize: 13.5, color: '#9A9AA4', textAlign: 'center' },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.info, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.md, marginTop: 4 },
  openBtnText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },
  imgLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  // flexGrow/flexShrink 0 so the width above is honoured literally, not treated
  // as a starting size to grow from.
  panel: { flexGrow: 0, flexShrink: 0, backgroundColor: c.surface, borderLeftWidth: 1, borderLeftColor: c.line, borderTopWidth: 1, borderTopColor: c.line },
  sectionLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.9, textTransform: 'uppercase', color: c.subtle, marginTop: 18, marginBottom: 8 },

  metaBox: { backgroundColor: c.canvas, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, marginTop: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  metaLabel: { fontFamily: font.regular, fontSize: 12, color: c.muted },
  metaValue: { fontFamily: font.semibold, fontSize: 12.5, color: c.ink, flexShrink: 1, textAlign: 'right' },

  policy: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', backgroundColor: c.sunken, borderRadius: radius.md, padding: 11, marginTop: 12 },
  policyText: { flex: 1, fontFamily: font.regular, fontSize: 11.5, color: c.subtle, lineHeight: 16.5 },

  scoreRow: { flexDirection: 'row', gap: 9 },
  score: { flex: 1, backgroundColor: c.canvas, borderRadius: radius.md, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 11 },
  scoreLabel: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', color: c.subtle },
  scoreVal: { fontFamily: font.display, fontSize: 21, marginTop: 2, fontVariant: ['tabular-nums'] },
  scoreTrack: { height: 4, borderRadius: 2, backgroundColor: c.sunken, marginTop: 6, marginBottom: 5, overflow: 'hidden' },
  scoreWord: { fontFamily: font.regular, fontSize: 10.5, color: c.muted },

  fieldBox: { backgroundColor: c.canvas, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  fieldStack: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  fieldLabel: { fontFamily: font.regular, fontSize: 12, color: c.muted, flexShrink: 0, maxWidth: '46%' },
  fieldLabelStacked: { maxWidth: '100%', fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  fieldValue: { fontFamily: font.semibold, fontSize: 12.5, color: c.ink, flex: 1, textAlign: 'right' },
  fieldValueStacked: { flex: 0, textAlign: 'left', fontFamily: font.regular, lineHeight: 18 },
  fieldHint: { fontFamily: font.regular, fontSize: 11, color: c.subtle, marginTop: 8, lineHeight: 16 },
  emptyFields: { fontFamily: font.regular, fontSize: 12.5, color: c.subtle, lineHeight: 18 },

  warnBox: { backgroundColor: c.warnSoft, borderRadius: radius.md, borderWidth: 1, borderColor: c.warn + '44', padding: 11, marginTop: 16 },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  warnTitle: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.4, textTransform: 'uppercase', color: c.warn },
  warnText: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 18 },

  rejBox: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', backgroundColor: c.badSoft, borderRadius: radius.md, padding: 11, marginTop: 14 },
  rejText: { flex: 1, fontFamily: font.regular, fontSize: 12, color: c.bad, lineHeight: 17 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line,
  },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 15, borderRadius: radius.md, borderWidth: 1, borderColor: c.bad + '55' },
  flagText: { fontFamily: font.semibold, fontSize: 13, color: c.bad },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.md, backgroundColor: c.bad },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.md, backgroundColor: c.ok, minWidth: 140 },
  actText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },
  dim: { opacity: 0.5 },
});
