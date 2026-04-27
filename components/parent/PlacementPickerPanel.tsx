import AnimatedPressable from '@/components/shared/AnimatedPressable';
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import type { ThemeColor } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

type Props = {
  title: string;
  subtitle?: string;
  placements: ActivePlacement[];
  onSelect: (p: ActivePlacement) => void;
  /** When false, shows a centered spinner (placements are still loading). */
  loaded: boolean;
};

function createPlacementPickerStyles(c: ThemeColor) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.canvasParent },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: c.canvasParent },
    hint: { marginTop: 12, fontSize: 14, color: c.muted, fontWeight: '600' },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    backBtn: { padding: 4 },
    pageTitle: { fontSize: 22, fontWeight: '900', color: c.ink },
    pageSub: { fontSize: 14, color: c.muted, marginTop: 2 },
    scroll: { paddingHorizontal: 16, paddingBottom: 32 },
    lead: { fontSize: 14, color: c.inkMuted, lineHeight: 20, marginBottom: 16 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.surfaceElevated,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: c.line,
      ...theme.shadow.card,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.parentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardName: { fontSize: 17, fontWeight: '800', color: c.ink },
    cardJob: { fontSize: 14, color: c.muted, marginTop: 4, lineHeight: 19 },
  });
}

export function PlacementPickerPanel({ title, subtitle, placements, onSelect, loaded }: Props) {
  const { color: c } = useParentTheme();
  const styles = useMemo(() => createPlacementPickerStyles(c), [c]);
  const router = useRouter();

  if (!loaded) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={c.parent} />
        <Text style={styles.hint}>Loading placements…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.head}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={c.parent} />
        </AnimatedPressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSub}>{subtitle}</Text> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          You have more than one active helper. Choose a placement to continue.
        </Text>
        {placements.map((p) => (
          <AnimatedPressable
            key={p.application_id}
            style={styles.card}
            onPress={() => onSelect(p)}>
            <View style={styles.cardIcon}>
              <Ionicons name="person" size={22} color={c.parent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardName} numberOfLines={1}>
                {p.helper_name}
              </Text>
              <Text style={styles.cardJob} numberOfLines={2}>
                {p.job_title}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.muted} />
          </AnimatedPressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
