// components/parent/browse/HelperProfileModal.tsx
// Tabbed helper profile modal — Overview / Experience / Skills / Documents

import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, Image, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, GOLD, DARK, MUTED, SUBTLE, DIVIDER, ICON_BG, SURFACE,
  GREEN, SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG, OVERLAY,
} from '@/components/parent/home/parentWarmTheme';
import type { HelperProfile } from '@/hooks/parent';
import type { JobPost } from '@/hooks/parent/useParentJobs';
import type { HelperJobMatch } from '@/lib/parentHelperMatch';

interface Props {
  visible: boolean;
  helper: HelperProfile | null;
  onInvite?: () => void;
  onSave?: () => void;
  onMessage?: () => void;
  onClose: () => void;
  referenceJob?: JobPost | null;
  match?: HelperJobMatch | null;
}

const TABS = [
  { key: 'overview',   label: 'Overview',   icon: 'home-outline' as const },
  { key: 'experience', label: 'Experience', icon: 'briefcase-outline' as const },
  { key: 'skills',     label: 'Skills',     icon: 'star-outline' as const },
  { key: 'documents',  label: 'Documents',  icon: 'document-text-outline' as const },
] as const;
type Tab = typeof TABS[number]['key'];

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
  android: { elevation: 8 },
  default: { boxShadow: '0 8px 32px rgba(139,90,43,0.14)' } as any,
});

function getInitials(name?: string) {
  if (!name) return 'H';
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : p[0][0].toUpperCase();
}

