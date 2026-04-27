import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './settings.styles';
import { PARENT_THEME_OPTIONS, type ParentThemeId } from '@/constants/parentThemePalettes';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import { useAuth, useResponsive } from '@/hooks/shared';
import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { themeId, setThemeId, color } = useParentTheme();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const c = color;
  const accent = c.parent;

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem('user_token');
        if (!userId) {
          setLogs([]);
          return;
        }
        const response = await fetch(`${API_URL}/logtrail.php?user_id=${userId}`);
        const data = await response.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onPickTheme = (id: ParentThemeId) => {
    setThemeId(id);
  };

  const renderModals = () => (
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

  const content = (
    <ScrollView
      style={!isDesktop ? { flex: 1 } : undefined}
      contentContainerStyle={{ paddingBottom: isDesktop ? 32 : 16 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.ink }]}>Portal theme</Text>
        <Text style={[styles.sectionHint, { color: c.inkMuted }]}>
          This updates colors across the parent portal. Your choice is saved on this device.
        </Text>
        <View style={styles.themeRow}>
          {PARENT_THEME_OPTIONS.map((opt) => {
            const selected = themeId === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => onPickTheme(opt.id)}
                activeOpacity={0.88}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: selected ? c.parentSoft : c.surface,
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
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.ink }]}>Activity log</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : logs.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.muted }]}>No activity recorded yet.</Text>
        ) : (
          logs.map((item, index) => (
            <View
              key={index}
              style={[
                styles.logItem,
                { backgroundColor: c.surface, borderColor: c.line, borderLeftColor: accent, borderLeftWidth: 4 },
              ]}
            >
              <Text style={[styles.logAction, { color: c.ink }]}>
                {item.action ? String(item.action).replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}
              </Text>
              <Text style={[styles.logTime, { color: c.muted }]}>{item.timestamp}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <Sidebar onLogout={() => setConfirmLogout(true)} />
        <ScrollView style={styles.desktopMain} contentContainerStyle={styles.desktopScroll}>
          <View style={styles.desktopTopBar}>
            <Text style={[styles.desktopPageTitle, { color: c.ink }]}>Settings</Text>
            <Text style={[styles.desktopPageSub, { color: c.muted }]}>Parent Portal — appearance & account</Text>
          </View>
          {content}
        </ScrollView>
        {renderModals()}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mobileRoot} edges={['top']}>
      <View style={styles.mobileHeader}>
        {Platform.OS === 'web' ? (
          <TouchableOpacity
            onPress={() => setIsMobileMenuOpen(true)}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color={accent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={26} color={accent} />
          </TouchableOpacity>
        )}
        <Text style={[styles.mobileHeaderTitle, { color: c.ink }]}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={[styles.mobileBody, { backgroundColor: 'transparent' }]}>{content}</View>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        handleLogout={() => {
          setIsMobileMenuOpen(false);
          setConfirmLogout(true);
        }}
      />
      <ParentTabBar />
      {renderModals()}
    </SafeAreaView>
  );
}
