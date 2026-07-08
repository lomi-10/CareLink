// components/shared/VerificationHistoryList.tsx
// Real verification history for the Documents screen (helper & parent): for each
// uploaded document it shows a timeline of what happened — uploaded, AI scan
// result (with legitimacy/clarity), and PESO's decision — instead of an empty
// placeholder.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

type PaletteKey = 'helper' | 'parent';

const PALETTE: Record<PaletteKey, { accent: string; ink: string; muted: string; subtle: string; line: string; cardBg: string }> = {
  helper: { accent: '#E86019', ink: '#2A1608', muted: '#7A5C3E', subtle: '#B0A090', line: '#EFE2D0', cardBg: '#FFFFFF' },
  parent: { accent: '#C88B4A', ink: '#3B2A18', muted: '#7E6347', subtle: '#A68F73', line: '#F0E2CF', cardBg: '#FFFFFF' },
};

const GREEN = '#059669';
const DANGER = '#DC2626';
const AMBER = '#B45309';

type EventRow = { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; date?: string | null; sub?: string | null };

function fmtDateTime(v?: string | null): string | null {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function aiLabel(status?: string): string {
  if (status === 'Passed') return 'Looks genuine';
  if (status === 'Flagged') return 'Flagged for review';
  if (status === 'Failed')  return 'Could not confirm';
  return 'Checked';
}

export function VerificationHistoryList({ documents, themeKey = 'helper' }: {
  documents: any[];
  themeKey?: PaletteKey;
}) {
  const t = PALETTE[themeKey];
  const docs = (documents ?? []).filter((d) => d && (d.file_url || d.file_path || d.status));

  if (docs.length === 0) {
    return (
      <View style={[st.empty, { backgroundColor: t.cardBg, borderColor: t.line }]}>
        <View style={[st.emptyIcon, { backgroundColor: '#F5EDE0' }]}>
          <Ionicons name="time-outline" size={30} color={t.subtle} />
        </View>
        <Text style={[st.emptyTitle, { color: t.ink }]}>No history yet</Text>
        <Text style={[st.emptySub, { color: t.muted }]}>
          Once you upload documents, every AI scan and PESO verification action will be logged here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {docs.map((doc) => {
        const status = doc.status;
        const isVerified = status === 'Verified';
        const isRejected = status === 'Rejected';

        const legit = doc?.ai_extracted_data?.legitimacy_score;
        const clarity = doc?.ai_confidence_score;
        const scored = [
          legit != null ? `Legitimacy ${Math.round(Number(legit))}%` : null,
          clarity != null ? `Clarity ${Math.round(Number(clarity))}%` : null,
        ].filter(Boolean).join(' · ');

        const events: EventRow[] = [];
        if (doc.uploaded_at) {
          events.push({ icon: 'cloud-upload-outline', color: t.muted, title: 'Uploaded', date: doc.uploaded_at });
        }
        if (doc.ai_verification_status && doc.ai_verification_status !== 'Unchecked') {
          events.push({
            icon: 'sparkles',
            color: t.accent,
            title: `AI scan — ${aiLabel(doc.ai_verification_status)}`,
            date: doc.ai_checked_at,
            sub: scored || null,
          });
        }
        if (isVerified) {
          events.push({
            icon: 'shield-checkmark',
            color: GREEN,
            title: doc.verified_by ? `Verified by PESO — ${doc.verified_by}` : 'Verified by PESO',
            date: doc.verified_at,
          });
        } else if (isRejected) {
          events.push({
            icon: 'close-circle',
            color: DANGER,
            title: 'Rejected',
            date: doc.verified_at || doc.ai_checked_at,
            sub: doc.rejection_reason || null,
          });
        }

        return (
          <View key={doc.document_id ?? doc.document_type} style={[st.card, { backgroundColor: t.cardBg, borderColor: t.line }]}>
            <View style={st.cardHead}>
              <Text style={[st.docType, { color: t.ink }]}>{doc.document_type}</Text>
              <View style={[st.pill, { backgroundColor: isVerified ? '#D1FAE5' : isRejected ? '#FECACA' : '#FEF3C7' }]}>
                <Text style={[st.pillText, { color: isVerified ? GREEN : isRejected ? DANGER : AMBER }]}>
                  {isVerified ? 'Verified' : isRejected ? 'Rejected' : 'Pending'}
                </Text>
              </View>
            </View>

            <View style={st.timeline}>
              {events.map((e, i) => (
                <View key={i} style={st.eventRow}>
                  <View style={st.railCol}>
                    <View style={[st.dot, { backgroundColor: e.color }]}>
                      <Ionicons name={e.icon} size={11} color="#fff" />
                    </View>
                    {i < events.length - 1 ? <View style={[st.railLine, { backgroundColor: t.line }]} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < events.length - 1 ? 12 : 0 }}>
                    <Text style={[st.eventTitle, { color: t.ink }]}>{e.title}</Text>
                    {e.sub ? <Text style={[st.eventSub, { color: t.muted }]}>{e.sub}</Text> : null}
                    {fmtDateTime(e.date) ? <Text style={[st.eventDate, { color: t.subtle }]}>{fmtDateTime(e.date)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 16, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 1 },
      default: { boxShadow: '0 3px 10px rgba(139,94,60,0.05)' } as any,
    }),
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  docType: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  timeline: {},
  eventRow: { flexDirection: 'row', gap: 12 },
  railCol: { alignItems: 'center', width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  railLine: { width: 2, flex: 1, marginTop: 2, borderRadius: 1 },
  eventTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
  eventSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, marginTop: 2, lineHeight: 16 },
  eventDate: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, marginTop: 2 },

  empty: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: 'center' },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, marginBottom: 6 },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
