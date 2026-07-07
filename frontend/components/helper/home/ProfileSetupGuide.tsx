// components/helper/home/ProfileSetupGuide.tsx
// Active, step-by-step onboarding coach for helpers. Instead of a passive
// checklist it highlights the ONE next thing to do, with a plain-language
// instruction and a big button that takes them straight into that editor —
// so less tech-savvy users always know exactly where to press.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';

const ORANGE = '#E86019';
const INK = '#2A1608';
const MUTED = '#8A6C4E';
const GREEN = '#1A7F4B';
const GREEN_BG = '#E6F4EC';
const LINE = '#EFE2D0';
const CARD = '#FFFFFF';

type Step = {
  key: string;
  title: string;
  instruction: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
  route: string;
};

export function ProfileSetupGuide({ profileData, firstName }: { profileData: any; firstName?: string }) {
  const router = useRouter();

  const p = profileData?.profile;
  const jobs: any[] = profileData?.mappedSpecialties?.jobs ?? [];
  const docs: any[] = profileData?.documents ?? [];
  const hasDoc = (t: string) => docs.some((d) => d?.document_type === t);

  const personalDone = !!(p?.contact_number && p?.birth_date && p?.gender && p?.province && p?.municipality && p?.barangay);
  const skillsDone = jobs.length > 0;
  const docsDone = hasDoc('Valid ID') && hasDoc('Barangay Clearance');

  const steps: Step[] = [
    {
      key: 'personal', title: 'Add your personal details', icon: 'person', done: personalDone,
      instruction: 'Your name, contact number, and complete address — so employers know who you are and can reach you.',
      route: '/(helper)/profile/personal?edit=1',
    },
    {
      key: 'skills', title: 'Choose your work & skills', icon: 'sparkles', done: skillsDone,
      instruction: 'Pick the kind of work you do (Yaya, Cook, Gardening…). Tip: choose “General Househelp” if you can do everything — it selects them all for you.',
      route: '/(helper)/profile/skills?edit=1',
    },
    {
      key: 'docs', title: 'Upload your documents', icon: 'shield-checkmark', done: docsDone,
      instruction: 'Upload your Valid ID (front and back) and Barangay Clearance. PESO reviews these to verify you.',
      route: '/(helper)/profile/documents',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const activeIdx = steps.findIndex((s) => !s.done);

  const go = (route: string) => router.push(route as never);

  // Once everything's done the guide disappears — no clutter for set-up users.
  if (allDone) return null;

  return (
    <View style={s.card}>
      {/* Header + progress */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Let’s finish your profile{firstName ? `, ${firstName}` : ''} 👋</Text>
          <Text style={s.subtitle}>Just {steps.length - doneCount} step{steps.length - doneCount !== 1 ? 's' : ''} left — we’ll guide you.</Text>
        </View>
        <View style={s.progressPill}>
          <Text style={s.progressText}>{doneCount}/{steps.length}</Text>
        </View>
      </View>
      <View style={s.bar}>
        <View style={[s.barFill, { width: `${(doneCount / steps.length) * 100}%` }]} />
      </View>

      {/* Steps */}
      <View style={{ marginTop: 14, gap: 10 }}>
        {steps.map((step, i) => {
          const isActive = i === activeIdx;
          const isFuture = !step.done && !isActive;
          return (
            <View key={step.key} style={[s.step, isActive && s.stepActive]}>
              <View style={[s.stepIcon, step.done ? { backgroundColor: GREEN_BG } : isActive ? { backgroundColor: '#FEE2D5' } : { backgroundColor: '#F3EADB' }]}>
                {step.done
                  ? <Ionicons name="checkmark" size={18} color={GREEN} />
                  : <Ionicons name={step.icon} size={17} color={isActive ? ORANGE : '#C2A988'} />}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.stepTitle, step.done && { color: MUTED }, isFuture && { color: '#B49A7C' }]}>
                  {step.title}{step.done ? ' ✓' : ''}
                </Text>

                {isActive && (
                  <>
                    <Text style={s.stepInstruction}>{step.instruction}</Text>
                    <TouchableOpacity style={s.cta} onPress={() => go(step.route)} activeOpacity={0.88}>
                      <Text style={s.ctaText}>{doneCount > 0 ? 'Continue' : 'Start here'}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {step.done && (
                <TouchableOpacity onPress={() => go(step.route)} hitSlop={8}>
                  <Ionicons name="create-outline" size={16} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: LINE,
    ...Platform.select({
      ios: { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
    }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: INK },
  subtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, marginTop: 2 },
  progressPill: { backgroundColor: '#FEE2D5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  progressText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },

  bar: { height: 7, borderRadius: 4, backgroundColor: '#F3EADB', marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: ORANGE },

  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: 12 },
  stepActive: { backgroundColor: '#FFF8F1', borderWidth: 1, borderColor: '#F6D9C4' },
  stepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: INK, marginTop: 5 },
  stepInstruction: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, lineHeight: 18, marginTop: 5 },

  cta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: INK, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, marginTop: 12,
  },
  ctaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: INK },
  doneSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 18 },
});
