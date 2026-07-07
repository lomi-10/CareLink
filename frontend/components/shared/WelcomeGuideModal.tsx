// components/shared/WelcomeGuideModal.tsx
// A short, paged "how CareLink works" walkthrough. Shown once on a helper's first
// login, and re-openable anytime from Settings → Guide. Plain language + big
// buttons for less tech-savvy users.

import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

type Page = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

const HELPER_PAGES: Page[] = [
  { icon: 'hand-left', title: 'Welcome to CareLink!', body: 'This quick guide shows what to do to find trusted household work. It only takes a minute.' },
  { icon: 'person-circle', title: '1. Complete your profile', body: 'On your Home screen, the “Let’s finish your profile” card guides you step by step — your details, the work you do, and your documents. Just tap the highlighted button each time.' },
  { icon: 'shield-checkmark', title: '2. Get PESO-verified', body: 'Upload your Valid ID (front & back) and Barangay Clearance. PESO reviews them. Once you’re verified, employers can find and trust you.' },
  { icon: 'search', title: '3. Browse & apply for jobs', body: 'After verification, tap Find Jobs, open a job that fits you, and tap Apply. You can write your cover letter or let CareBot generate one for you.' },
  { icon: 'briefcase', title: '4. Get hired & start working', body: 'When an employer hires you, sign the contract. Then Work Mode helps you with daily tasks, check-in/out, schedule, and salary.' },
];

const PARENT_PAGES: Page[] = [
  { icon: 'hand-left', title: 'Welcome to CareLink!', body: 'This quick guide shows how to find and hire trusted, PESO-verified helpers.' },
  { icon: 'person-circle', title: '1. Complete your profile', body: 'Add your details and upload your documents so PESO can verify your household.' },
  { icon: 'add-circle', title: '2. Post a job', body: 'Describe the help you need — duties, salary, schedule. Verified helpers can then apply.' },
  { icon: 'people', title: '3. Review & hire', body: 'Compare applicants, message them, then hire. A DOLE-compliant contract is generated for both of you to sign.' },
  { icon: 'briefcase', title: '4. Manage the work', body: 'Once hired, Work Mode helps with tasks, attendance, leave requests, and salary.' },
];

export default function WelcomeGuideModal({
  visible, onClose, role = 'helper', accent = '#E86019',
}: {
  visible: boolean;
  onClose: () => void;
  role?: 'helper' | 'parent';
  accent?: string;
}) {
  const pages = role === 'parent' ? PARENT_PAGES : HELPER_PAGES;
  const [page, setPage] = useState(0);
  const last = page === pages.length - 1;
  const p = pages[page];

  const close = () => { setPage(0); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <TouchableOpacity style={s.skip} onPress={close} hitSlop={8}>
            <Text style={s.skipText}>{last ? '' : 'Skip'}</Text>
          </TouchableOpacity>

          <View style={[s.iconWrap, { backgroundColor: accent + '18' }]}>
            <Ionicons name={p.icon} size={40} color={accent} />
          </View>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.body}>{p.body}</Text>

          {/* Dots */}
          <View style={s.dots}>
            {pages.map((_, i) => (
              <View key={i} style={[s.dot, i === page ? { backgroundColor: accent, width: 20 } : { backgroundColor: '#E4D5C2' }]} />
            ))}
          </View>

          {/* Buttons */}
          <View style={s.btnRow}>
            {page > 0 ? (
              <TouchableOpacity style={s.backBtn} onPress={() => setPage(page - 1)} activeOpacity={0.85}>
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>
            ) : <View style={{ flex: 1 }} />}
            <TouchableOpacity
              style={[s.nextBtn, { backgroundColor: accent }]}
              onPress={() => (last ? close() : setPage(page + 1))}
              activeOpacity={0.88}
            >
              <Text style={s.nextText}>{last ? 'Get Started' : 'Next'}</Text>
              {!last && <Ionicons name="arrow-forward" size={17} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#FFFDF9', borderRadius: 22, padding: 24, alignItems: 'center' },
  skip: { position: 'absolute', top: 14, right: 16, height: 20 },
  skipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#9A7B5A' },
  iconWrap: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 16 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: '#2A1608', textAlign: 'center' },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: '#7A5C3E', textAlign: 'center', lineHeight: 21, marginTop: 10, minHeight: 84 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 20, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#EDE0D0', alignItems: 'center' },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#2A1608' },
  nextBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 14 },
  nextText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
});
