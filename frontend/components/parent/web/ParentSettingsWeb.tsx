// components/parent/web/ParentSettingsWeb.tsx — desktop "Settings" screen on the
// pt design system + ParentTopNav. Palette · interface brightness · help · activity
// log. Mirrors app/(parent)/settings/index.tsx logic. Logout handled by the host.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentPortalMode } from '@/hooks/parent';
import { useColorSchemePreference, type ColorSchemePreference } from '@/contexts/ColorSchemePreferenceContext';
import { PARENT_THEME_OPTIONS, type ParentThemeId } from '@/constants/parentThemePalettes';
import { useParentTheme } from '@/contexts/ParentThemeContext';
import WelcomeGuideModal from '@/components/shared/WelcomeGuideModal';
import { ParentTopNav } from './ParentTopNav';
import { pt } from './parentWebTheme';

const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;

const APPEARANCE_OPTIONS: { value: ColorSchemePreference; label: string; hint: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'system', label: 'Match device', hint: 'Use the same light or dark mode as this computer.', icon: 'desktop-outline' },
  { value: 'light', label: 'Always light', hint: 'Bright backgrounds and dark text across the app chrome.', icon: 'sunny-outline' },
  { value: 'dark', label: 'Always dark', hint: 'Deep backgrounds and light text across the whole app.', icon: 'moon-outline' },
];

export function ParentSettingsWeb({ userName, avatar, verified, onLogout }: { userName: string; avatar: string | null; verified: boolean; onLogout: () => void }) {
  const isWorkMode = useParentPortalMode();
  const { preference, setPreference } = useColorSchemePreference();
  const { themeId, setThemeId } = useParentTheme();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [guideVisible, setGuideVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userId = await AsyncStorage.getItem('user_token');
        if (!userId) { setLogs([]); return; }
        const res = await fetch(`${API_URL}/logtrail.php?user_id=${userId}`);
        if (!res.ok) { setLogs([]); return; }
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) { setLogs([]); return; }
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } catch { setLogs([]); } finally { setLoading(false); }
    })();
  }, []);

  return (
    <View style={s.root}>
      <ParentTopNav active="none" mode={isWorkMode ? 'work' : 'recruitment'} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.inner}>
          <Text style={s.pageTitle}>Settings</Text>
          <Text style={s.pageSub}>Parent Portal — appearance &amp; account</Text>

          {/* CareLink palette */}
          <View style={s.section}>
            <Text style={s.secTitle}>CareLink Palette</Text>
            <Text style={s.secHint}>Pick a color story. This changes backgrounds, cards, and accents in the parent portal only. Saved on this device.</Text>
            <View style={s.themeGrid}>
              {PARENT_THEME_OPTIONS.map((opt) => {
                const on = themeId === opt.id;
                return (
                  <Pressable key={opt.id} onPress={() => setThemeId(opt.id as ParentThemeId)} style={({ hovered }: any) => [s.themeCard, on && s.themeCardOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                    <Text style={s.themeLabel} numberOfLines={1}>{opt.label}</Text>
                    <Text style={s.themeHint} numberOfLines={3}>{opt.hint}</Text>
                    {on && <View style={s.themeCheck}><Ionicons name="checkmark-circle" size={20} color={pt.accent} /></View>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Interface brightness */}
          <View style={s.section}>
            <Text style={s.secTitle}>Interface Brightness</Text>
            <Text style={s.secHint}>Controls light or dark mode for the whole CareLink app. Separate from the palette above.</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {APPEARANCE_OPTIONS.map((opt) => {
                const on = preference === opt.value;
                return (
                  <Pressable key={opt.value} onPress={() => void setPreference(opt.value)} style={({ hovered }: any) => [s.optRow, on && { borderColor: pt.accent, borderWidth: 2 }, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                    <View style={s.optIc}><Ionicons name={opt.icon} size={21} color={on ? pt.accent : pt.muted} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.optTitle}>{opt.label}</Text>
                      <Text style={s.optHint}>{opt.hint}</Text>
                    </View>
                    {on ? <Ionicons name="checkmark-circle" size={23} color={pt.accent} /> : <View style={{ width: 23 }} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Help */}
          <View style={s.section}>
            <Text style={s.secTitle}>Help</Text>
            <Pressable onPress={() => setGuideVisible(true)} style={({ hovered }: any) => [s.optRow, TRANS, hovered && { borderColor: pt.accent }]}>
              <View style={s.optIc}><Ionicons name="help-buoy-outline" size={21} color={pt.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.optTitle}>Guide — how CareLink works</Text>
                <Text style={s.optHint}>Replay the quick walkthrough for hiring helpers.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={pt.subtle} />
            </Pressable>
          </View>

          {/* Activity log */}
          <View style={s.section}>
            <Text style={s.secTitle}>Activity Log</Text>
            {loading ? (
              <ActivityIndicator size="large" color={pt.accent} style={{ marginVertical: 20 }} />
            ) : logs.length === 0 ? (
              <Text style={s.emptyText}>No activity recorded yet.</Text>
            ) : (
              <View style={s.logCard}>
                {logs.map((item, i) => (
                  <View key={i} style={[s.logItem, i < logs.length - 1 && s.logBorder]}>
                    <Text style={s.logAction}>{item.action ? String(item.action).replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}</Text>
                    <Text style={s.logTime}>{item.timestamp}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Log out */}
          <Pressable onPress={onLogout} style={({ hovered }: any) => [s.logoutBtn, TRANS, hovered && { backgroundColor: pt.redSoft, borderColor: pt.red }]}>
            <Ionicons name="log-out-outline" size={18} color={pt.red} /><Text style={s.logoutText}>Log Out</Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      <WelcomeGuideModal visible={guideVisible} onClose={() => setGuideVisible(false)} role="parent" accent={pt.accent} />
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pt.canvas },
  scroll: { paddingBottom: 30 },
  inner: { maxWidth: 860, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 24 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 2 },

  section: { marginTop: 24 },
  secTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink, marginBottom: 4 },
  secHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, lineHeight: 19, marginBottom: 12 },

  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { flexGrow: 1, flexBasis: 200, minWidth: 180, maxWidth: 260, backgroundColor: pt.surface, borderWidth: 1.5, borderColor: pt.line, borderRadius: 14, padding: 14, ...shadowSm, cursor: 'pointer' as any },
  themeCardOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  themeLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  themeHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 4, lineHeight: 17 },
  themeCheck: { position: 'absolute', top: 8, right: 8 },

  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 14, ...shadowSm },
  optIc: { width: 42, height: 42, borderRadius: 12, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  optTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink },
  optHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 2, lineHeight: 17 },

  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, paddingVertical: 8 },
  logCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 14, overflow: 'hidden', ...shadowSm },
  logItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  logBorder: { borderBottomWidth: 1, borderBottomColor: pt.lineSoft },
  logAction: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink, letterSpacing: 0.3 },
  logTime: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.subtle },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 26, borderWidth: 1.4, borderColor: pt.line, borderRadius: 13, paddingVertical: 14 },
  logoutText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.red },
});
