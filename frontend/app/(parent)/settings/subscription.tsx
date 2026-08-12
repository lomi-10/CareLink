// app/(parent)/settings/subscription.tsx
// CareLink Plus — the purchase screen for employer accounts.
//
// Deliberately states what is NOT paid for as prominently as what is. Every
// safety feature (PESO verification, matching, contracts, signing, messaging,
// the shared placement record, CareBot) is free at every tier, and helpers are
// never charged for anything. A paywall on a safety feature would be indefensible
// in this domain, so the screen says so out loud.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform, RefreshControl, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { PlusWelcomeModal } from '@/components/parent/PlusWelcomeModal';

const BROWN = '#8B5A2B';
const GOLD = '#D9A441';
const DARK = '#2A1608';
const MUTED = '#7A5C3E';
const LINE = '#EFE0CB';
const CARD = '#FFFFFF';
const PAGE = '#FBF5EC';
const GREEN = '#059669';

type PlusStatus = {
  is_plus: boolean;
  status: string | null;
  started_at: string | null;
  current_period_end: string | null;
  featured_credits: number;
};

export default function SubscriptionScreen() {
  const router = useRouter();
  const [plus, setPlus] = useState<PlusStatus | null>(null);
  const [price, setPrice] = useState('149.00');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [notif, setNotif] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false, message: '', type: 'success',
  });
  // Tracks the last known state so we can tell "just became Plus" apart from
  // "opened the screen already subscribed" — only the transition gets a modal.
  const wasPlusRef = useRef<boolean | null>(null);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const id = String(user.user_id ?? '');
      if (!id) return;

      // Ask the server to reconcile with PayMongo BEFORE reading status.
      // Checkout happens in an external browser tab, so this screen never gets
      // a direct "payment succeeded" callback — and the webhook that was meant
      // to carry it can silently never arrive. This makes the app confirm the
      // payment itself instead of waiting to be told.
      try {
        await fetch(`${API_URL}/parent/confirm_subscription.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_id: id, requester_id: id }),
        });
      } catch { /* offline — fall through and show whatever we last knew */ }

      const res = await fetch(`${API_URL}/parent/subscribe.php?parent_id=${id}&requester_id=${id}`);
      const data = await res.json();
      if (data.success) {
        const nowPlus = !!data.plus?.is_plus;
        // A false → true transition is the moment the payment landed.
        if (wasPlusRef.current === false && nowPlus) setReceiptOpen(true);
        wasPlusRef.current = nowPlus;
        setPlus(data.plus);
        setPrice(data.price_php ?? '149.00');
        setBenefits(data.benefits ?? []);
        setTestMode(!!data.test_mode);
      }
    } catch { /* the screen still renders its static content */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Re-check whenever the user returns to this screen or brings the app back
  // to the foreground — exactly the moment they'd return from paying in the
  // browser. Without this, "nothing happened" until they manually pull-to-refresh.
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });
    return () => sub.remove();
  }, [load]);

  const subscribe = async () => {
    setBusy(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const id = String(user.user_id ?? '');
      // On web, PayMongo redirects the browser tab back to this exact page.
      // On native there is no tab to return to — it opens a system browser —
      // so the return URL must be a deep link back into the app itself
      // (registered "carelink" scheme) or the user is stranded on a bare
      // web page with no way back in.
      const returnUrl = Platform.OS === 'web'
        ? window.location.href
        : ExpoLinking.createURL('/(parent)/settings/subscription');
      const res = await fetch(`${API_URL}/parent/subscribe.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: id, requester_id: id,
          return_url: returnUrl,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      if (data.already_plus) { setNotif({ visible: true, message: data.message, type: 'success' }); await load(); return; }
      if (data.checkout_url) { await Linking.openURL(data.checkout_url); return; }
      throw new Error('Payment could not be started.');
    } catch (e: any) {
      setNotif({ visible: true, message: e?.message || 'Could not start the subscription.', type: 'error' });
    } finally { setBusy(false); }
  };

  const cancel = async () => {
    setConfirmCancel(false);
    setBusy(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const id = String(user.user_id ?? '');
      const res = await fetch(`${API_URL}/parent/cancel_subscription.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: id, requester_id: id }),
      });
      const data = await res.json();
      setNotif({ visible: true, message: data.message, type: data.success ? 'success' : 'error' });
      if (data.success) await load();
    } catch {
      setNotif({ visible: true, message: 'Could not cancel right now.', type: 'error' });
    } finally { setBusy(false); }
  };

  const isPlus = !!plus?.is_plus;
  const fmtDate = (v?: string | null) =>
    v ? new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : null;
  const renews  = fmtDate(plus?.current_period_end);
  const started = fmtDate(plus?.started_at);

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>CareLink Plus</Text>
          <View style={{ width: 42 }} />
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator size="large" color={BROWN} /></View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          >
            {/* Only shown while the server is on PayMongo sandbox keys, so a
                tester is never left wondering whether they were really charged. */}
            {testMode && (
              <View style={s.testBanner}>
                <Ionicons name="flask-outline" size={16} color="#C97A0E" />
                <Text style={s.testBannerText}>
                  Test mode — payments are simulated and no real money is charged.
                </Text>
              </View>
            )}

            {/* Status / price */}
            <View style={[s.hero, isPlus && s.heroActive]}>
              <View style={s.heroIcon}>
                <Ionicons name={isPlus ? 'star' : 'star-outline'} size={30} color={isPlus ? '#fff' : GOLD} />
              </View>
              {isPlus ? (
                <>
                  <Text style={s.heroTitleOn}>You have CareLink Plus</Text>
                  {!!renews && (
                    <Text style={s.heroSubOn}>
                      {plus?.status === 'cancelled' ? `Access ends ${renews}` : `Renews ${renews}`}
                    </Text>
                  )}
                  <View style={s.creditPill}>
                    <Ionicons name="megaphone" size={13} color="#fff" />
                    <Text style={s.creditText}>{plus?.featured_credits ?? 0} boost credits left this month</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={s.heroTitle}>Hire faster with Plus</Text>
                  <View style={s.priceRow}>
                    <Text style={s.price}>₱{price}</Text>
                    <Text style={s.priceNote}>/ month</Text>
                  </View>
                  <Text style={s.heroSub}>Cancel anytime. You keep access until the month you paid for ends.</Text>
                </>
              )}
            </View>

            {/* Your plan — what you actually hold right now, and what it cost.
                Without this the screen was only a sales pitch; a subscriber
                could not tell what they were entitled to or when it renews. */}
            <Text style={s.sectionLabel}>Your plan</Text>
            <View style={s.card}>
              <View style={[s.row, s.rowLine]}>
                <Ionicons name="pricetag-outline" size={18} color={MUTED} />
                <Text style={s.rowText}>Current plan</Text>
                <Text style={[s.rowValue, isPlus && { color: BROWN }]}>
                  {isPlus ? 'CareLink Plus' : 'Free'}
                </Text>
              </View>
              <View style={[s.row, s.rowLine]}>
                <Ionicons name="cash-outline" size={18} color={MUTED} />
                <Text style={s.rowText}>You pay</Text>
                <Text style={s.rowValue}>{isPlus ? `₱${price} / month` : '₱0'}</Text>
              </View>
              {isPlus && (
                <View style={[s.row, s.rowLine]}>
                  <Ionicons name="play-circle-outline" size={18} color={MUTED} />
                  <Text style={s.rowText}>Started on</Text>
                  <Text style={s.rowValue}>{started ?? '—'}</Text>
                </View>
              )}
              <View style={[s.row, s.rowLine]}>
                <Ionicons name="calendar-outline" size={18} color={MUTED} />
                <Text style={s.rowText}>
                  {plus?.status === 'cancelled' ? 'Access ends' : isPlus ? 'Renews on' : 'Renewal'}
                </Text>
                <Text style={s.rowValue}>{renews ?? '—'}</Text>
              </View>
              <View style={[s.row, s.rowLine]}>
                <Ionicons name="megaphone-outline" size={18} color={MUTED} />
                <Text style={s.rowText}>Boost credits left</Text>
                <Text style={s.rowValue}>{isPlus ? `${plus?.featured_credits ?? 0} of 3` : '0'}</Text>
              </View>
              <View style={s.row}>
                <Ionicons name="briefcase-outline" size={18} color={MUTED} />
                <Text style={s.rowText}>Open job posts</Text>
                <Text style={s.rowValue}>{isPlus ? 'Unlimited' : 'Up to 3'}</Text>
              </View>
            </View>

            {/* What you get */}
            <Text style={s.sectionLabel}>What Plus adds</Text>
            <View style={s.card}>
              {(benefits.length ? benefits : [
                '3 featured job post boosts every month',
                'Priority position in the PESO review queue',
                'Unlimited open job posts',
                'Placement history beyond 6 months',
                'Export payroll to PDF or CSV',
                '20% off placement fees',
              ]).map((b, i, arr) => (
                <View key={b} style={[s.row, i < arr.length - 1 && s.rowLine]}>
                  <Ionicons name="checkmark-circle" size={19} color={GREEN} />
                  <Text style={s.rowText}>{b}</Text>
                </View>
              ))}
            </View>

            {/* The honest half — what is never paid for. */}
            <Text style={s.sectionLabel}>Always free, for everyone</Text>
            <View style={[s.card, s.freeCard]}>
              <Text style={s.freeIntro}>
                Nothing that keeps people safe is behind a payment. Plus only makes hiring faster.
              </Text>
              {[
                'PESO verification and document review',
                'Matching and compatibility scores',
                'Contracts, digital signing and messaging',
                'Work Mode: tasks, attendance, leave and payroll',
                'CareBot and document pre-screening',
              ].map((f) => (
                <View key={f} style={s.freeRow}>
                  <Ionicons name="lock-open-outline" size={15} color={BROWN} />
                  <Text style={s.freeText}>{f}</Text>
                </View>
              ))}
              <View style={s.helperNote}>
                <Ionicons name="information-circle" size={16} color={BROWN} />
                <Text style={s.helperNoteText}>
                  Helpers are never charged for anything on CareLink, at any tier.
                </Text>
              </View>
            </View>

            {isPlus ? (
              plus?.status === 'cancelled' ? (
                <TouchableOpacity style={[s.primary, busy && { opacity: 0.6 }]} onPress={subscribe} disabled={busy} activeOpacity={0.88}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Resume CareLink Plus</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.ghost} onPress={() => setConfirmCancel(true)} disabled={busy} activeOpacity={0.85}>
                  <Text style={s.ghostText}>Cancel subscription</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity style={[s.primary, busy && { opacity: 0.6 }]} onPress={subscribe} disabled={busy} activeOpacity={0.88}>
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="card-outline" size={18} color="#fff" />
                    <Text style={s.primaryText}>Upgrade to Plus</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <Text style={s.legal}>
              Payments are processed by PayMongo. CareLink never sees or stores your card details.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>

      <ConfirmationModal
        visible={confirmCancel}
        title="Cancel CareLink Plus?"
        message={renews ? `You'll keep Plus until ${renews}, then return to the free tier.` : 'You will return to the free tier.'}
        confirmText="Cancel Plus"
        cancelText="Keep Plus"
        type="danger"
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
      <NotificationModal
        visible={notif.visible}
        message={notif.message}
        type={notif.type}
        autoClose
        duration={2200}
        onClose={() => setNotif((n) => ({ ...n, visible: false }))}
      />
      <PlusWelcomeModal
        visible={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        price={price}
        started={started}
        renews={renews}
        credits={plus?.featured_credits ?? 3}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  barBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: DARK },
  scroll: { padding: 16, paddingBottom: 60 },
  testBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FBEFD3', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  testBannerText: { flex: 1, fontSize: 12.5, color: '#8A5A0E', fontWeight: '600', lineHeight: 18 },

  hero: {
    backgroundColor: CARD, borderRadius: 20, padding: 22, alignItems: 'center',
    borderWidth: 1, borderColor: LINE, marginBottom: 22,
  },
  heroActive: { backgroundColor: BROWN, borderColor: BROWN },
  heroIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(217,164,65,0.16)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: DARK },
  heroTitleOn: { fontSize: 20, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  heroSubOn: { fontSize: 13.5, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
  price: { fontSize: 34, fontWeight: '800', color: DARK },
  priceNote: { fontSize: 14, color: MUTED },
  creditPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  creditText: { fontSize: 12.5, fontWeight: '700', color: '#fff' },

  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: MUTED, textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10, marginLeft: 4,
  },
  card: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: LINE, paddingHorizontal: 16, marginBottom: 22 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE },
  rowText: { flex: 1, fontSize: 14, color: DARK, lineHeight: 20 },
  rowValue: { fontSize: 14, fontWeight: '800', color: DARK },

  freeCard: { paddingVertical: 16 },
  freeIntro: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 12 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 5 },
  freeText: { flex: 1, fontSize: 13.5, color: DARK },
  helperNote: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FDF5E8', borderRadius: 12, padding: 12, marginTop: 14,
  },
  helperNoteText: { flex: 1, fontSize: 12.5, color: BROWN, lineHeight: 18, fontWeight: '600' },

  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BROWN, paddingVertical: 16, borderRadius: 14,
  },
  primaryText: { fontSize: 15.5, fontWeight: '700', color: '#fff' },
  ghost: { paddingVertical: 15, alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: LINE },
  ghostText: { fontSize: 14.5, fontWeight: '700', color: MUTED },
  legal: { fontSize: 11.5, color: MUTED, textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
