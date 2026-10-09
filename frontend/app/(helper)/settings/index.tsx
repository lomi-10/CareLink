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
import { ConfirmationModal, NotificationModal, LanguagePicker } from '@/components/shared';
import { useHelperWarm } from '@/components/helper/home/helperWarmTheme';
import { useT } from '@/contexts/LocaleContext';

import { createHelperSettingsStyles } from './settings.styles';

const OPTIONS: {
  value: ColorSchemePreference;
  labelKey: string;
  hintKey: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    value: 'system',
    labelKey: 'helper.settings.matchDevice',
    hintKey: 'helper.settings.matchDeviceHint',
    icon: 'phone-portrait-outline',
  },
  {
    value: 'light',
    labelKey: 'helper.settings.alwaysLight',
    hintKey: 'helper.settings.alwaysLightHint',
    icon: 'sunny-outline',
  },
  {
    value: 'dark',
    labelKey: 'helper.settings.alwaysDark',
    hintKey: 'helper.settings.alwaysDarkHint',
    icon: 'moon-outline',
  },
];

export default function HelperSettingsScreen() {
  const router = useRouter();
  const { t } = useT();
  const navTheme = useTheme();
  const { preference, setPreference } = useColorSchemePreference();
  const { isDesktop } = useResponsive();
  const { isWorkMode, activeHire } = useHelperWorkMode();
  const { themeId, setThemeId } = useHelperTheme();
  const w = useHelperWarm();
  const { DARK, MUTED, ORANGE, ICON_BG, DIVIDER, SURFACE, PAGE_BG } = w;
  const accent = ORANGE;

  const styles = useMemo(() => createHelperSettingsStyles(w), [w]);
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
      <LanguagePicker
        accent={accent}
        surface={SURFACE}
        border={DIVIDER}
        text={DARK}
        muted={MUTED}
        selectedBg={ICON_BG}
        style={{ marginBottom: 26 }}
      />

      <Text style={[styles.sectionLabel, { color: MUTED }]}>{t('helper.settings.palette')}</Text>
      <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
        {t('helper.settings.paletteHint')}
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
                  backgroundColor: selected ? ICON_BG : SURFACE,
                  borderColor: selected ? accent : DIVIDER,
                },
              ]}
            >
              <Text style={[styles.themeCardLabel, { color: DARK }]} numberOfLines={1}>
                {opt.label}
              </Text>
              <Text style={[styles.themeCardHint, { color: MUTED }]} numberOfLines={3}>
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

      <Text style={[styles.sectionLabel, { color: MUTED, marginTop: 28 }]}>{t('helper.settings.brightness')}</Text>
      <Text style={[styles.sectionSub, { color: navTheme.colors.text }]}>
        {t('helper.settings.brightnessHint')}
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
              <View style={[styles.optionIcon, { backgroundColor: ICON_BG }]}>
                <Ionicons name={opt.icon} size={22} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: navTheme.colors.text }]}>{t(opt.labelKey)}</Text>
                <Text style={[styles.optionHint, { color: MUTED }]}>{t(opt.hintKey)}</Text>
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

      <Text style={[styles.sectionLabel, { color: MUTED, marginTop: 28 }]}>{t('helper.settings.account')}</Text>
      <TouchableOpacity
        style={[styles.linkRow, { backgroundColor: navTheme.colors.card, borderColor: navTheme.colors.border }]}
        onPress={() => router.push('/(helper)/profile')}
        activeOpacity={0.88}
      >
        <Ionicons name="person-outline" size={22} color={accent} />
        <Text style={[styles.linkText, { color: navTheme.colors.text }]}>{t('helper.settings.profileDocuments')}</Text>
        <Ionicons name="chevron-forward" size={20} color={MUTED} />
      </TouchableOpacity>

    </ScrollView>
  );

  const modals = (
    <>
      <ConfirmationModal
        visible={confirmLogout}
        title={t('helper.settings.logoutTitle')}
        message={t('helper.settings.logoutConfirm')}
        confirmText={t('nav.logOut')}
        cancelText={t('common.cancel')}
        type="danger"
        onConfirm={() => {
          setConfirmLogout(false);
          setSuccessLogout(true);
        }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout}
        message={t('helper.settings.logoutSuccess')}
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
            <Text style={styles.desktopPageTitle}>{t('nav.settings')}</Text>
            <Text style={styles.desktopPageSub}>{t('helper.settings.pageSubtitle')}</Text>
          </View>
          {content}
        </ScrollView>
        {modals}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { flex: 1, backgroundColor: PAGE_BG }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setIsMobileMenuOpen(true)} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="menu" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: DARK }]}>{t('nav.settings')}</Text>
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
