// components/helper/jobs/JobDetailsModal.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Modal, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { applicationStatusLabel } from '@/lib/applicationStatusLabel';
import { applyByLabel } from '@/lib/jobExpiry';
import { useT } from '@/contexts/LocaleContext';
import { ParentProfileModal } from './ParentProfileModal';


// ── Palette ───────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const GREEN   = '#059669';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';

const MATCH_THRESHOLD = 70;
type JobDetailsTab = 'overview' | 'details' | 'responsibilities';

// ── Props ─────────────────────────────────────────────────────────────────────
interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onToggleSave?: () => void;
  onReport?: () => void;
  job: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isTrue = (val: any) => val === 1 || val === '1' || val === true;

function fmtPeriod(p: string, tr: (key: string) => string) {
  const l = (p ?? '').toLowerCase();
  if (l.startsWith('month')) return tr('helper.jobDetails.month');
  if (l.startsWith('day'))   return tr('helper.jobDetails.day');
  if (l.startsWith('week'))  return tr('helper.jobDetails.week');
  return p;
}

// ── Detail grid item ──────────────────────────────────────────────────────────
function DetailItem({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={s.detailItem}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon} size={15} color={DARK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Perk pill ─────────────────────────────────────────────────────────────────
function BenefitCard({ icon, label, required = false }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; required?: boolean }) {
  return (
    <View style={[s.benefitCard, required ? s.requiredBenefitCard : s.extraBenefitCard]}>
      <View style={[s.benefitIconWrap, required ? s.requiredBenefitIconWrap : s.extraBenefitIconWrap]}>
        <Ionicons name={icon} size={15} color={required ? '#047857' : ORANGE} />
      </View>
      <Text style={[s.benefitText, required ? s.requiredBenefitText : s.extraBenefitText]}>{label}</Text>
      <Ionicons name="checkmark-circle" size={16} color={required ? '#059669' : ORANGE} />
    </View>
  );
}

function IntroCard({ icon, label, value, variant = 'category' }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  variant?: 'category' | 'title';
}) {
  return (
    <View style={[s.introCard, variant === 'category' ? s.categoryCard : s.titleCard]}>
      <View style={[s.introIcon, variant === 'category' ? s.categoryIcon : s.titleIcon]}>
        <Ionicons name={icon} size={18} color={variant === 'category' ? '#fff' : ORANGE} />
      </View>
      <View style={s.introCopy}>
        <Text style={[s.introLabel, variant === 'category' ? s.categoryLabel : s.titleLabel]}>{label}</Text>
        <Text style={[s.introValue, variant === 'category' ? s.categoryValue : s.titleValue]}>{value}</Text>
      </View>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function JobDetailsModal({ visible, onClose, onApply, onToggleSave, onReport, job }: JobDetailsModalProps) {
  const { t: tr } = useT();
  const [activeTab, setActiveTab] = useState<JobDetailsTab>('overview');
  const [employerProfileVisible, setEmployerProfileVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab('overview');
      setEmployerProfileVisible(false);
    } else {
      setEmployerProfileVisible(false);
    }
  }, [visible, job?.job_post_id]);

  if (!job) return null;

  const isSaved = !!job.is_saved;

  const matchPct = Math.min(100, Math.max(0, Math.round(Number(job.match_score ?? 0))));

  const matchReasonsList: string[] = Array.isArray(job.match_reasons)
    ? job.match_reasons.filter((r: unknown) => r != null && String(r).trim() !== '')
    : [];

  const showMatchReasons = matchPct >= MATCH_THRESHOLD && matchReasonsList.length > 0;

  const salary = Number(job.salary_offered);
  const salaryText = Number.isFinite(salary) && salary > 0 ? `₱${salary.toLocaleString()}` : '—';

  const requiredBenefits: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; show: boolean }[] = [
    { icon: 'shield-checkmark', label: tr('helper.jobDetails.sss'), show: isTrue(job.provides_sss) },
    { icon: 'shield-checkmark', label: tr('helper.jobDetails.philHealth'), show: isTrue(job.provides_philhealth) },
    { icon: 'shield-checkmark', label: tr('helper.jobDetails.pagIbig'), show: isTrue(job.provides_pagibig) },
  ];
  const activeRequiredBenefits = requiredBenefits.filter(p => p.show);
  const extraBenefits: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; show: boolean }[] = [
    { icon: 'restaurant', label: tr('helper.jobDetails.freeMeals'), show: isTrue(job.provides_meals) },
    { icon: 'home', label: tr('helper.jobDetails.accommodation'), show: isTrue(job.provides_accommodation) },
  ];
  const activeExtraBenefits = extraBenefits.filter(p => p.show);

  const location = [job.municipality || job.parent_municipality, job.province || job.parent_province]
    .filter(Boolean).join(', ');

  const displaySkills: string[] = Array.isArray(job.skills) && job.skills.length > 0
    ? job.skills
    : (typeof job.skill_names === 'string' && job.skill_names.trim()
      ? job.skill_names.split(',').map((t: string) => t.trim()).filter(Boolean)
      : []);
  const category = job.category_name || (Array.isArray(job.categories) ? job.categories.filter(Boolean).join(', ') : '') || tr('helper.jobDetails.generalCategory');
  const jobNames: string[] = Array.isArray(job.job_names)
    ? job.job_names.filter((name: unknown) => typeof name === 'string' && name.trim())
    : [];
  const minAge = Number(job.min_age);
  const maxAge = Number(job.max_age);
  const hasMinAge = Number.isFinite(minAge) && minAge > 0;
  const hasMaxAge = Number.isFinite(maxAge) && maxAge > 0;
  const minExperience = Number(job.min_experience_years);
  const hasExperienceRequirement = Number.isFinite(minExperience) && minExperience > 0;
  const hasRequirements = hasMinAge || hasMaxAge || hasExperienceRequirement
    || isTrue(job.require_police_clearance) || isTrue(job.prefer_tesda_nc2);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.card}>

            {/* ── Top header bar ── */}
            <View style={s.headerBar}>
              <TouchableOpacity style={s.headerIconBtn} onPress={onClose} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color={DARK} />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.headerIconBtn} onPress={onToggleSave} hitSlop={8} disabled={!onToggleSave}>
                <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={22} color={isSaved ? '#EF4444' : DARK} />
              </TouchableOpacity>
              {onReport ? (
                <TouchableOpacity style={s.headerIconBtn} onPress={onReport} hitSlop={8} accessibilityLabel="Report this employer">
                  <Ionicons name="flag-outline" size={20} color={DARK} />
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={s.tabsRow}>
              {([
                { key: 'overview', label: tr('helper.jobDetails.overviewTab'), icon: 'briefcase-outline' },
                { key: 'details', label: tr('helper.jobDetails.detailsTab'), icon: 'list-outline' },
                { key: 'responsibilities', label: tr('helper.jobDetails.responsibilitiesTab'), icon: 'reader-outline' },
              ] as const).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tabButton, activeTab === tab.key && s.tabButtonActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.icon} size={15} color={activeTab === tab.key ? ORANGE : MUTED} />
                  <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]} numberOfLines={1}>{tab.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView key={activeTab} style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
              {activeTab === 'overview' && (
                <>
                  {matchPct > 0 && (
                    <View style={s.matchBadge}>
                      <Ionicons name="flash" size={13} color={GREEN} />
                      <Text style={s.matchBadgeText}>{matchPct}% Match</Text>
                    </View>
                  )}
                  <IntroCard icon="grid-outline" label={tr('helper.jobDetails.category')} value={category} />
                  <IntroCard icon="briefcase-outline" label={tr('helper.jobDetails.jobTitle')} value={job.title || tr('helper.jobDetails.untitledJob')} variant="title" />

                  {job.parent_id ? (
                    <TouchableOpacity
                      style={s.employerInfo}
                      onPress={() => setEmployerProfileVisible(true)}
                      activeOpacity={0.78}
                    >
                      <View style={s.employerAvatar}>
                        <Ionicons name="person" size={20} color={ORANGE} />
                      </View>
                      <View style={s.employerCopy}>
                        <Text style={s.employerLabel}>{tr('helper.jobDetails.employer')}</Text>
                        <Text style={s.employerName} numberOfLines={1}>{job.parent_name || tr('helper.jobDetails.verifiedEmployer')}</Text>
                        <View style={s.pesoBadge}>
                          <Ionicons name="shield-checkmark" size={11} color={GREEN} />
                          <Text style={s.pesoBadgeText}>{tr('helper.jobDetails.pesoVerifiedEmployer')}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={MUTED} />
                    </TouchableOpacity>
                  ) : (
                    <View style={s.employerInfo}>
                      <View style={s.employerAvatar}>
                        <Ionicons name="person" size={20} color={ORANGE} />
                      </View>
                      <View style={s.employerCopy}>
                        <Text style={s.employerLabel}>{tr('helper.jobDetails.employer')}</Text>
                        <Text style={s.employerName} numberOfLines={1}>{job.parent_name || tr('helper.jobDetails.verifiedEmployer')}</Text>
                        <View style={s.pesoBadge}>
                          <Ionicons name="shield-checkmark" size={11} color={GREEN} />
                          <Text style={s.pesoBadgeText}>{tr('helper.jobDetails.pesoVerifiedEmployer')}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={s.salaryCard}>
                    <Text style={s.salaryCardLabel}>{tr('helper.jobDetails.offeredSalary')}</Text>
                    <Text style={s.salaryCardAmount}>{salaryText}</Text>
                    {job.salary_period ? <Text style={s.salaryCardPer}>{tr('helper.jobDetails.perPeriod', { period: fmtPeriod(job.salary_period, tr) })}</Text> : null}
                  </View>
                </>
              )}

              {activeTab === 'details' && (
                <>
                  {jobNames.length > 0 && (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>{tr('helper.jobDetails.jobRoles')}</Text>
                      <View style={s.skillsRow}>
                        {jobNames.map((role, idx) => (
                          <View key={`${role}-${idx}`} style={s.roleCard}>
                            <Ionicons name="checkmark-circle" size={15} color={ORANGE} />
                            <Text style={s.roleText}>{role}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {displaySkills.length > 0 && (
                    <View style={s.section}>
                      <View style={s.knowHowHeader}>
                        <Ionicons name="sparkles" size={17} color={ORANGE} />
                        <Text style={s.sectionTitle}>{tr('helper.jobDetails.knowHow')}</Text>
                      </View>
                      <View style={s.skillsRow}>
                        {displaySkills.map((skill, idx) => (
                          <View key={`${skill}-${idx}`} style={s.skillCard}>
                            <Ionicons name="checkmark" size={14} color="#047857" />
                            <Text style={s.skillText}>{skill}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={s.benefitsPanel}>
                    <View style={s.benefitPanelHeader}>
                      <View style={s.benefitPanelIcon}>
                        <Ionicons name="shield-checkmark" size={17} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.benefitPanelTitle}>{tr('helper.jobDetails.benefitsTitle')}</Text>
                        <Text style={s.benefitPanelSubtitle}>{tr('helper.jobDetails.requiredBenefits')}</Text>
                      </View>
                    </View>
                    {activeRequiredBenefits.length > 0 ? (
                      <View style={s.benefitsList}>
                        {activeRequiredBenefits.map((benefit) => (
                          <BenefitCard key={benefit.label} icon={benefit.icon} label={benefit.label} required />
                        ))}
                      </View>
                    ) : (
                      <Text style={s.noBenefitsText}>{tr('helper.jobDetails.noRequiredBenefitsListed')}</Text>
                    )}
                    {activeExtraBenefits.length > 0 && (
                      <View style={s.extraBenefitsBlock}>
                        <Text style={s.extraBenefitsTitle}>{tr('helper.jobDetails.additionalBenefits')}</Text>
                        <View style={s.benefitsList}>
                          {activeExtraBenefits.map((benefit) => (
                            <BenefitCard key={benefit.label} icon={benefit.icon} label={benefit.label} />
                          ))}
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={s.section}>
                    <Text style={s.sectionTitle}>{tr('helper.jobDetails.jobDetails')}</Text>
                    <View style={s.detailGrid}>
                      {location ? <DetailItem icon="location-outline" label={tr('helper.jobDetails.location')} value={`${location}${job.distance ? `  ·  ~${job.distance} km` : ''}`} /> : null}
                      {job.employment_type ? <DetailItem icon="briefcase-outline" label={tr('helper.jobDetails.employmentType')} value={job.employment_type} /> : null}
                      {job.work_schedule ? <DetailItem icon="time-outline" label={tr('helper.jobDetails.schedule')} value={job.work_schedule} /> : null}
                      {job.start_date ? <DetailItem icon="calendar-outline" label={tr('helper.jobDetails.startDate')} value={job.start_date} /> : null}
                      {job.work_hours ? <DetailItem icon="alarm-outline" label={tr('helper.jobDetails.workingHours')} value={job.work_hours} /> : null}
                      {applyByLabel(job.expires_at) ? <DetailItem icon="hourglass-outline" label={tr('helper.jobDetails.deadline')} value={applyByLabel(job.expires_at)!} /> : null}
                    </View>
                  </View>

                  {hasRequirements && (
                    <View style={s.section}>
                      <Text style={s.sectionTitle}>{tr('helper.jobDetails.requirements')}</Text>
                      <View style={s.detailGrid}>
                        {(hasMinAge || hasMaxAge) && <DetailItem icon="person-outline" label={tr('helper.jobDetails.age')} value={hasMinAge && hasMaxAge ? `${minAge}–${maxAge} ${tr('helper.jobDetails.years')}` : hasMinAge ? `${minAge}+ ${tr('helper.jobDetails.years')}` : `≤ ${maxAge} ${tr('helper.jobDetails.years')}`} />}
                        {hasExperienceRequirement && <DetailItem icon="star-outline" label={tr('helper.jobDetails.experience')} value={tr('helper.jobDetails.atLeastYears', { count: minExperience })} />}
                      </View>
                      {isTrue(job.require_police_clearance) && (
                        <View style={s.reqBadge}>
                          <Ionicons name="shield-checkmark" size={14} color={GREEN} />
                          <Text style={s.reqBadgeText}>{tr('helper.jobDetails.policeClearanceRequired')}</Text>
                        </View>
                      )}
                      {isTrue(job.prefer_tesda_nc2) && (
                        <View style={[s.reqBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                          <Ionicons name="school" size={14} color="#2563EB" />
                          <Text style={[s.reqBadgeText, { color: '#2563EB' }]}>{tr('helper.jobDetails.tesdaPreferred')}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {showMatchReasons && (
                    <View style={s.matchBox}>
                      <View style={s.matchBoxHeader}>
                        <Ionicons name="sparkles" size={15} color={GREEN} />
                        <Text style={s.matchBoxTitle}>{tr('helper.jobDetails.whyMatch')}</Text>
                      </View>
                      {matchReasonsList.slice(0, 5).map((reason, idx) => (
                        <View key={idx} style={s.matchReason}>
                          <Ionicons name="checkmark-circle" size={15} color={GREEN} style={{ marginTop: 1 }} />
                          <Text style={s.matchReasonText}>{String(reason)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              {activeTab === 'responsibilities' && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>{tr('helper.jobDetails.responsibilities')}</Text>
                  {job.description
                    ? <Text style={s.bodyText}>{job.description}</Text>
                    : <Text style={s.emptyDescription}>{tr('helper.jobDetails.noResponsibilities')}</Text>}
                </View>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* ── Apply footer ── */}
            <SafeAreaView style={s.footer}>
              {job.can_apply === false ? (
                <View style={s.appliedPill}>
                  <Ionicons
                    name={job.application_status === 'Rejected' || job.application_status === 'auto_rejected' ? 'close-circle-outline' : 'checkmark-circle'}
                    size={18}
                    color={MUTED}
                  />
                  <Text style={s.appliedPillText}>{applicationStatusLabel(job.application_status ?? '')}</Text>
                </View>
              ) : (
                <TouchableOpacity style={s.applyBtn} onPress={onApply} activeOpacity={0.85}>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={s.applyBtnText}>{tr('helper.jobDetails.applyNow')}</Text>
                </TouchableOpacity>
              )}
            </SafeAreaView>
          </View>
        </View>
      </Modal>
      <ParentProfileModal
        visible={employerProfileVisible}
        onClose={() => setEmployerProfileVisible(false)}
        parentData={{ parent_id: job.parent_id, parent_name: job.parent_name }}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card:    {
    backgroundColor: '#FBF5EC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '95%',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },

  // header bar
  headerBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, backgroundColor: '#FBF5EC', gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER },
  headerIconBtn:{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: DIVIDER },

  // scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 12 },
  tabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: DIVIDER, paddingHorizontal: 5 },
  tabButton: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: ORANGE },
  tabLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  tabLabelActive: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE },

  // match badge
  matchBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: GREEN + '44', marginBottom: 14 },
  matchBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: GREEN },

  // Reusable category/title callouts
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  categoryCard: { backgroundColor: '#D94F0B', borderColor: '#B83E08' },
  titleCard: { backgroundColor: '#FFF1E8', borderColor: '#F8C5A8' },
  introIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { backgroundColor: 'rgba(255,255,255,0.18)' },
  titleIcon: { backgroundColor: '#FFE0CF' },
  introCopy: { flex: 1 },
  introLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 3 },
  categoryLabel: { color: 'rgba(255,255,255,0.78)' },
  titleLabel: { color: ORANGE },
  introValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, lineHeight: 22 },
  categoryValue: { color: '#fff' },
  titleValue: { color: DARK },

  // employer
  employerInfo:  { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 4, marginBottom: 16, backgroundColor: '#fff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: DIVIDER },
  employerAvatar: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center' },
  employerCopy: { flex: 1, minWidth: 0 },
  employerLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 2 },
  employerName:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  pesoBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: GREEN + '44', marginTop: 4 },
  pesoBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: GREEN },

  // salary card (dark brown — user's specific request)
  salaryCard:       { backgroundColor: DARK, borderRadius: 18, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', marginBottom: 14 },
  salaryCardLabel:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  salaryCardAmount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, color: '#fff', letterSpacing: -0.5 },
  salaryCardPer:    { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  // prominent required benefits and additional perks
  benefitsPanel: { backgroundColor: '#DCFCE7', borderRadius: 18, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#86EFAC' },
  benefitPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  benefitPanelIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  benefitPanelTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#064E3B' },
  benefitPanelSubtitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#047857', marginTop: 1 },
  benefitsList: { gap: 8 },
  benefitCard: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 10, borderWidth: 1 },
  requiredBenefitCard: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  extraBenefitCard: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  benefitIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  requiredBenefitIconWrap: { backgroundColor: '#DCFCE7' },
  extraBenefitIconWrap: { backgroundColor: '#FFEDD5' },
  benefitText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },
  requiredBenefitText: { color: '#065F46' },
  extraBenefitText: { color: '#9A3412' },
  noBenefitsText: { fontFamily: FontFamily.fredokaRegular, color: '#065F46', fontSize: 12, lineHeight: 18, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 11 },
  extraBenefitsBlock: { borderTopWidth: 1, borderTopColor: '#86EFAC', marginTop: 12, paddingTop: 12, gap: 8 },
  extraBenefitsTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#9A3412', textTransform: 'uppercase', letterSpacing: 0.5 },

  // match reasoning box
  matchBox:       { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: GREEN + '33' },
  matchBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  matchBoxTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  matchReason:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  matchReasonText:{ fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 13, color: MUTED, lineHeight: 19 },

  // sections
  section:      { marginBottom: 20 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },

  // detail grid
  detailGrid:     { gap: 10 },
  detailItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER },
  detailIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  detailLabel:    { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 2 },
  detailValue:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },

  // requirements
  reqBadge:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: GREEN + '44', marginTop: 8 },
  reqBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: GREEN },

  // Roles and skills
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  knowHowHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF1E8', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: '#F8C5A8' },
  roleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#9A3412' },
  skillCard: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: '#A7F3D0' },
  skillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#065F46' },

  // body
  bodyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 22, color: MUTED },
  emptyDescription: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, color: MUTED, fontStyle: 'italic' },

  // footer
  footer:       { padding: 16, borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#fff' },
  applyBtn:     { backgroundColor: DARK, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  applyBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 16 },
  appliedPill:     { backgroundColor: ICON_BG, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  appliedPillText: { fontFamily: FontFamily.fredokaSemiBold, color: MUTED, fontSize: 15 },
});
