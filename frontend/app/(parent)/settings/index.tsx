// app/(parent)/settings/index.tsx
// PHP: auth/login.php (logout clears session), shared/get_user_status.php — mostly AsyncStorage only
import React, { useEffect, useState } from 'react';
import { useTheme } from '@react-navigation/native';
import {
  View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../../constants/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ss } from './settings.styles';
import { BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG, SURFACE } from '@/components/parent/home/parentWarmTheme';
import { useColorSchemePreference, type ColorSchemePreference } from '@/contexts/ColorSchemePreferenceContext';
import { PARENT_THEME_OPTIONS, type ParentThemeId } from '@/constants/parentThemePalettes';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useParentProfile } from '@/hooks/parent';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { ParentSettingsWeb } from '@/components/parent/web/ParentSettingsWeb';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import WelcomeGuideModal from '@/components/shared/WelcomeGuideModal';

const APPEARANCE_OPTIONS: {
  value: ColorSchemePreference;
  label: string;
  hint: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'system', label: 'Match device',  hint: 'Use the same light or dark mode as this phone or computer.', icon: 'phone-portrait-outline' },
  { value: 'light',  label: 'Always light',  hint: 'Bright backgrounds and dark text across the app chrome.',  icon: 'sunny-outline'           },
  { value: 'dark',   label: 'Always dark',   hint: 'Deep backgrounds and light text across the whole app.',    icon: 'moon-outline'            },
];

export default function SettingsScreen() {
  const router = useRouter();
  const navTheme = useTheme();
  const { preference, setPreference } = useColorSchemePreference();
  const { isDesktop } = useResponsive();
  const { handleLogout, getFullName } = useAuth();
  const { profileData } = useParentProfile();
  const { themeId, setThemeId } = useParentTheme();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem('user_token');
        if (!userId) { setLogs([]); return; }
        const response = await fetch(`${API_URL}/logtrail.php?user_id=${userId}`);
        if (!response.ok) { setLogs([]); return; }
        const ct = response.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) { setLogs([]); return; }
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const renderModals = () => (
    <>
      <WelcomeGuideModal visible={guideVisible} onClose={() => setGuideVisible(false)} role="parent" accent={BROWN} />
      <ConfirmationModal
        visible={confirmLogout}
        title="Log Out" message="Are you sure you want to log out?"
        confirmText="Log Out" cancelText="Cancel" type="danger"
        onConfirm={() => { setConfirmLogout(false); setSuccessLogout(true); }}
        onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout} message="Logged Out Successfully!" type="success"
        autoClose duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </>
  );

  const content = (
    <ScrollView
      style={!isDesktop ? { flex: 1 } : undefined}
      contentContainerStyle={{ paddingBottom: isDesktop ? 32 : 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── CareLink palette ── */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>CareLink palette</Text>
        <Text style={ss.sectionHint}>
          Pick a color story (default, warm, sage, night, etc.). This changes backgrounds, cards, and accent colors
          in the parent portal only. Saved on this device.
        </Text>
        <View style={ss.themeRow}>
          {PARENT_THEME_OPTIONS.map((opt) => {
            const selected = themeId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setThemeId(opt.id as ParentThemeId)}
                activeOpacity={0.88}
                style={[ss.themeCard, selected && ss.themeCardSelected]}
              >
                <Text style={ss.themeCardLabel} numberOfLines={1}>{opt.label}</Text>
                <Text style={ss.themeCardHint} numberOfLines={3}>{opt.hint}</Text>
                {selected && (
                  <View style={{ position: 'absolute', top: 8, right: 8 }}>
                    <Ionicons name="checkmark-circle" size={20} color={BROWN} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Interface brightness ── */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>Interface brightness</Text>
        <Text style={ss.sectionHint}>
          Controls light or dark mode for the whole CareLink app (both parent and helper). This is separate from the palette above.
        </Text>
        <View style={ss.options}>
          {APPEARANCE_OPTIONS.map((opt) => {
            const selected = preference === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[ss.optionRow, selected && { borderColor: BROWN, borderWidth: 2 }]}
                onPress={() => void setPreference(opt.value)}
                activeOpacity={0.85}
              >
                <View style={ss.optionIcon}>
                  <Ionicons name={opt.icon} size={22} color={selected ? BROWN : MUTED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ss.optionTitle}>{opt.label}</Text>
                  <Text style={ss.optionHint}>{opt.hint}</Text>
                </View>
                {selected
                  ? <Ionicons name="checkmark-circle" size={24} color={BROWN} />
                  : <View style={{ width: 24 }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Help ── */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>Help</Text>
        <TouchableOpacity style={ss.optionRow} onPress={() => setGuideVisible(true)} activeOpacity={0.85}>
          <View style={ss.optionIcon}>
            <Ionicons name="help-buoy-outline" size={22} color={BROWN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ss.optionTitle}>Guide — how CareLink works</Text>
            <Text style={ss.optionHint}>Replay the quick walkthrough for hiring helpers.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={MUTED} />
        </TouchableOpacity>
      </View>

      {/* ── Activity log ── */}
      <View style={ss.section}>
        <Text style={ss.sectionTitle}>Activity log</Text>
        {loading ? (
          <View style={ss.center}>
            <ActivityIndicator size="large" color={BROWN} />
          </View>
        ) : logs.length === 0 ? (
          <Text style={ss.emptyText}>No activity recorded yet.</Text>
        ) : (
          logs.map((item, index) => (
            <View key={index} style={ss.logItem}>
              <Text style={ss.logAction}>
                {item.action ? String(item.action).replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}
              </Text>
              <Text style={ss.logTime}>{item.timestamp}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1 }}>
        <ParentSettingsWeb
          userName={getFullName()}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          verified={profileData?.profile?.verification_status === 'Verified'}
          onLogout={() => setConfirmLogout(true)}
        />
        {renderModals()}
      </View>
    );
  }

  return (
    <SafeAreaView style={ss.mobileRoot} edges={['top']}>
      <View style={ss.mobileHeader}>
        {Platform.OS === 'web' ? (
          <TouchableOpacity
            onPress={() => setIsMobileMenuOpen(true)}
            style={ss.backBtn} hitSlop={12}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color={BROWN} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={ss.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={BROWN} />
          </TouchableOpacity>
        )}
        <Text style={ss.mobileHeaderTitle}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={[ss.mobileBody, { backgroundColor: 'transparent' }]}>{content}</View>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={() => { setIsMobileMenuOpen(false); setConfirmLogout(true); }}
      />
      <ParentTabBar />
      {renderModals()}
    </SafeAreaView>
  );
}
