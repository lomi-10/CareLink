// app/(helper)/profile/index.tsx
// PHP: helper/get_profile.php (via useHelperProfile), helper/get_stats.php (via useHelperStats)
// Main profile screen — hero card (with strength strip inside), quick stats, 3 section cards.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator, SafeAreaView,
  ScrollView, Text, Modal, StyleSheet,
  TouchableOpacity, View, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperProfile } from '@/hooks/helper';
import { HelperProfileWeb } from '@/components/helper/web/HelperProfileWeb';
import { useHelperStats } from '@/hooks/helper';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';
import { HelperTabBar, MobileMenu, Sidebar } from '@/components/helper/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { WorkModeTabBar } from '@/components/helper/work';
import EditHelperProfileModal from '@/components/helper/profile/profileEditModal/EditHelperProfileModal';
import { useProfileTheme } from './profile.theme';
import { createStyles } from './index.styles';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProfileViewer {
  viewer_id: number;
  viewer_name: string;
  viewer_photo: string | null;
  last_viewed_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 2)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelperProfileMain() {
  const router = useRouter();
  const t = useProfileTheme();
  const { PAGE_BG, ORANGE, DARK, MUTED, GREEN, CARD_BG } = t;
  const s = useMemo(() => createStyles(t), [t]);
  const { handleLogout } = useAuth();
  const { isDesktop }    = useResponsive();
  const { unreadCount }  = useNotifications('helper');
  const { profileData, loading, refresh, getFullName } = useHelperProfile();
  const { stats }        = useHelperStats();
  const { isWorkMode, activeHire } = useHelperWorkMode();

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const [viewers,         setViewers]         = useState<ProfileViewer[]>([]);
  const [viewersLoading,  setViewersLoading]  = useState(false);
  const [viewersModalOpen, setViewersModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem('user_data').then(raw => {
      if (!raw || cancelled) return;
      const { user_id } = JSON.parse(raw);
      setViewersLoading(true);
      fetch(`${API_URL}/helper/get_profile_views.php?user_id=${user_id}&days=7`)
        .then(r => r.json())
        .then(data => { if (!cancelled && data.success) setViewers(data.views ?? []); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setViewersLoading(false); });
    });
    return () => { cancelled = true; };
  }, []);

  const initiateLogout = () => { setMenuOpen(false); setConfirmLogout(true); };
  const executeLogout  = () => { setConfirmLogout(false); setSuccessLogout(true); };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const { profile, mappedSpecialties, documents } = profileData ?? {
    profile: null, mappedSpecialties: { jobs: [], skills: [], languages: [] }, documents: [],
  };

  const fullName    = getFullName();
  const photoUri    = profile?.profile_image ?? null;
  const isVerified  = profile?.verification_status === 'Verified';
  const strength    = profileData?.profile_completeness ?? 0;
  const jobRoles    = mappedSpecialties?.jobs ?? [];
  const skills      = mappedSpecialties?.skills ?? [];
  const languages   = mappedSpecialties?.languages ?? [];
  const docVerified = (documents ?? []).filter((d: any) => d.status === 'Verified').length;
  const docTotal    = (documents ?? []).length;
  const workHistory = profileData?.work_history ?? [];

  const rolesPreview = jobRoles.slice(0, 3).join(' • ');

  const strengthMsg =
    strength >= 100 ? 'Excellent! Your profile is complete.'
    : strength >= 75 ? 'Almost there — a few more details.'
    : strength >= 50 ? 'Good start — keep filling in your info.'
    : 'Your profile needs more information.';

  const sections = [
    {
      key: 'personal', icon: 'person' as const,
      iconBg: '#DBEAFE', iconColor: '#2563EB',
      title: 'Personal Information',
      subtitle: 'Work preferences included',
      // Complete only when the core personal fields are filled (same required
      // set the backend uses for profile strength) — not just gender, which is
      // set at signup and would mark it "Complete" before the user starts.
      status: ((profile as any)?.contact_number && profile?.birth_date && profile?.gender
        && (profile as any)?.province && (profile as any)?.municipality && (profile as any)?.barangay)
        ? 'Complete' : 'Incomplete',
      route: '/(helper)/profile/personal',
    },
    {
      key: 'skills', icon: 'sparkles' as const,
      iconBg: '#EDE9FE', iconColor: '#7C3AED',
      title: 'Skills & Specialties',
      subtitle: `${jobRoles.length} Roles • ${skills.length} Skills • ${languages.length} Languages`,
      status: jobRoles.length > 0 ? 'Complete' : 'Incomplete',
      route: '/(helper)/profile/skills',
    },
    {
      key: 'experience', icon: 'time' as const,
      iconBg: '#DBEAFE', iconColor: '#2563EB',
      title: 'Work Experience',
      subtitle: workHistory.length > 0
        ? `${workHistory.length} past employer${workHistory.length !== 1 ? 's' : ''}${workHistory.some((w: any) => w.can_contact) ? ' • references' : ''}`
        : 'Add past jobs & references',
      status: (workHistory.length > 0 || Number((profile as any)?.years_experience) > 0) ? 'Complete' : 'Incomplete',
      route: '/(helper)/profile/experience',
    },
    {
      key: 'documents', icon: 'shield-checkmark' as const,
      iconBg: '#D1FAE5', iconColor: GREEN,
      title: 'Documents & Verification',
      subtitle: docTotal > 0 ? `${docVerified} of ${docTotal} documents verified` : 'No documents uploaded',
      status: isVerified ? 'Verified' : docTotal > 0 ? 'Pending' : 'Not started',
      route: '/(helper)/profile/documents',
    },
  ];

  // ── Shared scrollable content ──────────────────────────────────────────────
  const content = (
    <ScrollView
      contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {/* ── Hero card (photo + info + strength strip) ── */}
      <LinearGradient
        colors={['#6B2E0A', '#3B1508', '#1E0A04']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.hero, isDesktop && s.heroDesktop]}
      >
        {/* ── Pencil edit button — absolute top-right ── */}
        <TouchableOpacity style={s.editCardBtn} onPress={() => setEditOpen(true)} activeOpacity={0.85}>
          <Ionicons name="pencil" size={14} color={DARK} />
        </TouchableOpacity>

        {/* ── Top: photo + info ── */}
        <View style={s.heroTop}>
          {/* Photo */}
          <View style={s.photoCol}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" />
            ) : (
              <View style={s.photoFallback}>
                <Ionicons name="person" size={44} color="rgba(255,255,255,0.4)" />
              </View>
            )}
          </View>

          {/* Info */}
          <View style={s.heroInfo}>
            <Text style={s.heroName} numberOfLines={2}>{fullName}</Text>

            {isVerified && (
              <View style={s.pesoBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#fff" />
                <Text style={s.pesoBadgeText}>PESO Verified Helper</Text>
                <Ionicons name="checkmark-circle" size={11} color="#A7F3D0" />
              </View>
            )}

            {rolesPreview ? (
              <Text style={s.heroRoles} numberOfLines={2}>{rolesPreview}</Text>
            ) : null}

            {profile?.years_experience ? (
              <Text style={s.heroExp}>{profile.years_experience} Years Experience</Text>
            ) : null}
          </View>
        </View>

        {/* ── Divider ── */}
        <View style={s.heroDivider} />

        {/* ── Bottom strip: profile strength ── */}
        <View style={s.strengthStrip}>
          <StrengthRing percent={strength} />
          <View style={s.strengthText}>
            <Text style={s.strengthTitle}>Profile Strength</Text>
            <Text style={s.strengthMsg}>{strengthMsg}</Text>
          </View>
          <TouchableOpacity
            style={s.viewPublicBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(helper)/profile/public-preview' as never)}
          >
            <Ionicons name="eye-outline" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={s.viewPublicText}>View Public Profile</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Resume banner ── this profile IS the helper's resume ── */}
      <TouchableOpacity style={s.resumeBanner} activeOpacity={0.85} onPress={() => router.push('/(helper)/profile/public-preview' as never)}>
        <View style={s.resumeIcon}><Ionicons name="document-text" size={22} color="#fff" /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.resumeTitle}>This profile is your resumé ✨</Text>
          <Text style={s.resumeSub}>It's exactly what families see when they consider hiring you. Tap to preview it.</Text>
        </View>
        <View style={s.resumeCta}>
          <Ionicons name="eye-outline" size={15} color={ORANGE} />
          <Text style={s.resumeCtaText}>Preview</Text>
        </View>
      </TouchableOpacity>

      {/* ── Quick Overview ── */}
      <Text style={s.sectionLabel}>Quick Overview</Text>
      <View style={s.overviewCard}>
        <OverviewTile icon="briefcase" iconBg="#FEE2D5" iconColor={ORANGE}  value={stats.applications}  label="Applications" />
        <View style={s.overviewDiv} />
        <OverviewTile
          icon="eye" iconBg="#D1FAE5" iconColor={GREEN}
          value={stats.profile_views} label="Profile Views"
          onPress={() => setViewersModalOpen(true)}
        />
        <View style={s.overviewDiv} />
        <OverviewTile icon="bookmark" iconBg="#F5E6CC" iconColor="#7A4E2A" value={stats.saved_jobs}    label="Saved Jobs" />
        <View style={s.overviewDiv} />
        <OverviewTile icon="star"     iconBg="#FEF3C7" iconColor="#D97706" value="—"                   label="Rating" />
      </View>

      {/* ── Profile Sections ── */}
      <Text style={s.sectionLabel}>Profile Sections</Text>
      <View style={s.sectionsWrap}>
        {sections.map((sec, idx) => {
          const isGood = sec.status === 'Verified' || sec.status === 'Complete';
          return (
            <React.Fragment key={sec.key}>
              <TouchableOpacity
                style={s.sectionCard}
                onPress={() => router.push(sec.route as never)}
                activeOpacity={0.8}
              >
                <View style={[s.sectionIcon, { backgroundColor: sec.iconBg }]}>
                  <Ionicons name={sec.icon} size={20} color={sec.iconColor} />
                </View>
                <View style={s.sectionInfo}>
                  <Text style={s.sectionCardTitle}>{sec.title}</Text>
                  <Text style={s.sectionCardSub}>{sec.subtitle}</Text>
                </View>
                <View style={s.sectionRight}>
                  <View style={[s.statusBadge, { backgroundColor: isGood ? '#D1FAE5' : '#FEF3C7' }]}>
                    <Text style={[s.statusText, { color: isGood ? GREEN : '#D97706' }]}>
                      {sec.status}
                    </Text>
                    {isGood && <Ionicons name="checkmark" size={10} color={GREEN} />}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginTop: 6 }} />
                </View>
              </TouchableOpacity>
              {idx < sections.length - 1 && <View style={s.sectionDivider} />}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );

  const viewersModal = (
    <ProfileViewersModal
      visible={viewersModalOpen}
      viewers={viewers}
      loading={viewersLoading}
      onClose={() => setViewersModalOpen(false)}
    />
  );

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1 }}>
        <HelperProfileWeb
          userName={fullName}
          avatar={(profileData?.profile?.profile_image as string) ?? null}
          onLogout={initiateLogout}
        />
        <ConfirmationModal
          visible={confirmLogout} title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out" cancelText="Cancel" type="danger"
          onConfirm={executeLogout} onCancel={() => setConfirmLogout(false)}
        />
        <NotificationModal
          visible={successLogout} message="Logged Out Successfully!" type="success"
          autoClose duration={1500}
          onClose={() => { setSuccessLogout(false); handleLogout(); }}
        />
      </View>
    );
  }

  // ── MOBILE ───────────────────────────────────────────────────────────────────
  return (
    <View style={[s.page, { backgroundColor: PAGE_BG }]}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Top bar */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => setMenuOpen(true)}>
            <Ionicons name="menu" size={26} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>My Profile</Text>
          <TouchableOpacity style={s.barBtn} onPress={() => router.push('/(helper)/notifications')}>
            <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={22} color={DARK} />
            {unreadCount > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {content}

        {isWorkMode && activeHire ? <WorkModeTabBar /> : <HelperTabBar />}
      </SafeAreaView>

      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        stats={stats}
        handleLogout={initiateLogout}
      />
      {viewersModal}
      <EditHelperProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSaveSuccess={() => { setEditOpen(false); refresh(); }}
      />
      <ConfirmationModal
        visible={confirmLogout} title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out" cancelText="Cancel" type="danger"
        onConfirm={executeLogout} onCancel={() => setConfirmLogout(false)}
      />
      <NotificationModal
        visible={successLogout} message="Logged Out Successfully!" type="success"
        autoClose duration={1500}
        onClose={() => { setSuccessLogout(false); handleLogout(); }}
      />
    </View>
  );
}

