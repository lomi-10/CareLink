// components/peso/CredentialReviewSection.tsx
// One account's credentials, laid out for a PESO officer to review: the seal
// wall first, then a card per document with the AI pre-check, any open flags,
// and the actions.
//
// Shared because two screens ask the same question of the same data — Job
// Verification asks it about the employer behind a posting, Applications asks it
// about both parties in a case. They were built at different times and had
// started to drift; one component keeps the review surface identical wherever an
// officer meets it.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';
import { CredentialBadge, CredentialWall, credentialStateFor } from '../shared/CredentialBadge';
import { credentialSpec, type CredentialRole } from '@/constants/credentials';

export type ReviewDoc = {
  document_id: number | string;
  document_type?: string | null;
  id_type?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
  uploaded_at?: string | null;
  verified_at?: string | null;
  file_url?: string | null;
  file_url_back?: string | null;
  is_pdf?: boolean;
  ai_confidence_score?: number | null;
  ai_legitimacy_score?: number | null;
  ai_warnings?: string[];
  ai_fields?: Array<{ label?: string; value?: any }>;
  /** Applications only: has this employer been given access to this document? */
  shared_with_employer?: boolean;
};

export function CredentialReviewSection({
  title, subtitle, role, documents, flags, onView, onFlag, showSharing,
}: {
  title?: string;
  subtitle?: string;
  role: CredentialRole;
  documents: ReviewDoc[];
  flags?: any[];
  onView: (doc: ReviewDoc, side: 'front' | 'back') => void;
  onFlag?: (doc: ReviewDoc) => void;
  /** Show the "shared with employer / PESO only" marker on each card. */
  showSharing?: boolean;
}) {
  const { c, dark } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const openFlags = flags ?? [];

  return (
    <View>
      {!!title && (
        <View style={s.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>{title}</Text>
            {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      )}

      {openFlags.length > 0 && (
        <View style={s.flagBanner}>
          <Ionicons name="flag" size={15} color={c.bad} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.flagTitle}>{openFlags.length} open flag{openFlags.length !== 1 ? 's' : ''}</Text>
            {openFlags.slice(0, 3).map((f: any) => (
              <Text key={f.flag_id} style={s.flagLine} numberOfLines={2}>
                • {f.document_type ? `${f.document_type}: ` : ''}{f.reason}
                {f.flagged_by_name ? `  — ${f.flagged_by_name}` : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={s.wallBox}>
        <CredentialWall documents={documents} role={role} dark={dark} title={null} />
      </View>

      {documents.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="document-outline" size={30} color={c.subtle} />
          <Text style={s.emptyText}>No documents on file for this account.</Text>
        </View>
      ) : documents.map((doc, i) => {
        const state = credentialStateFor(doc, doc.document_type);
        const spec = credentialSpec(doc.document_type);
        const tone = state === 'sealed' ? c.ok : state === 'flagged' ? c.bad : c.warn;
        const legit = doc.ai_legitimacy_score != null ? Math.round(Number(doc.ai_legitimacy_score)) : null;
        const clarity = doc.ai_confidence_score != null ? Math.round(Number(doc.ai_confidence_score)) : null;
        const warnings = doc.ai_warnings ?? [];

        return (
          <MotiView
            key={String(doc.document_id)}
            from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 260, delay: Math.min(i * 55, 250) }}
            style={[s.card, { borderColor: tone + '3D' }]}
          >
            <View style={s.cardTop}>
              <View style={[s.icon, { backgroundColor: tone + '1A' }]}>
                <Ionicons name={spec.icon} size={18} color={tone} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.docTitle}>{doc.document_type}</Text>
                {!!doc.id_type && <Text style={s.docSub}>{doc.id_type}</Text>}
                <Text style={s.docDate}>
                  Uploaded {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
                </Text>
              </View>
              <CredentialBadge documentType={doc.document_type} state={state} size="sm" dark={dark} style={{ maxWidth: 170 }} />
            </View>

            {/* "PESO holds this" and "the household has seen this" are different
                facts, and the sharing policy turns on the difference. */}
            {showSharing && (
              <View style={[s.shareTag, doc.shared_with_employer ? { backgroundColor: c.infoSoft } : { backgroundColor: c.sunken }]}>
                <Ionicons
                  name={doc.shared_with_employer ? 'eye-outline' : 'lock-closed-outline'}
                  size={12}
                  color={doc.shared_with_employer ? c.info : c.subtle}
                />
                <Text style={[s.shareText, { color: doc.shared_with_employer ? c.info : c.subtle }]}>
                  {doc.shared_with_employer
                    ? 'Shared with this employer'
                    : 'PESO only — the employer cannot see this'}
                </Text>
              </View>
            )}

            {!spec.pesoVerifiable && <Text style={s.policy}>{spec.blurb}</Text>}

            {(legit != null || clarity != null) && (
              <View style={s.scoreRow}>
                {legit != null && <Score label="Legitimacy" value={legit} />}
                {clarity != null && <Score label="Clarity" value={clarity} />}
              </View>
            )}

            {warnings.length > 0 && (
              <View style={s.warnBox}>
                <View style={s.warnHead}>
                  <Ionicons name="warning" size={13} color={c.warn} />
                  <Text style={s.warnTitle}>AI pre-check flagged this</Text>
                </View>
                {warnings.map((w, k) => <Text key={k} style={s.warnText}>• {w}</Text>)}
              </View>
            )}

            {doc.status === 'Rejected' && !!doc.rejection_reason && (
              <View style={s.rejBox}>
                <Ionicons name="information-circle-outline" size={13} color={c.bad} />
                <Text style={s.rejText}>{doc.rejection_reason}</Text>
              </View>
            )}

            <View style={s.actions}>
              <Pressable style={s.viewBtn} onPress={() => onView(doc, 'front')}>
                <Ionicons name="eye-outline" size={15} color={c.info} />
                <Text style={s.viewText}>{doc.file_url_back ? 'View front' : 'View'}</Text>
              </Pressable>
              {!!doc.file_url_back && (
                <Pressable style={s.viewBtn} onPress={() => onView(doc, 'back')}>
                  <Ionicons name="eye-outline" size={15} color={c.info} />
                  <Text style={s.viewText}>View back</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              {onFlag && (
                <Pressable style={s.flagBtn} onPress={() => onFlag(doc)}>
                  <Ionicons name="flag-outline" size={15} color={c.bad} />
                  <Text style={s.flagBtnText}>Flag as altered</Text>
                </Pressable>
              )}
            </View>
          </MotiView>
        );
      })}
    </View>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const tone = value >= 85 ? c.ok : value >= 60 ? c.warn : c.bad;
  return (
    <View style={[s.score, { borderColor: tone + '33' }]}>
      <Text style={s.scoreLabel}>{label}</Text>
      <Text style={[s.scoreVal, { color: tone }]}>{value}%</Text>
      <View style={s.scoreTrack}>
        <View style={{ height: 4, borderRadius: 2, width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: tone }} />
      </View>
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  head: { marginBottom: 11 },
  title: { fontFamily: font.semibold, fontSize: 13.5, color: c.ink },
  subtitle: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 2, lineHeight: 16.5 },

  flagBanner: { flexDirection: 'row', gap: 9, backgroundColor: c.badSoft, borderWidth: 1, borderColor: c.bad + '44', borderRadius: radius.md, padding: 12, marginBottom: 11 },
  flagTitle: { fontFamily: font.semibold, fontSize: 12.5, color: c.bad, marginBottom: 3 },
  flagLine: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, lineHeight: 16.5 },

  wallBox: { backgroundColor: c.canvas, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 13, marginBottom: 12 },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { fontFamily: font.regular, fontSize: 12.5, color: c.muted },

  card: { backgroundColor: c.canvas, borderWidth: 1, borderRadius: radius.lg, padding: 13, marginBottom: 10 },
  cardTop: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', flexWrap: 'wrap' },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: font.semibold, fontSize: 13.5, color: c.ink },
  docSub: { fontFamily: font.regular, fontSize: 11.5, color: c.muted, marginTop: 1 },
  docDate: { fontFamily: font.regular, fontSize: 11, color: c.subtle, marginTop: 2 },

  shareTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, marginTop: 10 },
  shareText: { fontFamily: font.semibold, fontSize: 11 },

  policy: { fontFamily: font.regular, fontSize: 11.5, color: c.subtle, lineHeight: 16.5, marginTop: 10 },

  scoreRow: { flexDirection: 'row', gap: 9, marginTop: 11 },
  score: { flex: 1, borderRadius: radius.md, borderWidth: 1, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: c.surface },
  scoreLabel: { fontFamily: font.semibold, fontSize: 10, color: c.subtle, textTransform: 'uppercase', letterSpacing: 0.4 },
  scoreVal: { fontFamily: font.display, fontSize: 17, marginTop: 1, fontVariant: ['tabular-nums'] },
  scoreTrack: { height: 4, borderRadius: 2, backgroundColor: c.sunken, marginTop: 6, overflow: 'hidden' },

  warnBox: { marginTop: 10, backgroundColor: c.warnSoft, borderRadius: radius.md, padding: 11, borderWidth: 1, borderColor: c.warn + '44' },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  warnTitle: { fontFamily: font.semibold, fontSize: 10.5, color: c.warn, textTransform: 'uppercase', letterSpacing: 0.4 },
  warnText: { fontFamily: font.regular, fontSize: 12.5, color: c.ink, lineHeight: 18 },

  rejBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 10, backgroundColor: c.badSoft, borderRadius: radius.sm, padding: 9 },
  rejText: { flex: 1, fontFamily: font.regular, fontSize: 11.5, color: c.bad, lineHeight: 16 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: radius.sm, borderWidth: 1, borderColor: c.info + '55' },
  viewText: { fontFamily: font.semibold, fontSize: 12.5, color: c.info },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: radius.sm, borderWidth: 1, borderColor: c.bad + '55' },
  flagBtnText: { fontFamily: font.semibold, fontSize: 12.5, color: c.bad },
});
