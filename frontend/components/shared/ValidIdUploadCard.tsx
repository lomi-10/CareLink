// components/shared/ValidIdUploadCard.tsx
// Valid ID document card with SEPARATE front & back uploads (one photo at a
// time). Used on both the helper and parent Documents screens. The AI scan is
// triggered by the host only once both sides are present.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

type PaletteKey = 'helper' | 'parent';

const PALETTE: Record<PaletteKey, {
  accent: string; ink: string; muted: string; subtle: string; line: string;
  lineEmpty: string; cardBg: string; aiBg: string; sideBg: string; sideBtnDone: string; success: string;
}> = {
  helper: {
    accent: '#E86019', ink: '#2A1608', muted: '#7A5C3E', subtle: '#B0A090', line: '#EFE2D0',
    lineEmpty: '#EAD9C0', cardBg: '#FFFFFF', aiBg: '#FEE2D5', sideBg: '#FBF3E6', sideBtnDone: '#F3E3CF', success: '#059669',
  },
  parent: {
    accent: '#C88B4A', ink: '#3B2A18', muted: '#7E6347', subtle: '#A68F73', line: '#F0E2CF',
    lineEmpty: '#EAD9C0', cardBg: '#FFFFFF', aiBg: '#F3E3CF', sideBg: '#FBF3E6', sideBtnDone: '#F3E3CF', success: '#059669',
  },
};

export function ValidIdUploadCard({
  doc, themeKey = 'helper', busy, onUploadSide, onOpen,
}: {
  doc: any | null;
  themeKey?: PaletteKey;
  busy: boolean;
  onUploadSide: (side: 'front' | 'back') => void;
  onOpen: () => void;
}) {
  const t = PALETTE[themeKey];
  const frontUp = !!doc?.file_url;
  const backUp  = !!doc?.file_url_back;
  const any  = frontUp || backUp;
  const both = frontUp && backUp;

  const status = doc?.status;
  const isVerified = status === 'Verified';
  const isRejected = status === 'Rejected';
  const scan = doc?.ai_verification_status;
  const scanned = scan && scan !== 'Unchecked';
  const uploadDate = doc?.uploaded_at
    ? new Date(doc.uploaded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <View style={[st.card, { backgroundColor: t.cardBg, borderColor: any ? t.line : t.lineEmpty, borderStyle: any ? 'solid' : 'dashed' }]}>
      <TouchableOpacity style={st.headerRow} activeOpacity={both ? 0.85 : 1} onPress={both ? onOpen : undefined} disabled={busy}>
        <View style={[st.icon, { backgroundColor: any ? '#DBEAFE' : '#F1E7D6' }]}>
          <Ionicons name="card-outline" size={22} color={any ? '#2563EB' : '#C2A988'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.name, { color: t.ink }]}>Valid ID</Text>
          {any ? (
            <View style={st.statusLine}>
              <View style={[st.pill, { backgroundColor: isVerified ? '#D1FAE5' : isRejected ? '#FECACA' : '#FEF3C7' }]}>
                <Text style={[st.pillText, { color: isVerified ? '#059669' : isRejected ? '#DC2626' : '#B45309' }]}>
                  {isVerified ? 'Verified ✓' : isRejected ? 'Rejected' : 'Pending'}
                </Text>
              </View>
              {scanned ? (
                <View style={[st.aiPill, { backgroundColor: t.aiBg }]}>
                  <Ionicons name="sparkles" size={10} color={t.accent} />
                  <Text style={[st.aiPillText, { color: t.accent }]}>AI {scan === 'Passed' ? 'verified' : 'checked'}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={[st.desc, { color: t.muted }]}>Government ID — upload the front and back separately.</Text>
          )}
          {any && uploadDate ? <Text style={[st.date, { color: t.subtle }]}>Uploaded {uploadDate}</Text> : null}
        </View>
        {both ? <Ionicons name="chevron-forward" size={18} color={t.muted} /> : null}
      </TouchableOpacity>

      {/* Front / Back — each its own upload */}
      <View style={st.sides}>
        {(['front', 'back'] as const).map((side) => {
          const done = side === 'front' ? frontUp : backUp;
          return (
            <View key={side} style={[st.sideRow, { backgroundColor: t.sideBg }]}>
              <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? t.success : '#C2A988'} />
              <Text style={[st.sideLabel, { color: t.ink }]}>{side === 'front' ? 'Front side' : 'Back side'}</Text>
              <TouchableOpacity
                onPress={() => onUploadSide(side)}
                disabled={busy}
                style={[st.sideBtn, { backgroundColor: done ? t.sideBtnDone : t.accent }]}
                activeOpacity={0.85}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={done ? t.muted : '#fff'} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={13} color={done ? t.muted : '#fff'} />
                    <Text style={[st.sideBtnText, { color: done ? t.muted : '#fff' }]}>{done ? 'Replace' : 'Upload'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 16, padding: 14, borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 1 },
      default: { boxShadow: '0 3px 10px rgba(139,94,60,0.05)' } as any,
    }),
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, marginBottom: 3 },
  desc: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, lineHeight: 16 },
  date: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, marginTop: 3 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  pillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  aiPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10 },

  sides: { marginTop: 12, gap: 8 },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12 },
  sideLabel: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },
  sideBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 13, paddingVertical: 7, minWidth: 92 },
  sideBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
});
