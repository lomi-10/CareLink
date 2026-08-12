// components/parent/PlusWelcomeModal.tsx
// Shown once, in-app, the moment a CareLink Plus payment actually lands.
//
// This replaces a generic NotificationModal that defaulted to autoClose after
// 3.2 seconds — so the one confirmation an employer got for spending real money
// vanished before it could be read. This one never auto-dismisses: paying is a
// deliberate act and deserves a deliberate acknowledgement.
//
// It doubles as a mini-guide, because "what did I actually just buy?" is the
// obvious next question and the answer was previously buried in a benefits list
// further down the screen.

import React from 'react';
import {
  Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

const BROWN = '#8B5A2B';
const GOLD  = '#D9A441';
const DARK  = '#2A1608';
const MUTED = '#7A5C3E';
const LINE  = '#EFE0CB';

type Perk = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

const PERKS: Perk[] = [
  {
    icon: 'megaphone',
    title: '3 job post boosts every month',
    body: 'Open a job post → “Feature this post”. It jumps to the top of helper search for 7 days. Your credits renew monthly.',
  },
  {
    icon: 'briefcase',
    title: 'Unlimited open job posts',
    body: 'Free accounts can keep 3 posts open at once. You no longer have a limit.',
  },
  {
    icon: 'flash',
    title: 'Priority in the PESO review queue',
    body: 'Your job posts and documents move to the front of the officer’s list.',
  },
  {
    icon: 'download',
    title: 'Export payroll to PDF or CSV',
    body: 'From any active placement → Payroll → Export. Useful for your own records.',
  },
  {
    icon: 'pricetag',
    title: '20% off placement fees',
    body: 'Applied automatically the next time you complete a hire.',
  },
];

export function PlusWelcomeModal({
  visible, onClose, price, started, renews, credits,
}: {
  visible: boolean;
  onClose: () => void;
  price: string;
  started: string | null;
  renews: string | null;
  credits: number;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* Celebration header */}
          <View style={s.header}>
            <View style={s.badge}>
              <Ionicons name="star" size={34} color="#fff" />
            </View>
            <Text style={s.title}>You&apos;re on CareLink Plus! 🎉</Text>
            <Text style={s.sub}>Payment received — thank you for supporting CareLink.</Text>
          </View>

          {/* Receipt strip */}
          <View style={s.receipt}>
            <View style={s.receiptRow}>
              <Text style={s.receiptLabel}>Paid</Text>
              <Text style={s.receiptValue}>₱{price}</Text>
            </View>
            {!!started && (
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Started</Text>
                <Text style={s.receiptValue}>{started}</Text>
              </View>
            )}
            {!!renews && (
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Renews</Text>
                <Text style={s.receiptValue}>{renews}</Text>
              </View>
            )}
            <View style={[s.receiptRow, { borderBottomWidth: 0 }]}>
              <Text style={s.receiptLabel}>Boost credits</Text>
              <Text style={s.receiptValue}>{credits} this month</Text>
            </View>
          </View>

          <Text style={s.sectionLabel}>HERE&apos;S WHAT YOU CAN DO NOW</Text>

          <ScrollView style={s.perkScroll} showsVerticalScrollIndicator={false}>
            {PERKS.map((p) => (
              <View key={p.title} style={s.perkRow}>
                <View style={s.perkIcon}>
                  <Ionicons name={p.icon} size={17} color={BROWN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.perkTitle}>{p.title}</Text>
                  <Text style={s.perkBody}>{p.body}</Text>
                </View>
              </View>
            ))}

            <View style={s.note}>
              <Ionicons name="information-circle" size={16} color={BROWN} />
              <Text style={s.noteText}>
                You can cancel anytime and keep Plus until {renews ?? 'the end of the month you paid for'}.
                Your receipt stays on this screen.
              </Text>
            </View>
          </ScrollView>

          {/* No auto-dismiss: the user closes this when they've read it. */}
          <TouchableOpacity style={s.btn} onPress={onClose} activeOpacity={0.88}>
            <Text style={s.btnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%', maxWidth: 440, maxHeight: '90%',
    backgroundColor: '#FFFDF9', borderRadius: 24, padding: 22,
    ...Platform.select({ default: { boxShadow: '0 24px 60px rgba(0,0,0,0.35)' } as any }),
  },

  header: { alignItems: 'center', marginBottom: 16 },
  badge: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK, textAlign: 'center' },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: MUTED, textAlign: 'center', marginTop: 5, lineHeight: 19 },

  receipt: { backgroundColor: '#FDF5E8', borderRadius: 14, borderWidth: 1, borderColor: LINE, paddingHorizontal: 14, marginBottom: 18 },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE,
  },
  receiptLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
  receiptValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },

  sectionLabel: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED,
    letterSpacing: 0.6, marginBottom: 10, marginLeft: 2,
  },

  perkScroll: { flexGrow: 0 },
  perkRow: { flexDirection: 'row', gap: 11, marginBottom: 14 },
  perkIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#F5E6CC',
    alignItems: 'center', justifyContent: 'center',
  },
  perkTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  perkBody: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, lineHeight: 18, marginTop: 2 },

  note: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#FDF5E8', borderRadius: 12, padding: 12, marginTop: 2, marginBottom: 6,
  },
  noteText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: BROWN, lineHeight: 17 },

  btn: { backgroundColor: BROWN, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  btnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
});
