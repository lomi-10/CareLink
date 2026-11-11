import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentJobs, useParentRecommendations } from '@/hooks/parent';
import { bestJobForHelper, computeHelperJobMatch } from '@/lib/parentHelperMatch';
import { useCareBot } from '@/contexts/CareBotContext';
import { pt } from './parentWebTheme';
import { ParentHeroCard } from './ParentHeroCard';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const initials = (name: string) => (name || '?').trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

export function ParentHomeWeb({
  userName,
  avatar,
  verified,
  completeness,
  stats,
  onSwitchMode,
  banners,
  announcement,
}: {
  userName: string;
  avatar: string | null;
  verified: boolean;
  completeness: number;
  stats: { active_placements: number; saved_helpers: number };
  onSwitchMode: (mode: 'recruitment' | 'work') => void;
  banners?: React.ReactNode;
  announcement?: React.ReactNode;
}) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { recommendations, loading } = useParentRecommendations();
  const { jobs } = useParentJobs();
  const firstName = (userName || 'there').split(' ')[0];
  const go = (path: string) => router.push(path as never);
  const helpers = useMemo(
    () => recommendations
      .map((helper) => ({
        helper,
        score: computeHelperJobMatch(helper, bestJobForHelper(helper, jobs)).score,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4),
    [recommendations, jobs],
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.page}>
        <View style={s.sidebar}>
          <View style={s.card}>
            <Text style={s.eyebrow}>Current Mode</Text>
            <View style={s.modeRow}>
              <View style={s.modeIcon}><Ionicons name="people" size={20} color={pt.accent} /></View>
              <Text style={s.modeName}>Recruitment Mode</Text>
            </View>
            <Text style={s.modeDescription}>Browse profiles and manage your household placements.</Text>
            <Pressable onPress={() => onSwitchMode('work')} style={({ hovered }: any) => [s.switchButton, TRANS, hovered && { backgroundColor: pt.accentSoft }]}>
              <Text style={s.switchText}>Switch to Work Mode</Text>
              <Ionicons name="arrow-forward" size={15} color={pt.accent} />
            </Pressable>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Quick Actions</Text>
            <QuickAction icon="search-outline" label="Browse Helpers" onPress={() => go('/(parent)/browse')} />
            <QuickAction icon="people-outline" label="My Helpers" onPress={() => go('/(parent)/hire')} />
            <QuickAction icon="chatbubble-outline" label="Messages" onPress={() => go('/(parent)/messages')} />
          </View>

          <View style={s.careBotCard}>
            <Image source={CAREBOT_ICON} style={s.careBotImage} resizeMode="contain" />
            <Text style={s.careBotTitle}>Need help?</Text>
            <Text style={s.careBotText}>Ask CareBot about contracts, wages, leave, or the Kasambahay Law.</Text>
            <Pressable onPress={openCareBot} style={({ hovered, pressed }: any) => [s.careBotButton, TRANS, hovered && { opacity: 0.85 }, pressed && { opacity: 0.75 }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={pt.ink} />
              <Text style={s.careBotButtonText}>Chat with CareBot</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.main}>
          {banners}
          <ParentHeroCard
            badge={{ icon: 'heart', label: 'FAMILY FIRST' }}
            greeting={greeting()}
            name={firstName}
            tagline="Browse helper profiles and manage your household placements."
            avatar={avatar}
            verified={verified}
            primary={{ label: 'Browse Helpers', icon: 'search-outline', onPress: () => go('/(parent)/browse') }}
            secondary={{ label: 'My Helpers', icon: 'people-outline', onPress: () => go('/(parent)/hire') }}
          />
          {announcement}
          {!verified && completeness > 0 ? (
            <Text style={s.profileHint}>Profile {Math.round(completeness)}% complete · finish setup to unlock more features.</Text>
          ) : null}

          <View style={s.statRow}>
            <StatCard label="Active Helpers" value={stats.active_placements} icon="people-outline" onPress={() => go('/(parent)/hire')} />
            <StatCard label="Saved Helpers" value={stats.saved_helpers} icon="bookmark-outline" onPress={() => go('/(parent)/browse')} />
          </View>

          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Recommended Helpers</Text>
              <Pressable onPress={() => go('/(parent)/browse')}><Text style={s.link}>Browse all →</Text></Pressable>
            </View>
            {loading ? (
              <Text style={s.muted}>Loading recommendations…</Text>
            ) : helpers.length === 0 ? (
              <Text style={s.muted}>Browse verified profiles to find a helper for your household.</Text>
            ) : (
              <View style={s.helperList}>
                {helpers.map(({ helper, score }) => {
                  const location = [helper.municipality, helper.province].filter(Boolean).join(', ');
                  return (
                    <Pressable key={helper.user_id} onPress={() => go('/(parent)/browse')} style={({ hovered }: any) => [s.helperRow, TRANS, hovered && { borderColor: pt.accent, backgroundColor: pt.raise }]}>
                      {helper.profile_image
                        ? <Image source={{ uri: helper.profile_image }} style={s.helperAvatar} />
                        : <View style={[s.helperAvatar, s.avatarFallback]}><Text style={s.avatarInitials}>{initials(helper.full_name)}</Text></View>}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={s.nameRow}>
                          <Text style={s.helperName} numberOfLines={1}>{helper.full_name}</Text>
                          {score > 0 ? <Text style={s.matchScore}>{Math.round(score)}% match</Text> : null}
                        </View>
                        {helper.is_verified ? <Text style={s.verifiedLabel}>PESO Verified</Text> : null}
                        <Text style={s.helperMeta} numberOfLines={1}>
                          {[Number(helper.experience_years) > 0 ? `${helper.experience_years} yrs experience` : null, location].filter(Boolean).join(' · ') || 'View profile'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={pt.subtle} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.quickAction, TRANS, hovered && { backgroundColor: pt.accentSoft }]}>
      <Ionicons name={icon} size={18} color={pt.accent} />
      <Text style={s.quickActionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={pt.subtle} />
    </Pressable>
  );
}

function StatCard({ label, value, icon, onPress }: {
  label: string; value: number; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: any) => [s.statCard, TRANS, hovered && { borderColor: pt.accent }]}>
      <View style={s.statIcon}><Ionicons name={icon} size={20} color={pt.accent} /></View>
      <View>
        <Text style={s.statValue}>{value}</Text>
        <Text style={s.statLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  scroll: { paddingBottom: 34 },
  page: { flexDirection: 'row', gap: 20, maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22, flexWrap: 'wrap' },
  sidebar: { width: 236, flexShrink: 0, gap: 16 },
  main: { flex: 1, minWidth: 480, gap: 16 },
  card: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18 },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: pt.ink },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  eyebrow: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: pt.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  modeName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.ink },
  modeDescription: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, lineHeight: 18, marginBottom: 14 },
  switchButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: pt.accent, borderRadius: 11, paddingVertical: 10 },
  switchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },
  quickAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: pt.line, paddingVertical: 10 },
  quickActionLabel: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  careBotCard: { alignItems: 'center', backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18 },
  careBotImage: { width: 84, height: 74, marginBottom: 4 },
  careBotTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink },
  careBotText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, textAlign: 'center', lineHeight: 18, marginTop: 6, marginBottom: 13 },
  careBotButton: { width: '100%', minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, backgroundColor: pt.accentSoft },
  careBotButtonText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },
  profileHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted },
  statRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 15 },
  statIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: pt.ink },
  statLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted, marginTop: 2 },
  link: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: pt.accent },
  muted: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.muted, lineHeight: 19 },
  helperList: { gap: 8 },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 11 },
  helperAvatar: { width: 46, height: 46, borderRadius: 13 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: pt.accentSoft },
  avatarInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: pt.accent },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helperName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  matchScore: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: pt.accent },
  verifiedLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: pt.green, marginTop: 2 },
  helperMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, marginTop: 3 },
});
