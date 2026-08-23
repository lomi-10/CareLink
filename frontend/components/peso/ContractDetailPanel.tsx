// components/peso/ContractDetailPanel.tsx
// The signed contract, in the right pane.
//
// PESO asked for this directly: pressing a contract card used to fire
// Linking.openURL and throw the officer out to a browser tab, losing the list,
// the filters and their place in it. The document is the thing they are
// reviewing — it belongs on the screen they are reviewing from.
//
// The PDF renders inline on web through an <iframe> (react-native-web goes
// through React DOM, so the browser's own reader handles scroll, search and
// print). Native has no inline PDF renderer available under Expo Go, so it gets
// an explicit Open button rather than a blank frame.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';

export type ContractRow = {
  application_id: number;
  job_post_id?: number;
  job_title: string;
  parent_name: string;
  helper_name: string;
  employer_signed_at: string | null;
  helper_signed_at: string | null;
  contract_generated_at?: string | null;
  template_version?: string | null;
  pdf_url: string | null;
};

const fmt = (v?: string | null) => {
  if (!v) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
};

export function ContractDetailPanel({ contract, onClose, showClose }: {
  contract: ContractRow | null;
  onClose?: () => void;
  showClose?: boolean;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const [loading, setLoading] = useState(true);

  if (!contract) {
    return (
      <View style={[s.panel, s.center]}>
        <View style={s.emptyIcon}><Ionicons name="document-text-outline" size={30} color={c.accent} /></View>
        <Text style={s.emptyTitle}>Select a contract</Text>
        <Text style={s.emptyBody}>Choose one on the left to read the signed agreement here.</Text>
      </View>
    );
  }

  const bothSigned = !!contract.employer_signed_at && !!contract.helper_signed_at;

  return (
    <View style={s.panel}>
      <View style={s.head}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.eyebrow}>
            APPLICATION #{contract.application_id}
            {contract.template_version ? `  ·  ${contract.template_version}` : ''}
          </Text>
          <Text style={s.title} numberOfLines={2}>{contract.job_title}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[s.pill, { backgroundColor: (bothSigned ? c.ok : c.warn) + '1A' }]}>
            <Ionicons name={bothSigned ? 'checkmark-circle' : 'time'} size={12} color={bothSigned ? c.ok : c.warn} />
            <Text style={[s.pillText, { color: bothSigned ? c.ok : c.warn }]}>
              {bothSigned ? 'Fully signed' : 'Awaiting a signature'}
            </Text>
          </View>
          {showClose && onClose && (
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={20} color={c.muted} /></Pressable>
          )}
        </View>
      </View>

      {/* Both signatures, side by side — the one fact that decides whether this
          agreement is in force at all. */}
      <View style={s.sigRow}>
        <SignatureCard role="Household Employer" name={contract.parent_name} at={contract.employer_signed_at} />
        <SignatureCard role="Helper" name={contract.helper_name} at={contract.helper_signed_at} />
      </View>

      {/* The document */}
      <View style={s.docStage}>
        {!contract.pdf_url ? (
          <View style={s.center}>
            <Ionicons name="document-outline" size={40} color={c.subtle} />
            <Text style={s.emptyBody}>No PDF was generated for this contract.</Text>
          </View>
        ) : Platform.OS === 'web' ? (
          <>
            {React.createElement('iframe', {
              src: contract.pdf_url,
              style: { width: '100%', height: '100%', border: 'none', background: '#2A2A2E' },
              title: `Contract for application ${contract.application_id}`,
              onLoad: () => setLoading(false),
            })}
            {loading && (
              <View style={[StyleSheet.absoluteFillObject, s.center]} pointerEvents="none">
                <ActivityIndicator size="large" color={c.accent} />
              </View>
            )}
          </>
        ) : (
          <View style={s.center}>
            <Ionicons name="document-text" size={48} color={c.info} />
            <Text style={s.emptyBody}>The signed contract is a PDF.</Text>
            <Pressable style={s.openBtn} onPress={() => Linking.openURL(contract.pdf_url!)}>
              <Ionicons name="open-outline" size={15} color="#fff" />
              <Text style={s.openBtnText}>Open contract</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={s.footer}>
        <Text style={s.footNote}>
          {contract.contract_generated_at ? `Generated ${fmt(contract.contract_generated_at)}` : 'Generation date not recorded'}
        </Text>
        <View style={{ flex: 1 }} />
        {!!contract.pdf_url && (
          <Pressable style={s.ghost} onPress={() => Linking.openURL(contract.pdf_url!)}>
            <Ionicons name="open-outline" size={15} color={c.accent} />
            <Text style={s.ghostText}>Open in new tab</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SignatureCard({ role, name, at }: { role: string; name: string; at: string | null }) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const signed = !!at;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 260 }}
      style={[s.sigCard, { borderColor: (signed ? c.ok : c.warn) + '44' }]}
    >
      <View style={s.sigTop}>
        <Ionicons name={signed ? 'shield-checkmark' : 'time-outline'} size={15} color={signed ? c.ok : c.warn} />
        <Text style={s.sigRole}>{role.toUpperCase()}</Text>
      </View>
      <Text style={s.sigName} numberOfLines={1}>{name || '—'}</Text>
      <Text style={[s.sigWhen, { color: signed ? c.muted : c.warn }]}>
        {signed ? `Signed ${fmt(at)}` : 'Not signed yet'}
      </Text>
    </MotiView>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  panel: { flex: 1, backgroundColor: c.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 11, padding: 32 },
  emptyIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontFamily: font.display, fontSize: 16, color: c.ink, textAlign: 'center' },
  emptyBody: { fontFamily: font.regular, fontSize: 13, color: c.muted, textAlign: 'center', maxWidth: 300, lineHeight: 19 },

  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: c.line },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.9, color: c.subtle, marginBottom: 3 },
  title: { fontFamily: font.display, fontSize: 18, color: c.ink, letterSpacing: -0.3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontFamily: font.semibold, fontSize: 11.5 },

  sigRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  sigCard: { flex: 1, minWidth: 0, backgroundColor: c.canvas, borderWidth: 1.2, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  sigTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  sigRole: { fontFamily: font.semibold, fontSize: 9.5, letterSpacing: 0.7, color: c.subtle },
  sigName: { fontFamily: font.semibold, fontSize: 13.5, color: c.ink },
  sigWhen: { fontFamily: font.regular, fontSize: 11.5, marginTop: 2 },

  docStage: { flex: 1, backgroundColor: '#2A2A2E', marginHorizontal: 16, borderRadius: radius.md, overflow: 'hidden' },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.info, paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.md, marginTop: 4 },
  openBtnText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  footNote: { fontFamily: font.regular, fontSize: 11.5, color: c.subtle },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1, borderColor: c.line },
  ghostText: { fontFamily: font.semibold, fontSize: 12.5, color: c.accent },
});
