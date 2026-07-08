// components/shared/DocumentAIScan.tsx
// In-screen AI document scan widget used on the Document Details screen (helper
// & parent). It auto-starts scanning the uploaded file with Gemini, plays an
// analysis animation inline, then shows a "View Scan Results" button that opens
// the polished results modal (extracted fields, legitimacy & clarity scores, AI
// confidence). Themed per role. PESO's manual review stays the final decision.

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Modal,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import API_URL from '@/constants/api';

// ─── Themes ─────────────────────────────────────────────────────────────────
export type ScanThemeKey = 'helper' | 'parent';

type ScanTheme = {
  accent: string; accentDeep: string; ink: string; pageBg: string; cardBg: string;
  success: string; successBg: string; muted: string; line: string; iconBg: string;
};

const THEMES: Record<ScanThemeKey, ScanTheme> = {
  helper: {
    accent: '#E86019', accentDeep: '#C24E12', ink: '#2A1608', pageBg: '#FBF5EC',
    cardBg: '#FFFFFF', success: '#1A7F4B', successBg: '#E6F4EC', muted: '#9A7B5A',
    line: '#EFE2D0', iconBg: '#FEE2D5',
  },
  parent: {
    accent: '#C88B4A', accentDeep: '#8B5A2B', ink: '#3B2A18', pageBg: '#FFF9F2',
    cardBg: '#FFFFFF', success: '#059669', successBg: '#ECFDF5', muted: '#7E6347',
    line: '#F0E2CF', iconBg: '#F3E3CF',
  },
};

type ScanField = { label: string; value: string };

export type ScanResult = {
  ai_verification_status?: string;
  verdict?: string;
  quality_score?: number | null;
  legitimacy_score?: number | null;
  is_expected?: boolean;
  document_guess?: string;
  document_type?: string;
  auto_rejected?: boolean;
  doc_status?: string;
  fields?: ScanField[];
  warnings?: any[];
};

const CHECKS = [
  { key: 'edges', label: 'Detecting document edges', icon: 'scan-outline' as const },
  { key: 'text', label: 'Extracting text & details', icon: 'text-outline' as const },
  { key: 'auth', label: 'Checking authenticity', icon: 'shield-checkmark-outline' as const },
  { key: 'clarity', label: 'Measuring clarity', icon: 'eye-outline' as const },
];

