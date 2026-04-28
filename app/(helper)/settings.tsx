import React, { useMemo, useState } from 'react';
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
import { useAuth, useResponsive } from '@/hooks/shared';
import { WorkModeTabBar } from '@/components/helper/work';
import { Sidebar, MobileMenu, HelperTabBar } from '@/components/helper/home';
import { PARENT_THEME_OPTIONS, type ParentThemeId } from '@/constants/parentThemePalettes';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

import { createHelperSettingsStyles } from './settings.styles';

const OPTIONS: {
  value: ColorSchemePreference;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    value: 'system',
    label: 'Match device',
    hint: 'Use the same light or dark mode as your phone or computer (recommended).',
    icon: 'phone-portrait-outline',
  },
  {
    value: 'light',
    label: 'Always light',
    hint: 'Bright chrome and readable contrast across navigation, dialogs, and all CareLink portals.',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    label: 'Always dark',
    hint: 'Deep backgrounds across the entire app—including parent and helper. Independent of palette above.',
    icon: 'moon-outline',
  },
];

export default function HelperSettingsScreen() {
  const router = useRouter();
  const navTheme = useTheme();
  const { preference, setPreference } = useColorSchemePreference();
  const { isDesktop } = useResponsive();
  const { isWorkMode, activeHire } = useHelperWorkMode();
  const { themeId, setThemeId, color: c } = useHelperTheme();
  const accent = c.helper;

  const styles = useMemo(() => createHelperSettingsStyles(c), [c]);
  const { handleLogout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const initiateLogout = () => {
    setIsMobileMenuOpen(false);
    setConfirmLogout(true);
  };

  const showWorkTabs = !isDesktop && isWorkMode && !!activeHire;
  const showBottomBar = !isDesktop;

  const content = (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        showBottomBar && { paddingBottom: 88 },
        isDesktop && { paddingBottom: 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: c.muted }]}>CareLink palette</Text>
      <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
        Choose a color story (default, warm, sage, night, and more). This updates surfaces and accents in the helper
        portal. Saved on this device only.
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

      <Text style={[styles.sectionLabel, { color: c.muted, marginTop: 28 }]}>Interface brightness</Text>
      <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
        Controls overall light or dark appearance for CareLink everywhere. This works together with the palette—you
        can keep a warm palette in dark mode, for example.
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
  );

  const modals = (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          setSuccessLogout(true);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message="Logged Out Successfully!"
        type="success"
        autoClose
        duration={1500}
        onClose={() => {
          setSuccessLogout(false);
          handleLogout();
        }}
      />
    </>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <Sidebar onLogout={initiateLogout} />
        <ScrollView style={styles.desktopMain} contentContainerStyle={styles.desktopScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.desktopTopBar}>
            <Text style={styles.desktopPageTitle}>Settings</Text>
            <Text style={styles.desktopPageSub}>Helper Portal — appearance &amp; account</Text>
          </View>
          {content}
        </ScrollView>
        {modals}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { flex: 1, backgroundColor: c.canvasHelper }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="menu" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.ink }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      {content}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={initiateLogout}
      />
      {showBottomBar && (showWorkTabs ? <WorkModeTabBar /> : <HelperTabBar />)}
      {modals}
    </SafeAreaView>
  );
}