export function HelperProfileModal({ visible, helper, onInvite, onSave, onMessage, onClose, referenceJob, match }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (visible) setActiveTab('overview');
  }, [visible, helper?.profile_id]);

  // Log profile view when parent opens a helper card (fire-and-forget, rate-limited server-side)
  useEffect(() => {
    if (!visible || !helper?.user_id) return;
    AsyncStorage.getItem('user_data').then(raw => {
      if (!raw) return;
      const { user_id } = JSON.parse(raw);
      fetch(`${API_URL}/parent/log_profile_view.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: user_id, helper_id: helper.user_id }),
      }).catch(() => {});
    });
  }, [visible, helper?.user_id]);

  if (!helper) return null;

  const h = helper as any;

  const bio          = h.bio || h.helper_bio || '';
  const education    = h.education_level || h.helper_education_level || 'Not specified';
  const religion     = h.religion || h.helper_religion || 'Not specified';
  const civilStatus  = h.civil_status || h.helper_civil_status || 'Not specified';
  const barangay     = h.barangay || h.helper_barangay || '';
  const municipality = h.municipality || h.helper_municipality || 'N/A';
  const province     = h.province || h.helper_province || 'N/A';
  const fullAddress  = `${barangay ? barangay + ', ' : ''}${municipality}, ${province}`;
  const categories   = h.categories || h.helper_categories || [];
  const jobs         = h.jobs || h.helper_jobs || [];
  const skills       = h.skills || h.helper_skills || [];
  const ratingAvg    = h.rating_average || h.helper_rating_average;
  const ratingCount  = h.rating_count   || h.helper_rating_count;
  const expYears     = h.experience_years || h.helper_experience_years;
  const profileImage = h.profile_image
    ? (String(h.profile_image).startsWith('http') ? h.profile_image : `http://localhost/carelink_api/uploads/profiles/${h.profile_image}`)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.modal}>

          {/* Header bar */}
          <View style={st.header}>
            <Text style={st.headerTitle}>Helper Profile</Text>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={20} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <View style={st.hero}>
            <View style={st.avatarWrap}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={st.avatar} />
              ) : (
                <View style={[st.avatar, st.avatarFallback]}>
                  <Text style={st.avatarInitials}>{getInitials(h.full_name || h.helper_name)}</Text>
                </View>
              )}
              {h.verification_status === 'Verified' && (
                <View style={st.verifiedDot}>
                  <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                </View>
              )}
            </View>

            <View style={st.heroRight}>
              <Text style={st.heroName}>{h.full_name || h.helper_name}</Text>
              <View style={st.heroBadgesRow}>
                {h.verification_status === 'Verified' && (
                  <View style={[st.pill, st.pillGreen]}>
                    <Ionicons name="shield-checkmark" size={11} color={GREEN} />
                    <Text style={[st.pillText, { color: GREEN }]}>PESO Verified</Text>
                  </View>
                )}
                {h.availability_status === 'Available' && (
                  <View style={[st.pill, st.pillBlue]}>
                    <Ionicons name="briefcase" size={11} color="#1D4ED8" />
                    <Text style={[st.pillText, { color: '#1D4ED8' }]}>Available to Work</Text>
                  </View>
                )}
              </View>
              {match && match.score > 0 && (
                <View style={st.matchBadgeHero}>
                  <Text style={st.matchBadgeHeroText}>{match.score}%{'\n'}Match</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Quick stats tiles ──────────────────────────────────────────── */}
          <View style={st.tilesRow}>
            <View style={st.tile}>
              <Ionicons name="person-outline" size={18} color={MUTED} />
              <Text style={st.tileValue}>{h.age || h.helper_age || '--'} yrs</Text>
              <Text style={st.tileLabel}>Age</Text>
            </View>
            <View style={st.tileDivider} />
            <View style={st.tile}>
              <Ionicons name="male-female-outline" size={18} color={MUTED} />
              <Text style={st.tileValue}>{h.gender || h.helper_gender || 'Any'}</Text>
              <Text style={st.tileLabel}>Gender</Text>
            </View>
            <View style={st.tileDivider} />
            <View style={st.tile}>
              <Ionicons name="briefcase-outline" size={18} color={MUTED} />
              <Text style={st.tileValue}>{expYears ? `${expYears} yrs` : 'New'}</Text>
              <Text style={st.tileLabel}>Experience</Text>
            </View>
            <View style={st.tileDivider} />
            <View style={st.tile}>
              <Ionicons name="location-outline" size={18} color={MUTED} />
              <Text style={st.tileValue} numberOfLines={1}>
                {h.distance != null
                  ? (h.distance < 1 ? `${(h.distance * 1000).toFixed(0)}m` : `${h.distance.toFixed(1)} km`)
                  : municipality}
              </Text>
              <Text style={st.tileLabel}>Location</Text>
            </View>
          </View>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <View style={st.tabsRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[st.tabBtn, activeTab === tab.key && st.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}
              >
                <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? BROWN : MUTED} />
                <Text style={[st.tabText, activeTab === tab.key && st.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Tab content ────────────────────────────────────────────────── */}
          <ScrollView style={st.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={st.scrollContent}>

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {referenceJob && match && match.score > 0 && (
                  <View style={st.matchCard}>
                    <View style={st.matchCardHead}>
                      <View style={st.matchCardIcon}>
                        <Ionicons name="analytics-outline" size={18} color={BROWN} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.matchCardTitle}>Match for your open role</Text>
                        <Text style={st.matchCardJob} numberOfLines={1}>
                          {referenceJob.title || referenceJob.custom_job_title || 'Open job'}
                        </Text>
                      </View>
                      <Text style={st.matchScore}>{match.score}%</Text>
                    </View>
                    {match.reasons.map((line, i) => (
                      <View key={i} style={st.matchReason}>
                        <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                        <Text style={st.matchReasonText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {bio ? (
                  <View style={st.section}>
                    <View style={st.sectionHeader}>
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={CARAMEL} />
                      <Text style={st.sectionTitle}>About Me</Text>
                    </View>
                    <View style={st.bioBox}>
                      <Text style={st.bioText}>{bio}</Text>
                    </View>
                  </View>
                ) : null}

                <View style={st.section}>
                  <View style={st.sectionHeader}>
                    <Ionicons name="information-circle-outline" size={16} color={CARAMEL} />
                    <Text style={st.sectionTitle}>Background</Text>
                  </View>
                  <View style={st.detailsCard}>
                    <DetailRow label="Education" value={education} />
                    <DetailRow label="Religion" value={religion} />
                    <DetailRow label="Civil Status" value={civilStatus} />
                    <DetailRow label="Location" value={fullAddress} last />
                  </View>
                </View>
              </>
            )}

            {/* EXPERIENCE */}
            {activeTab === 'experience' && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Ionicons name="briefcase-outline" size={16} color={CARAMEL} />
                  <Text style={st.sectionTitle}>Work Preferences</Text>
                </View>
                <View style={st.detailsCard}>
                  <DetailRow label="Years of Experience" value={expYears ? `${expYears} years` : 'New helper'} />
                  <DetailRow label="Preferred Job Type" value={h.employment_type || h.helper_employment_type || 'Any'} />
                  <DetailRow label="Work Schedule" value={h.work_schedule || h.helper_work_schedule || 'Any'} />
                  <DetailRow
                    label="Expected Salary"
                    value={(h.expected_salary || h.helper_expected_salary)
                      ? `₱${Number(h.expected_salary || h.helper_expected_salary).toLocaleString()} / ${(h.salary_period || h.helper_salary_period || 'month').toLowerCase()}`
                      : 'Not specified'}
                    last={jobs.length === 0}
                  />
                </View>

                {jobs.length > 0 && (
                  <View style={{ marginTop: 20 }}>
                    <Text style={st.chipGroupLabel}>Roles Worked Before</Text>
                    <View style={st.chipsWrap}>
                      {jobs.map((j: string, i: number) => (
                        <View key={i} style={[st.chip, st.chipGreen]}>
                          <Text style={[st.chipText, { color: GREEN }]}>{j}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* SKILLS */}
            {activeTab === 'skills' && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Ionicons name="star-outline" size={16} color={CARAMEL} />
                  <Text style={st.sectionTitle}>Top Skills</Text>
                </View>

                {categories.length === 0 && jobs.length === 0 && skills.length === 0 ? (
                  <Text style={st.emptyTab}>No skills or roles listed yet.</Text>
                ) : (
                  <>
                    {categories.length > 0 && (
                      <>
                        <Text style={st.chipGroupLabel}>Categories</Text>
                        <View style={st.chipsWrap}>
                          {categories.map((c: string, i: number) => (
                            <View key={i} style={[st.chip, st.chipBlue]}>
                              <Text style={[st.chipText, { color: '#1D4ED8' }]}>{c}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                    {jobs.length > 0 && (
                      <>
                        <Text style={[st.chipGroupLabel, { marginTop: 16 }]}>Specific Roles</Text>
                        <View style={st.chipsWrap}>
                          {jobs.map((j: string, i: number) => (
                            <View key={i} style={[st.chip, st.chipGreen]}>
                              <Text style={[st.chipText, { color: GREEN }]}>{j}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                    {skills.length > 0 && (
                      <>
                        <Text style={[st.chipGroupLabel, { marginTop: 16 }]}>Skills & Abilities</Text>
                        <View style={st.chipsWrap}>
                          {skills.map((sk: string, i: number) => (
                            <View key={i} style={st.chip}>
                              <Text style={st.chipText}>{sk}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            )}

            {/* DOCUMENTS */}
            {activeTab === 'documents' && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Ionicons name="document-text-outline" size={16} color={CARAMEL} />
                  <Text style={st.sectionTitle}>Verification Documents</Text>
                </View>
                <View style={st.docsLocked}>
                  <Ionicons name="lock-closed-outline" size={30} color={MUTED} />
                  <Text style={st.docsLockedTitle}>Documents are private</Text>
                  <Text style={st.docsLockedText}>
                    {h.full_name || h.helper_name}'s documents are only shared once they apply to one of your jobs and choose to share them with you.
                  </Text>
                </View>
              </View>
            )}

          </ScrollView>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <View style={st.footer}>
            <TouchableOpacity
              style={st.msgBtn}
              onPress={() => { onMessage ? onMessage() : onClose(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-outline" size={18} color={BROWN} />
              <Text style={st.msgBtnText}>Message</Text>
            </TouchableOpacity>
            {onSave && (
              <TouchableOpacity style={st.shortlistBtn} onPress={onSave} activeOpacity={0.8}>
                <Ionicons name="star-outline" size={18} color={BROWN} />
                <Text style={st.shortlistBtnText}>Shortlist</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.inviteBtn} onPress={onInvite ?? onClose} activeOpacity={0.8}>
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={st.inviteBtnText}>{onInvite ? 'Invite to Apply' : 'Close'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// Small helper row component
function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[dr.row, !last && dr.rowBorder]}>
      <Text style={dr.label}>{label}</Text>
      <Text style={dr.value} numberOfLines={2}>{value}</Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
  label: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED },
  value: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, flex: 1, textAlign: 'right', marginLeft: 16 },
});

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    // On native, the `flex: 1` ScrollView below can collapse to 0px height inside a
    // container that only has `maxHeight` (no `height`) — give it a definite height.
    height: Platform.OS === 'web' ? undefined : '92%',
    overflow: 'hidden',
    ...CARD_SHADOW,
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#F1DDBE',
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
  },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: '#FFF4E6',
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: DIVIDER },
  avatarFallback: { backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: BROWN },
  verifiedDot: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: SURFACE, borderRadius: 12, padding: 1,
  },
  heroRight: { flex: 1, gap: 8 },
  heroName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK },
  heroBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1,
  },
  pillGreen: { backgroundColor: SUCCESS_BG, borderColor: '#A7F3D0' },
  pillBlue:  { backgroundColor: '#EFF6FF',  borderColor: '#DBEAFE' },
  pillText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  matchBadgeHero: {
    backgroundColor: SUCCESS_BG, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  matchBadgeHeroText: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: GREEN, textAlign: 'center',
  },

  // Tiles
  tilesRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: SURFACE,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  tile: { flex: 1, alignItems: 'center', gap: 4 },
  tileDivider: { width: 1, height: 32, backgroundColor: DIVIDER },
  tileValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  tileLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 12,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: CARAMEL },
  tabText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  tabTextActive: { fontFamily: FontFamily.fredokaSemiBold, color: BROWN },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },

  detailsCard: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: DIVIDER, overflow: 'hidden',
  },

  bioBox: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: DIVIDER,
    padding: 14,
  },
  bioText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14.5, color: DARK, lineHeight: 22 },

  // Match card
  matchCard: {
    marginHorizontal: 16, marginTop: 20,
    backgroundColor: '#FFF9EF',
    borderRadius: 14, borderWidth: 1, borderColor: '#F5D797',
    padding: 14,
  },
  matchCardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  matchCardIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
  },
  matchCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },
  matchCardJob:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 12.5, color: MUTED, marginTop: 1 },
  matchScore:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: CARAMEL },
  matchReason: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  matchReasonText: { fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 13, color: DARK, lineHeight: 18 },

  // Chips
  chipGroupLabel: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: ICON_BG, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: DIVIDER,
  },
  chipGreen: { backgroundColor: SUCCESS_BG, borderColor: '#A7F3D0' },
  chipBlue:  { backgroundColor: '#EFF6FF',  borderColor: '#DBEAFE' },
  chipText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },

  emptyTab: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, textAlign: 'center', paddingVertical: 24 },

  // Documents locked
  docsLocked: {
    alignItems: 'center', gap: 10,
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: DIVIDER,
    paddingVertical: 32, paddingHorizontal: 20,
  },
  docsLockedTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  docsLockedText:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16,
    backgroundColor: SURFACE,
    borderTopWidth: 1, borderTopColor: DIVIDER,
  },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: DIVIDER,
    backgroundColor: SURFACE,
  },
  msgBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: BROWN },
  shortlistBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 16,
    borderRadius: 12, borderWidth: 1.5, borderColor: CARAMEL,
    backgroundColor: SURFACE,
  },
  shortlistBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: BROWN },
  inviteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: BROWN,
  },
  inviteBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
});