function scoreLabel(kind: 'legit' | 'clarity', v: number): { label: string; sub: string } {
  if (kind === 'legit') {
    if (v >= 90) return { label: 'Highly Legitimate', sub: 'No signs of tampering detected.' };
    if (v >= 70) return { label: 'Likely Legitimate', sub: 'Minor checks flagged for review.' };
    return { label: 'Needs Review', sub: 'Could not confirm authenticity.' };
  }
  if (v >= 85) return { label: 'Very Clear', sub: 'All details are readable.' };
  if (v >= 60) return { label: 'Readable', sub: 'Details are mostly readable.' };
  return { label: 'Low Clarity', sub: 'Consider a clearer photo.' };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── Public widget (placed on the Document Details screen) ────────────────────
export function DocumentAIScan({
  doc, themeKey = 'helper', autoStart = true, initialResult = null, onScanned,
}: {
  doc: any;
  themeKey?: ScanThemeKey;
  autoStart?: boolean;
  /** Persisted scan result from a previous scan — shown directly, no re-scan. */
  initialResult?: ScanResult | null;
  onScanned?: (result: ScanResult) => void;
}) {
  const t = THEMES[themeKey];
  // If we already have a stored scan, show it — never re-scan (that would drain
  // the AI). A fresh re-scan only happens after the user deletes and re-uploads.
  const hasStored = !!initialResult;
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done' | 'error'>(
    hasStored ? 'done' : autoStart ? 'scanning' : 'idle',
  );
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(initialResult);
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);

  const scanLine = useRef(new Animated.Value(0)).current;
  const startedRef = useRef(false);

  const isPdf = String(doc?.file_path || '').toLowerCase().endsWith('.pdf');
  const imgUri: string | null = !isPdf && doc?.file_url ? String(doc.file_url) : null;

  useEffect(() => {
    if (autoStart && !hasStored && !startedRef.current) {
      startedRef.current = true;
      runScan();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase === 'scanning') {
      scanLine.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLine, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scanLine, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const runScan = async () => {
    setPhase('scanning'); setStep(0); setErr(null); setResult(null);
    const t0 = Date.now();
    let timer: ReturnType<typeof setInterval> | null = null;
    let s = 0;
    timer = setInterval(() => { s += 1; setStep(s); if (timer && s >= CHECKS.length) clearInterval(timer); }, 650);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(raw || '{}')?.user_id || '');
      if (!userId) throw new Error('Please sign in again.');
      if (!doc?.document_id) throw new Error('This document is not uploaded yet.');

      const fetchPromise = (async () => {
        const res = await fetch(`${API_URL}/helper/scan_id.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: doc.document_id, user_id: userId, requester_id: userId }),
        });
        return res.json();
      })();

      const [data] = await Promise.all([fetchPromise, delay(2600)]);
      if (timer) clearInterval(timer);
      setStep(CHECKS.length);

      if (!data?.success) {
        setErr(data?.message || 'The scan could not be completed.');
        setPhase('error');
      } else {
        setResult(data);
        setElapsed((Date.now() - t0) / 1000);
        setPhase('done');
        onScanned?.(data);
      }
    } catch (e: any) {
      if (timer) clearInterval(timer);
      setErr(e?.message || 'Scan failed. Please try again.');
      setPhase('error');
    }
  };

  const legit = result?.legitimacy_score != null ? Math.round(Number(result.legitimacy_score)) : null;
  const clarity = result?.quality_score != null ? Math.round(Number(result.quality_score)) : null;
  const passed = result?.ai_verification_status === 'Passed';
  const failed = result?.ai_verification_status === 'Failed';

  // ── IDLE (not uploaded / manual) ──
  if (phase === 'idle') {
    return (
      <View style={[w.card, { backgroundColor: t.cardBg, borderColor: t.line }]}>
        <View style={[w.iconCircle, { backgroundColor: t.iconBg }]}>
          <Ionicons name="scan-outline" size={22} color={t.accent} />
        </View>
        <Text style={[w.title, { color: t.ink }]}>AI Document Scan</Text>
        <Text style={[w.sub, { color: t.muted }]}>Run an instant AI check to read and verify this document.</Text>
        <TouchableOpacity style={[w.btnFilled, { backgroundColor: t.accent }]} onPress={runScan} activeOpacity={0.88}>
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={w.btnFilledText}>Start AI Scan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── SCANNING (inline animation) ──
  if (phase === 'scanning') {
    return (
      <View style={[w.card, { backgroundColor: t.cardBg, borderColor: t.line }]}>
        <View style={w.scanStage}>
          {imgUri ? (
            <Image source={{ uri: imgUri }} style={w.scanImg} contentFit="cover" />
          ) : (
            <View style={[w.scanImg, { backgroundColor: t.accentDeep, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="document-text-outline" size={44} color="#fff" />
            </View>
          )}
          <View style={[w.corner, w.cTL, { borderColor: t.accent }]} />
          <View style={[w.corner, w.cTR, { borderColor: t.accent }]} />
          <View style={[w.corner, w.cBL, { borderColor: t.accent }]} />
          <View style={[w.corner, w.cBR, { borderColor: t.accent }]} />
          <Animated.View
            style={[
              w.scanLine,
              { backgroundColor: t.accent, transform: [{ translateY: scanLine.interpolate({ inputRange: [0, 1], outputRange: [10, 180] }) }] },
            ]}
          />
          <View style={w.scanTag}>
            <View style={[w.tagDot, { backgroundColor: t.accent }]} />
            <Text style={w.scanTagText}>Scanning document…</Text>
          </View>
        </View>

        <Text style={[w.analyzing, { color: t.ink }]}>AI is analyzing your document</Text>
        <Text style={[w.sub, { color: t.muted }]}>Please hold still and ensure good lighting.</Text>

        <View style={w.dotsRow}>
          {CHECKS.map((_, i) => (
            <View key={i} style={[w.progressDot, { backgroundColor: i <= step ? t.accent : t.line }]} />
          ))}
        </View>

        <View style={[w.checkList, { borderTopColor: t.line }]}>
          {CHECKS.map((c, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <View key={c.key} style={w.checkRow}>
                <Ionicons name={c.icon} size={17} color={done ? t.success : active ? t.accent : t.muted} />
                <Text style={[w.checkLabel, { color: t.ink }]}>{c.label}</Text>
                {done ? (
                  <Ionicons name="checkmark-circle" size={17} color={t.success} />
                ) : active ? (
                  <ActivityIndicator size="small" color={t.accent} />
                ) : (
                  <Ionicons name="time-outline" size={17} color={t.muted} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // ── ERROR ──
  if (phase === 'error') {
    return (
      <View style={[w.card, { backgroundColor: t.cardBg, borderColor: t.line }]}>
        <View style={[w.iconCircle, { backgroundColor: '#FDECEA' }]}>
          <Ionicons name="alert-circle" size={24} color="#B42318" />
        </View>
        <Text style={[w.title, { color: t.ink }]}>Scan didn’t complete</Text>
        <Text style={[w.sub, { color: t.muted }]}>{err}</Text>
        <TouchableOpacity style={[w.btnFilled, { backgroundColor: t.accent }]} onPress={runScan} activeOpacity={0.88}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={w.btnFilledText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── DONE (summary + open results) ──
  return (
    <View style={[w.card, { backgroundColor: t.cardBg, borderColor: t.line }]}>
      <View style={w.doneTop}>
        <View style={[w.iconCircle, { backgroundColor: failed ? '#FDECEA' : t.successBg, marginBottom: 0 }]}>
          <Ionicons name={failed ? 'alert-circle' : 'checkmark-circle'} size={22} color={failed ? '#B42318' : t.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[w.doneTitle, { color: t.ink }]}>
            {passed ? 'Scan complete' : failed ? 'Needs a clearer copy' : 'Scan complete — for review'}
          </Text>
          <Text style={[w.sub, { color: t.muted, marginTop: 2 }]}>
            {failed ? 'The AI could not confirm this document.' : 'AI read your document. Tap below to review.'}
          </Text>
        </View>
      </View>

      {(legit != null || clarity != null) && (
        <View style={w.miniRow}>
          {legit != null && (
            <View style={[w.miniScore, { backgroundColor: t.successBg }]}>
              <Text style={[w.miniBig, { color: t.ink }]}>{legit}%</Text>
              <Text style={[w.miniLabel, { color: t.muted }]}>Legitimacy</Text>
            </View>
          )}
          {clarity != null && (
            <View style={[w.miniScore, { backgroundColor: t.iconBg }]}>
              <Text style={[w.miniBig, { color: t.ink }]}>{clarity}%</Text>
              <Text style={[w.miniLabel, { color: t.muted }]}>Clarity</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={[w.btnFilled, { backgroundColor: t.accent }]} onPress={() => setShowResults(true)} activeOpacity={0.88}>
        <Ionicons name="reader-outline" size={16} color="#fff" />
        <Text style={w.btnFilledText}>Scan Results</Text>
      </TouchableOpacity>
      {failed && (
        <Text style={[w.sub, { color: t.muted, textAlign: 'center', marginTop: 8 }]}>
          To try again, delete this document and upload a clearer copy.
        </Text>
      )}

      <ScanResultsModal
        visible={showResults}
        onClose={() => setShowResults(false)}
        t={t}
        result={result}
        imgUri={imgUri}
        elapsed={elapsed}
      />
    </View>
  );
}

// ─── Results modal (screenshot reference) ─────────────────────────────────────
function ScanResultsModal({
  visible, onClose, t, result, imgUri, elapsed,
}: {
  visible: boolean;
  onClose: () => void;
  t: ScanTheme;
  result: ScanResult | null;
  imgUri: string | null;
  elapsed: number | null;
}) {
  const legit = result?.legitimacy_score != null ? Math.round(Number(result.legitimacy_score)) : null;
  const clarity = result?.quality_score != null ? Math.round(Number(result.quality_score)) : null;
  const passed = result?.ai_verification_status === 'Passed';
  const fields: ScanField[] = Array.isArray(result?.fields) ? (result!.fields as ScanField[]) : [];
  const docLabel = result?.document_type || 'Document';
  const warnings: string[] = Array.isArray(result?.warnings) ? (result!.warnings as string[]) : [];

  const confidence = legit != null && clarity != null ? Math.round((legit + clarity) / 2) : (legit ?? clarity ?? null);
  const confDots = confidence != null ? Math.max(1, Math.min(5, Math.round(confidence / 20))) : 0;
  const confLabel = confidence == null ? '' : confidence >= 80 ? 'High Confidence' : confidence >= 55 ? 'Medium Confidence' : 'Low Confidence';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[r.page, { backgroundColor: t.pageBg }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={r.header}>
            <TouchableOpacity style={r.headerBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="arrow-back" size={22} color={t.ink} />
            </TouchableOpacity>
            <Text style={[r.headerTitle, { color: t.ink }]}>Scan Results</Text>
            <View style={[r.shield, { backgroundColor: t.successBg }]}>
              <Ionicons name="shield-checkmark" size={18} color={t.success} />
            </View>
          </View>
          <Text style={[r.headerSub, { color: t.muted }]}>AI scan complete. Please review the extracted details.</Text>

          <ScrollView contentContainerStyle={r.scroll} showsVerticalScrollIndicator={false}>
            {/* success banner */}
            <View style={[r.banner, { backgroundColor: t.successBg }]}>
              <Ionicons name={passed ? 'checkmark-circle' : 'information-circle'} size={22} color={t.success} />
              <View style={{ flex: 1 }}>
                <Text style={[r.bannerTitle, { color: t.success }]}>
                  {passed ? 'Document scanned successfully' : 'Scan complete — needs review'}
                </Text>
                <Text style={[r.bannerSub, { color: t.muted }]}>
                  AI verification completed{elapsed != null ? ` in ${elapsed.toFixed(1)}s` : ''}.
                </Text>
              </View>
              <View style={[r.shieldSm, { backgroundColor: t.success }]}>
                <Ionicons name="shield-checkmark" size={14} color="#fff" />
              </View>
            </View>

            {/* two-column card */}
            <View style={[r.card, { backgroundColor: t.cardBg, borderColor: t.line }]}>
              <View style={r.cols}>
                {/* LEFT: image + score cards */}
                <View style={r.colLeft}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={r.idImg} contentFit="cover" />
                  ) : (
                    <View style={[r.idImg, { backgroundColor: t.accentDeep, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="document-text-outline" size={36} color="#fff" />
                    </View>
                  )}

                  {legit != null && (
                    <View style={[r.scoreCard, { backgroundColor: t.successBg }]}>
                      <View style={[r.scoreIcon, { backgroundColor: t.success }]}>
                        <Ionicons name="shield-checkmark" size={14} color="#fff" />
                      </View>
                      <Text style={[r.scoreLabel, { color: t.muted }]}>Legitimacy Score</Text>
                      <Text style={[r.scoreBig, { color: t.ink }]}>{legit}%</Text>
                      <Text style={[r.scoreTag, { color: t.success }]}>{scoreLabel('legit', legit).label}</Text>
                      <Text style={[r.scoreSub, { color: t.muted }]}>{scoreLabel('legit', legit).sub}</Text>
                    </View>
                  )}
                  {clarity != null && (
                    <View style={[r.scoreCard, { backgroundColor: t.iconBg }]}>
                      <View style={[r.scoreIcon, { backgroundColor: t.accent }]}>
                        <Ionicons name="sparkles" size={14} color="#fff" />
                      </View>
                      <Text style={[r.scoreLabel, { color: t.muted }]}>Clarity Score</Text>
                      <Text style={[r.scoreBig, { color: t.ink }]}>{clarity}%</Text>
                      <Text style={[r.scoreTag, { color: t.accentDeep }]}>{scoreLabel('clarity', clarity).label}</Text>
                      <Text style={[r.scoreSub, { color: t.muted }]}>{scoreLabel('clarity', clarity).sub}</Text>
                    </View>
                  )}
                </View>

                {/* RIGHT: extracted fields */}
                <View style={r.colRight}>
                  <DetailRow label="Document Type" value={docLabel} t={t} first />
                  {fields.map((f, i) => (
                    <DetailRow key={`${f.label}-${i}`} label={f.label} value={f.value} t={t} />
                  ))}
                  {fields.length === 0 && (
                    <Text style={[r.noFields, { color: t.muted }]}>No fields could be read from this document.</Text>
                  )}
                </View>
              </View>
            </View>

            {/* warnings (if any) */}
            {warnings.length > 0 && (
              <View style={[r.warnCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Ionicons name="warning-outline" size={18} color="#C2410C" />
                <View style={{ flex: 1 }}>
                  <Text style={[r.warnTitle, { color: '#9A3412' }]}>Flagged for review</Text>
                  {warnings.map((wn, i) => (
                    <Text key={i} style={[r.warnItem, { color: '#9A3412' }]}>• {wn}</Text>
                  ))}
                </View>
              </View>
            )}

            {/* AI confidence */}
            {confidence != null && (
              <View style={[r.confRow, { backgroundColor: t.cardBg, borderColor: t.line }]}>
                <Ionicons name="information-circle" size={18} color={t.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[r.confTitle, { color: t.ink }]}>AI Confidence</Text>
                  <Text style={[r.confSub, { color: t.muted }]}>Our AI has {confidence >= 80 ? 'high' : confidence >= 55 ? 'medium' : 'low'} confidence in the extracted information.</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <View key={i} style={[r.confDot, { backgroundColor: i < confDots ? t.accent : t.line }]} />
                    ))}
                  </View>
                  <Text style={[r.confLabel, { color: t.accent }]}>{confLabel}</Text>
                </View>
              </View>
            )}

            {/* actions */}
            <View style={r.actions}>
              <TouchableOpacity style={[r.btnFilled, { backgroundColor: t.accent, flex: 1 }]} onPress={onClose} activeOpacity={0.88}>
                <Text style={r.btnFilledText}>Continue</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, t, first }: { label: string; value: string; t: ScanTheme; first?: boolean }) {
  return (
    <View style={[r.detailRow, !first && { borderTopWidth: 1, borderTopColor: t.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={[r.detailLabel, { color: t.muted }]}>{label}</Text>
        <Text style={[r.detailValue, { color: t.ink }]}>{value}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={16} color={t.success} />
    </View>
  );
}

// ─── Styles: inline widget ────────────────────────────────────────────────────
const w = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 18, alignItems: 'center', gap: 4 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
  btnFilled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 13, alignSelf: 'stretch', marginTop: 14 },
  btnFilledText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, marginTop: 2 },
  linkText: { fontSize: 13, fontWeight: '600' },

  // scanning
  scanStage: { width: '100%', height: 200, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  scanImg: { width: '100%', height: '100%' },
  corner: { position: 'absolute', width: 26, height: 26, borderWidth: 3 },
  cTL: { top: 8, left: 8, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cTR: { top: 8, right: 8, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cBL: { bottom: 8, left: 8, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cBR: { bottom: 8, right: 8, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: { position: 'absolute', left: 8, right: 8, height: 2.5, borderRadius: 2, opacity: 0.9 },
  scanTag: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  scanTagText: { color: '#fff', fontSize: 11.5, fontWeight: '700' },
  analyzing: { fontSize: 15.5, fontWeight: '800', marginTop: 2 },
  dotsRow: { flexDirection: 'row', gap: 7, marginVertical: 12 },
  progressDot: { width: 7, height: 7, borderRadius: 4 },
  checkList: { alignSelf: 'stretch', borderTopWidth: 1, paddingTop: 12, gap: 11 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { flex: 1, fontSize: 13, fontWeight: '600' },

  // done
  doneTop: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  doneTitle: { fontSize: 15.5, fontWeight: '800' },
  miniRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 14 },
  miniScore: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  miniBig: { fontSize: 20, fontWeight: '900' },
  miniLabel: { fontSize: 11.5, fontWeight: '700', marginTop: 1 },
});

// ─── Styles: results modal ────────────────────────────────────────────────────
const r = StyleSheet.create({
  page: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  shield: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 12.5, textAlign: 'center', paddingHorizontal: 24, marginBottom: 6 },
  scroll: { padding: 16, paddingBottom: 36 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 14, padding: 13, marginBottom: 14 },
  bannerTitle: { fontSize: 14, fontWeight: '800' },
  bannerSub: { fontSize: 11.5, marginTop: 1 },
  shieldSm: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  card: { borderWidth: 1, borderRadius: 18, padding: 14 },
  cols: { flexDirection: 'row', gap: 12 },
  colLeft: { width: 130, gap: 10 },
  colRight: { flex: 1 },
  idImg: { width: '100%', height: 96, borderRadius: 10 },

  scoreCard: { borderRadius: 12, padding: 11 },
  scoreIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  scoreLabel: { fontSize: 10.5, fontWeight: '700' },
  scoreBig: { fontSize: 24, fontWeight: '900', marginTop: 1 },
  scoreTag: { fontSize: 11.5, fontWeight: '800', marginTop: 1 },
  scoreSub: { fontSize: 10, marginTop: 2, lineHeight: 13 },

  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
  detailLabel: { fontSize: 10.5, fontWeight: '600' },
  detailValue: { fontSize: 13.5, fontWeight: '700', marginTop: 1 },
  noFields: { fontSize: 12.5, paddingVertical: 12, textAlign: 'center' },

  warnCard: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 },
  warnTitle: { fontSize: 13, fontWeight: '800', marginBottom: 3 },
  warnItem: { fontSize: 12, lineHeight: 17 },

  confRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 14, padding: 13, marginTop: 14 },
  confTitle: { fontSize: 13.5, fontWeight: '800' },
  confSub: { fontSize: 11, marginTop: 1, lineHeight: 15 },
  confDot: { width: 9, height: 9, borderRadius: 5 },
  confLabel: { fontSize: 11, fontWeight: '800' },

  actions: { flexDirection: 'row', gap: 11, marginTop: 18 },
  btnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 13, borderWidth: 1.5 },
  btnOutlineText: { fontSize: 14, fontWeight: '800' },
  btnFilled: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 13 },
  btnFilledText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
