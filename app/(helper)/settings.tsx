import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  useColorSchemePreference,
  type ColorSchemePreference,
} from '@/contexts/ColorSchemePreferenceContext';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useHelperTheme } from '@/contexts/HelperThemeContext';
import { useResponsive } from '@/hooks/shared';
import { WorkModeTabBar } from '@/components/helper/work';
import { HelperTabBar } from '@/components/helper/home';
import { PARENT_THEME_OPTIONS, type ParentThemeId } from '@/constants/parentThemePalettes';

import { styles } from './settings.styles';

const OPTIONS: {
  value: ColorSchemePreference;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'system', label: 'Match device', hint: 'Follow system light or dark mode', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', hint: 'Always use light appearance', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', hint: 'Always use dark appearance', icon: 'moon-outline' },
];

export default function HelperSettingsScreen() {
  const router = useRouter();
  const navTheme = useTheme();
  const { preference, setPreference } = useColorSchemePreference();
  const { isDesktop } = useResponsive();
  const { isWorkMode, activeHire } = useHelperWorkMode();
  const { themeId, setThemeId, color: c } = useHelperTheme();
  const accent = c.helper;

  const showWorkTabs = !isDesktop && isWorkMode && !!activeHire;
  const showBottomBar = !isDesktop;

  return (
    <SafeAreaView style={[styles.safe, { flex: 1, backgroundColor: navTheme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={navTheme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: navTheme.colors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          showBottomBar && { paddingBottom: 88 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: c.muted }]}>Color theme</Text>
        <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
          Backgrounds, cards, and accent colors in the helper portal. Saved on this device.
        </Text>
        <View style={styles.themeRow}>
          {PARENT_THEME_OPTIONS.map((opt) => {
            const selected = themeId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => void setThemeId(opt.id as ParentThemeId)}
                activeOpacity={0.88}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: selected ? c.helperSoft : c.surface,
                    borderColor: selected ? accent : c.line,
                  },
                ]}
              >
                <Text style={[styles.themeCardLabel, { color: c.ink }]} numberOfLines={1}>
                  {opt.label}
                </Text>
                <Text style={[styles.themeCardHint, { color: c.muted }]} numberOfLines={3}>
                  {opt.hint}
                </Text>
                {selected ? (
                  <View style={{ position: 'absolute', top: 8, right: 8 }}>
                    <Ionicons name="checkmark-circle" size={20} color={accent} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: c.muted, marginTop: 28 }]}>Light &amp; dark</Text>
        <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
          Choose how CareLink follows your device. Tabs and screens update immediately.
        </Text>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const selected = preference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: navTheme.colors.card,
                    borderColor: selected ? accent : navTheme.colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
                onPress={() => void setPreference(opt.value)}
                activeOpacity={0.85}
              >
                <View style={[styles.optionIcon, { backgroundColor: c.helperSoft }]}>
                  <Ionicons name={opt.icon} size={22} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: navTheme.colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionHint, { color: c.muted }]}>{opt.hint}</Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={24} color={accent} />
                ) : (
                  <View style={{ width: 24 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: c.muted, marginTop: 28 }]}>Account</Text>
        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: navTheme.colors.card, borderColor: navTheme.colors.border }]}
          onPress={() => router.push('/(helper)/profile')}
          activeOpacity={0.88}
        >
          <Ionicons name="person-outline" size={22} color={accent} />
          <Text style={[styles.linkText, { color: navTheme.colors.text }]}>Profile & documents</Text>
          <Ionicons name="chevron-forward" size={20} color={c.muted} />
        </TouchableOpacity>
      </ScrollView>
      {showBottomBar && (showWorkTabs ? <WorkModeTabBar /> : <HelperTabBar />)}
    </SafeAreaView>
  );
}
