// app/(parent)/profile/index.tsx
// PHP: parent/get_profile.php (via useParentProfile), parent/get_stats.php (via useParentStats)
// Main profile screen — hero card (photo + PESO pill + circular strength ring),
// Quick Overview stat tiles, Household Summary, and a "Profile Sections" row-list
// that links to 4 dedicated detail screens (personal / household / address / documents).

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, RefreshControl, SafeAreaView,
  ScrollView, Text, TouchableOpacity, View,
} from 'react-native';

import { useParentProfile, useParentStats } from '@/hooks/parent';
import { useAuth, useResponsive, useNotifications } from '@/hooks/shared';

import { Sidebar, MobileMenu, ParentTabBar } from '@/components/parent/home';
import { ConfirmationModal, NotificationModal } from '@/components/shared';
import EditParentProfileModal from '@/components/parent/profile/EditParentProfileModal';

import { formatParentHouseholdType } from '@/constants/parentHousehold';
import {
  BG, BROWN, CARAMEL, GOLD, DARK, MUTED, ICON_BG, GREEN, SUCCESS_BG,
} from '@/components/parent/home/parentWarmTheme';
import { s } from './index.styles';

// Warm, solid hero gradient + a small cohesive accent set (no "rainbow" blues/reds —
// every stat/section icon stays within the caramel→rust→gold family per feedback).
const HERO_GRADIENT: [string, string, string] = ['#F6D9AE', '#E2A968', '#C5853E']; // matches dashboard GreetingCard
const TERRACOTTA = '#C8623F';
const ORANGE     = '#DD8A3C';

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentProfile() {
  const router = useRouter();
  const { handleLogout } = useAuth();
  const { isDesktop } = useResponsive();
  const { unreadCount } = useNotifications('parent');
  const { profileData, loading, refresh, getFullName, getVerificationBadge } = useParentProfile();
  const { stats } = useParentStats();

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [editOpen,      setEditOpen]      = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [successLogout, setSuccessLogout] = useState(false);

  const initiateLogout = () => { setMenuOpen(false); setConfirmLogout(true); };
  const executeLogout  = () => { setConfirmLogout(false); setSuccessLogout(true); };

  if (loading || !profileData) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const { user, profile, household } = profileData;
  const badge       = getVerificationBadge();
  const isVerified  = badge.variant === 'peso_verified';
  const fullName    = getFullName();
  const photoUri    = profile?.profile_image ?? null;
  const strength    = profileData.profile_completeness ?? 0;
  const documents   = profileData.documents ?? [];
  const docVerified = documents.filter((d: any) => d.status === 'Verified').length;
  const docTotal    = documents.length;

  const strengthMsg =
    strength >= 100 ? 'Excellent! Your profile is complete.'
    : strength >= 75 ? 'Great job! Your profile is almost complete.'
    : strength >= 50 ? 'Good start — keep filling in your info.'
    : 'Your profile needs more information.';

  // ── Profile Sections (status pills) ──
  const personalComplete  = !!(user?.username && profile?.contact_number);
  const householdComplete = !!household?.household_type;
  const addressComplete   = !!profile?.address;

  const sections = [
    {
      key: 'personal', icon: 'person' as const,
      title: 'Personal Information',
      subtitle: 'Username, email, contact number',
      status: personalComplete ? 'Complete' : 'Incomplete',
      route: '/(parent)/profile/personal',
    },
    {
      key: 'household', icon: 'home' as const,
      title: 'Household Information',
      subtitle: 'Housing type, family members, pets',
      status: householdComplete ? 'Complete' : 'Incomplete',
      route: '/(parent)/profile/household',
    },
    {
      key: 'address', icon: 'location' as const,
      title: 'Address Information',
      subtitle: 'Province, municipality, barangay',
      status: addressComplete ? 'Complete' : 'Incomplete',
      route: '/(parent)/profile/address',
    },
    {
      key: 'documents', icon: 'document-text' as const,
      title: 'Documents & Verification',
      subtitle: docTotal > 0 ? `${docVerified} of ${docTotal} documents verified` : 'No documents uploaded',
      status: docTotal > 0 ? `${docVerified} Verified` : 'Not started',
      route: '/(parent)/profile/documents',
    },
  ];

  const householdItems = [
    { icon: 'home-outline' as const,        label: 'House Type',     value: formatParentHouseholdType(household?.household_type) },
    { icon: 'people-outline' as const,      label: 'Family Members', value: household?.household_size?.toString() ?? '—' },
    { icon: 'happy-outline' as const,       label: 'Children',       value: (profileData.children_count ?? 0).toString() },
    { icon: 'walk-outline' as const,        label: 'Elderly Members',value: (profileData.elderly_count ?? 0).toString() },
    { icon: 'paw-outline' as const,         label: 'Pets',           value: household?.has_pets ? (household?.pet_details || 'Yes') : 'None' },
  ];

  // ── Shared scrollable content ──────────────────────────────────────────────
  const content = (
    <ScrollView
      contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {/* ── Hero card — solid warm caramel-cream gradient, per reference ── */}
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.hero, isDesktop && s.heroDesktop]}
      >
        {/* Decorative layered circles — keeps the card from reading flat/plain */}
        <View pointerEvents="none" style={s.heroDecorA} />
        <View pointerEvents="none" style={s.heroDecorB} />

        <TouchableOpacity style={s.editProfileBtn} onPress={() => setEditOpen(true)} activeOpacity={0.85}>
          <Ionicons name="pencil" size={14} color={BROWN} />
        </TouchableOpacity>

        {/* Photo on the left, name + badge beside it */}
        <View style={s.heroTop}>
          <View style={s.photoWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" />
            ) : (
              <View style={s.photoFallback}>
                <Ionicons name="person" size={36} color={MUTED} />
              </View>
            )}
            <View style={s.badgeOverlay}>
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>

          <View style={s.heroInfo}>
            <Text style={s.heroName} numberOfLines={2}>{fullName}</Text>
            {isVerified && (
              <View style={s.pesoPill}>
                <Ionicons name="shield-checkmark" size={13} color={BROWN} />
                <Text style={s.pesoPillText}>PESO VERIFIED EMPLOYER</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Profile strength (circular ring, mirrors helper profile) ── */}
        <View style={s.strengthBlock}>
          <StrengthRing percent={strength} />
          <View style={s.strengthInfo}>
            <Text style={s.strengthLabel}>Profile Strength</Text>
            <View style={s.strengthMsgRow}>
              <Ionicons name="sparkles" size={13} color={BROWN} />
              <Text style={s.strengthMsg}>{strengthMsg}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── Quick Overview — warm caramel→rust→gold accents only, no rainbow ── */}
      <Text style={s.sectionLabel}>Quick Overview</Text>
      <View style={s.overviewRow}>
        <OverviewTile icon="briefcase" iconBg="#FBE6CF" iconColor={ORANGE}     value={stats.active_job_posts}    label="Job Posts" />
        <OverviewTile icon="people"    iconBg="#FBE6CF" iconColor={ORANGE}     value={stats.total_applicants}    label="Applications" />
        <OverviewTile icon="heart"     iconBg="#F6DCCB" iconColor={TERRACOTTA} value={stats.saved_helpers}       label="Saved Helpers" />
        <OverviewTile icon="star"      iconBg="#FBF0DB" iconColor={GOLD}       value="—"                          label="Employer Rating" sub="(0 reviews)" />
      </View>

      {/* ── Household Summary ── */}
      <Text style={s.sectionLabel}>Household Summary</Text>
      <View style={s.householdCard}>
        <View style={s.householdRow}>
          {householdItems.map((item) => (
            <View key={item.label} style={s.hhItem}>
              <View style={s.hhIcon}>
                <Ionicons name={item.icon} size={18} color={BROWN} />
              </View>
              <Text style={s.hhValue} numberOfLines={1}>{item.value}</Text>
              <Text style={s.hhLabel} numberOfLines={1}>{item.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={s.householdBtn}
          onPress={() => router.push('/(parent)/profile/household' as never)}
          activeOpacity={0.85}
        >
          <Text style={s.householdBtnText}>View Household Details</Text>
          <Ionicons name="arrow-forward" size={13} color={BROWN} />
        </TouchableOpacity>
      </View>

      {/* ── Profile Sections ── */}
      <Text style={s.sectionLabel}>Profile Sections</Text>
      <View style={s.sectionsWrap}>
        {sections.map((sec, idx) => {
          const isGood = sec.status === 'Complete' || sec.status.endsWith('Verified');
          return (
            <React.Fragment key={sec.key}>
              <TouchableOpacity
                style={s.sectionCard}
                onPress={() => router.push(sec.route as never)}
                activeOpacity={0.8}
              >
                <View style={[s.sectionIcon, { backgroundColor: ICON_BG }]}>
                  <Ionicons name={sec.icon} size={20} color={BROWN} />
                </View>
                <View style={s.sectionInfo}>
                  <Text style={s.sectionCardTitle}>{sec.title}</Text>
                  <Text style={s.sectionCardSub}>{sec.subtitle}</Text>
                </View>
                <View style={s.sectionRight}>
                  <View style={[s.statusBadge, { backgroundColor: isGood ? SUCCESS_BG : ICON_BG }]}>
                    <Text style={[s.statusText, { color: isGood ? GREEN : BROWN }]}>
                      {sec.status}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={MUTED} />
                </View>
              </TouchableOpacity>
              {idx < sections.length - 1 && <View style={s.sectionDivider} />}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={[s.page, { flexDirection: 'row' }]}>
        <Sidebar onLogout={initiateLogout} />
        {content}
        <EditParentProfileModal visible={editOpen} onClose={() => setEditOpen(false)} onSaveSuccess={() => { setEditOpen(false); refresh(); }} onProfileUpdated={refresh} />
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
    <View style={[s.page, { backgroundColor: BG }]}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Top bar */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => setMenuOpen(true)}>
            <Ionicons name="menu" size={26} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>My Profile</Text>
          <TouchableOpacity
            style={[s.barBtn, { position: 'relative' }]}
            onPress={() => router.push('/(parent)/notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={24} color={BROWN} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7,
                backgroundColor: CARAMEL, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {content}

        <ParentTabBar />
      </SafeAreaView>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} handleLogout={initiateLogout} />
      <EditParentProfileModal visible={editOpen} onClose={() => setEditOpen(false)} onSaveSuccess={() => { setEditOpen(false); refresh(); }} />
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

// ─── StrengthRing — circular profile-strength indicator (mirrors helper profile) ──

function StrengthRing({ percent }: { percent: number }) {
  const ringColor = percent >= 100 ? GOLD : percent >= 75 ? CARAMEL : MUTED;
  return (
    <View style={[s.ringOuter, { borderColor: ringColor }]}>
      <Text style={[s.ringPct, { color: ringColor }]}>{percent}%</Text>
    </View>
  );
}

// ─── OverviewTile ─────────────────────────────────────────────────────────────

function OverviewTile({ icon, iconBg, iconColor, value, label, sub }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string; iconColor: string;
  value: string | number; label: string; sub?: string;
}) {
  return (
    <View style={s.ovTile}>
      <View style={[s.ovIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <Text style={s.ovValue}>{value}</Text>
      <Text style={s.ovLabel}>{label}</Text>
      {sub ? <Text style={s.ovSub}>{sub}</Text> : null}
    </View>
  );
}
