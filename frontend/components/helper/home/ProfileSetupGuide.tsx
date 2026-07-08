// components/helper/home/ProfileSetupGuide.tsx
// Active, step-by-step onboarding coach for helpers. Instead of a passive
// checklist it highlights the ONE next thing to do, with a plain-language
// instruction and a big button that takes them straight into that editor —
// so less tech-savvy users always know exactly where to press.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperWarm, type HelperWarm } from './helperWarmTheme';

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
  const w = useHelperWarm();
  const s = useMemo(() => makeStyles(w), [w]);

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

  // The guide is only for getting set up. Once everything's done — or once PESO
  // has verified the account — it disappears so verified users aren't nagged.
  const verified = p?.verification_status === 'Verified';
  if (allDone || verified) return null;

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
              <View style={[s.stepIcon, step.done ? { backgroundColor: w.SUCCESS_BG } : isActive ? { backgroundColor: w.ICON_BG } : { backgroundColor: w.DIVIDER }]}>
                {step.done
                  ? <Ionicons name="checkmark" size={18} color={w.GREEN} />
                  : <Ionicons name={step.icon} size={17} color={isActive ? w.ORANGE : w.SUBTLE} />}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.stepTitle, step.done && { color: w.MUTED }, isFuture && { color: w.SUBTLE }]}>
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
                  <Ionicons name="create-outline" size={16} color={w.MUTED} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (w: HelperWarm) => StyleSheet.create({
  card: {
    backgroundColor: w.SURFACE_ELEVATED, borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: w.DIVIDER,
    ...Platform.select({
      ios: { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
    }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: w.DARK },
  subtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: w.MUTED, marginTop: 2 },
  progressPill: { backgroundColor: w.ICON_BG, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  progressText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: w.ORANGE },

  bar: { height: 7, borderRadius: 4, backgroundColor: w.ICON_BG, marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: w.ORANGE },

  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: 12 },
  stepActive: { backgroundColor: w.ICON_BG, borderWidth: 1, borderColor: w.ORANGE + '44' },
  stepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: w.DARK, marginTop: 5 },
  stepInstruction: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: w.MUTED, lineHeight: 18, marginTop: 5 },

  cta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: w.ORANGE, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, marginTop: 12,
  },
  ctaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: w.DARK },
  doneSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: w.MUTED, marginTop: 2, lineHeight: 18 },
});
