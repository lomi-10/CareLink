import React from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { useResponsive } from '@/hooks/shared';
import { WorkModeTabBar } from '@/components/helper/work';
import { theme } from '@/constants/theme';

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
  const { isWorkMode } = useHelperWorkMode();
  const showWorkTabs = !isDesktop && isWorkMode;

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
        contentContainerStyle={[styles.scroll, showWorkTabs && { paddingBottom: 88 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: theme.color.muted }]}>Appearance</Text>
        <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
          Choose how CareLink looks on this device. Tabs and screens update immediately.
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
                    borderColor: selected ? theme.color.helper : navTheme.colors.border,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
                onPress={() => void setPreference(opt.value)}
                activeOpacity={0.85}
              >
                <View style={[styles.optionIcon, { backgroundColor: theme.color.helperSoft }]}>
                  <Ionicons name={opt.icon} size={22} color={theme.color.helper} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: navTheme.colors.text }]}>{opt.label}</Text>
                  <Text style={[styles.optionHint, { color: theme.color.muted }]}>{opt.hint}</Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={24} color={theme.color.helper} />
                ) : (
                  <View style={{ width: 24 }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: theme.color.muted, marginTop: 28 }]}>Account</Text>
        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: navTheme.colors.card, borderColor: navTheme.colors.border }]}
          onPress={() => router.push('/(helper)/profile')}
          activeOpacity={0.88}
        >
          <Ionicons name="person-outline" size={22} color={theme.color.helper} />
          <Text style={[styles.linkText, { color: navTheme.colors.text }]}>Profile & documents</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.color.muted} />
        </TouchableOpacity>
      </ScrollView>
      {showWorkTabs ? <WorkModeTabBar /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionSub: { fontSize: 14, lineHeight: 20, marginBottom: 16, opacity: 0.9 },
  options: { gap: 10 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  linkText: { flex: 1, fontSize: 16, fontWeight: '600' },
});
