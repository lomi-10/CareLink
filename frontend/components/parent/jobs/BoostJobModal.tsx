// components/parent/jobs/BoostJobModal.tsx
// Stream 1 — Featured Job Post Placement (₱99, 7 days).
//
// The copy here is deliberately plain about what the money does and does not
// buy. Boosting moves a post up the list; it does not change how well a helper
// matches it, and it does not skip PESO review. Saying so up front is both the
// honest thing and what keeps the feature defensible.

import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

const BROWN = '#8B5A2B';
const DARK = '#2A1608';
const MUTED = '#7A5C3E';
const AMBER = '#C97A0E';

export function BoostJobModal({
  visible, onClose, jobPostId, jobTitle, onBoosted,
}: {
  visible: boolean;
  onClose: () => void;
  jobPostId: string | number | null;
  jobTitle?: string;
  /** Called when a boost was applied instantly via a Plus credit. */
  onBoosted?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Boosts are bundled into CareLink Plus, so a subscriber must not be shown a
  // price they won't be charged. Load their credit balance before offering one.
  const [credits, setCredits] = useState<number | null>(null);

  React.useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        const id = String((raw ? JSON.parse(raw) : {})?.user_id ?? '');
        if (!id) return;
        const res = await fetch(`${API_URL}/parent/subscribe.php?parent_id=${id}&requester_id=${id}`);
        const data = await res.json();
        setCredits(data?.plus?.is_plus ? Number(data.plus.featured_credits ?? 0) : null);
      } catch { setCredits(null); }
    })();
  }, [visible]);

  const usesCredit = credits !== null && credits > 0;

  const close = () => { setError(null); setBusy(false); onClose(); };

  const start = async () => {
    if (!jobPostId) return;
    setBusy(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const userId = String(user.user_id ?? '');
      if (!userId) throw new Error('Please sign in again.');

      const res = await fetch(`${API_URL}/parent/boost_job_post.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_post_id: jobPostId,
          parent_id: userId,
          requester_id: userId,
          return_url: Platform.OS === 'web' ? window.location.href : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not start the boost.');

      // A Plus credit applies immediately — there's nothing to pay for.
      if (data.used_credit || data.already_featured) {
        onBoosted?.();
        close();
        return;
      }
      if (data.checkout_url) {
        // Hosted checkout: card details never reach CareLink.
        await Linking.openURL(data.checkout_url);
        close();
        return;
      }
      throw new Error('Payment could not be started.');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="megaphone" size={34} color={AMBER} />
          </View>

          <Text style={s.title}>Feature this job post</Text>
          {!!jobTitle && <Text style={s.sub} numberOfLines={2}>{jobTitle}</Text>}

          {usesCredit ? (
            <View style={s.includedPill}>
              <Ionicons name="star" size={14} color="#8A5A0E" />
              <Text style={s.includedText}>
                Included in CareLink Plus · {credits} boost{credits === 1 ? '' : 's'} left this month
              </Text>
            </View>
          ) : (
            <View style={s.priceRow}>
              <Text style={s.price}>₱99</Text>
              <Text style={s.priceNote}>one-time · 7 days</Text>
            </View>
          )}

          <View style={s.list}>
            <Row icon="arrow-up-circle-outline" text="Your post appears at the top of helper search results for 7 days." />
            <Row icon="eye-outline" text="Helpers see a small “Boosted” tag, so it is clear the position was paid for." />
            <Row icon="shield-checkmark-outline" text="Your match score does not change — helpers still see how well they fit." />
            <Row icon="time-outline" text="PESO review is unaffected. Boosting never skips verification." />
          </View>

          {!!error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity style={[s.primary, busy && { opacity: 0.6 }]} onPress={start} disabled={busy} activeOpacity={0.88}>
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name={usesCredit ? 'star' : 'card-outline'} size={18} color="#fff" />
                <Text style={s.primaryText}>
                  {usesCredit ? 'Use 1 Plus boost' : 'Continue to payment'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={close} style={s.cancel} disabled={busy}>
            <Text style={s.cancelText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={16} color={BROWN} style={{ marginTop: 1 }} />
      <Text style={s.rowText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFFDF9', borderRadius: 22, padding: 24, alignItems: 'center' },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FBEFD3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: '800', color: DARK, textAlign: 'center' },
  sub: { fontSize: 13.5, color: MUTED, textAlign: 'center', marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14, marginBottom: 16 },
  price: { fontSize: 32, fontWeight: '800', color: DARK },
  priceNote: { fontSize: 13, color: MUTED },
  includedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FBEFD3', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9, marginTop: 14, marginBottom: 16,
  },
  includedText: { fontSize: 12.5, fontWeight: '700', color: '#8A5A0E' },
  list: { alignSelf: 'stretch', gap: 10, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  rowText: { flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },
  error: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  primary: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: BROWN, paddingVertical: 15, borderRadius: 14,
  },
  primaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  cancel: { paddingVertical: 12 },
  cancelText: { fontSize: 14, color: MUTED, fontWeight: '600' },
});