// ─── StrengthRing ─────────────────────────────────────────────────────────────

function StrengthRing({ percent }: { percent: number }) {
  const t = useProfileTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const ringColor = percent >= 100 ? '#D4A017' : percent >= 75 ? '#E86019' : '#9CA3AF';
  return (
    <View style={[s.ringOuter, { borderColor: ringColor }]}>
      <Text style={[s.ringPct, { color: ringColor }]}>{percent}%</Text>
    </View>
  );
}

// ─── OverviewTile ─────────────────────────────────────────────────────────────

function OverviewTile({ icon, iconBg, iconColor, value, label, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
  value: string | number; label: string;
  onPress?: () => void;
}) {
  const t = useProfileTheme();
  const s = useMemo(() => createStyles(t), [t]);
  const content = (
    <>
      <View style={[s.ovIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={s.ovValue}>{value}</Text>
      <Text style={s.ovLabel}>{label}</Text>
      {onPress && <Ionicons name="chevron-forward" size={11} color={iconColor} style={{ marginTop: -2 }} />}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={s.ovTile} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={s.ovTile}>{content}</View>;
}

// ─── ProfileViewersModal ──────────────────────────────────────────────────────

function ProfileViewersModal({
  visible, viewers, loading, onClose,
}: {
  visible: boolean;
  viewers: ProfileViewer[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={vm.overlay}>
        <View style={vm.sheet}>
          <View style={vm.handle} />
          <View style={vm.header}>
            <View style={{ flex: 1 }}>
              <Text style={vm.title}>Who Viewed Your Profile</Text>
              <Text style={vm.subtitle}>Parents who viewed you in the last 7 days</Text>
            </View>
            <TouchableOpacity style={vm.closeBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={18} color="#7A5C3E" />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={vm.empty}><ActivityIndicator color="#E86019" /></View>
            ) : viewers.length === 0 ? (
              <View style={vm.empty}>
                <Ionicons name="eye-off-outline" size={36} color="#7A5C3E" />
                <Text style={vm.emptyTitle}>No views yet</Text>
                <Text style={vm.emptySub}>Parents who browse your profile will appear here.</Text>
              </View>
            ) : (
              <View style={vm.list}>
                {viewers.map((v, idx) => (
                  <React.Fragment key={`${v.viewer_id}-${v.last_viewed_at}`}>
                    <View style={vm.item}>
                      {v.viewer_photo ? (
                        <Image source={{ uri: v.viewer_photo }} style={vm.avatar} contentFit="cover" />
                      ) : (
                        <View style={vm.avatarFb}>
                          <Ionicons name="person" size={20} color="#7A5C3E" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={vm.name}>{v.viewer_name}</Text>
                        <Text style={vm.time}>{relativeTime(v.last_viewed_at)}</Text>
                      </View>
                      <View style={vm.eyeChip}>
                        <Ionicons name="eye" size={12} color="#059669" />
                        <Text style={vm.eyeChipText}>Viewed</Text>
                      </View>
                    </View>
                    {idx < viewers.length - 1 && <View style={vm.divider} />}
                  </React.Fragment>
                ))}
              </View>
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const vm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#FFFBF7', borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '75%' },
  handle:    { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#EDE0D0', marginTop: 12, marginBottom: 4 },
  header:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EDE0D0' },
  title:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: '#2A1608', marginBottom: 2 },
  subtitle:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: '#7A5C3E' },
  closeBtn:  { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F5E6CC', alignItems: 'center', justifyContent: 'center' },
  list:      { paddingHorizontal: 16, paddingTop: 8 },
  item:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  divider:   { height: StyleSheet.hairlineWidth, backgroundColor: '#EDE0D0' },
  avatar:    { width: 44, height: 44, borderRadius: 22 },
  avatarFb:  { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE0D0', alignItems: 'center', justifyContent: 'center' },
  name:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#2A1608', marginBottom: 2 },
  time:      { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: '#7A5C3E' },
  eyeChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  eyeChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#059669' },
  empty:     { alignItems: 'center', paddingVertical: 40, gap: 10, paddingHorizontal: 32 },
  emptyTitle:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#2A1608', marginTop: 4 },
  emptySub:  { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#7A5C3E', textAlign: 'center', lineHeight: 18 },
});
