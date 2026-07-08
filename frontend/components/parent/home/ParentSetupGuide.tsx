// components/parent/home/ParentSetupGuide.tsx
// Active, step-by-step onboarding coach for parents (mirrors the helper's
// ProfileSetupGuide). Highlights the ONE next thing to do with a plain-language
// instruction and a big button straight into that section — so first-time
// employers always know exactly where to press.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, MUTED, SUBTLE, GREEN, SUCCESS_BG, DIVIDER, SURFACE, ICON_BG } from './parentWarmTheme';

type Step = {
  key: string;
  title: string;
  instruction: string;
  icon: keyof typeof Ionicons.glyphMap;
  done: boolean;
  route: string;
};

export function ParentSetupGuide({ profileData, firstName }: { profileData: any; firstName?: string }) {
  const router = useRouter();

  const p = profileData?.profile;
  const household = profileData?.household;
  const docs: any[] = profileData?.documents ?? [];
  const hasDoc = (t: string) => docs.some((d) => d?.document_type === t);

  const personalDone = !!(p?.contact_number && p?.address);
  const householdDone = !!household?.household_type;
  const docsDone = hasDoc('Valid ID') && hasDoc('Barangay Clearance');

  const steps: Step[] = [
    {
      key: 'personal', title: 'Complete your details', icon: 'person', done: personalDone,
      instruction: 'Your contact number and home address — so helpers and PESO can reach you.',
      route: '/(parent)/profile/personal',
    },
    {
      key: 'household', title: 'Add your household info', icon: 'home', done: householdDone,
      instruction: 'Tell helpers about your home — housing type, family size, and pets. This helps us match the right helper.',
      route: '/(parent)/profile/household',
    },
    {
      key: 'documents', title: 'Upload your documents', icon: 'shield-checkmark', done: docsDone,
      instruction: 'Upload your Valid ID and Barangay Clearance. PESO reviews these to verify your household.',
      route: '/(parent)/profile/documents',
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
              <View style={[s.stepIcon, step.done ? { backgroundColor: SUCCESS_BG } : isActive ? { backgroundColor: ICON_BG } : { backgroundColor: DIVIDER }]}>
                {step.done
                  ? <Ionicons name="checkmark" size={18} color={GREEN} />
                  : <Ionicons name={step.icon} size={17} color={isActive ? BROWN : SUBTLE} />}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.stepTitle, step.done && { color: MUTED }, isFuture && { color: SUBTLE }]}>
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
    backgroundColor: SURFACE, borderRadius: 18, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: DIVIDER,
    ...Platform.select({
      ios: { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
      default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
    }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
  subtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, marginTop: 2 },
  progressPill: { backgroundColor: ICON_BG, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  progressText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },

  bar: { height: 7, borderRadius: 4, backgroundColor: ICON_BG, marginTop: 12, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: BROWN },

  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 10, borderRadius: 12 },
  stepActive: { backgroundColor: ICON_BG, borderWidth: 1, borderColor: BROWN + '44' },
  stepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: DARK, marginTop: 5 },
  stepInstruction: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, lineHeight: 18, marginTop: 5 },

  cta: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: BROWN, paddingVertical: 11, paddingHorizontal: 18, borderRadius: 12, marginTop: 12,
  },
  ctaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
});
