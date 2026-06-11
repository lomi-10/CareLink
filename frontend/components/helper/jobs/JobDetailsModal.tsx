// components/helper/jobs/JobDetailsModal.tsx

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';


// ── Palette ───────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const GREEN   = '#059669';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';

const MATCH_THRESHOLD = 70;

// ── Props ─────────────────────────────────────────────────────────────────────
interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onToggleSave?: () => void;
  job: any;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const isTrue = (val: any) => val === 1 || val === '1' || val === true;

function fmtPeriod(p: string) {
  const l = (p ?? '').toLowerCase();
  if (l.startsWith('month')) return 'Month';
  if (l.startsWith('day'))   return 'Day';
  if (l.startsWith('week'))  return 'Week';
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
function PerkPill({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={s.perkPill}>
      <Ionicons name={icon} size={12} color={MUTED} />
      <Text style={s.perkText}>{label}</Text>
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function JobDetailsModal({ visible, onClose, onApply, onToggleSave, job }: JobDetailsModalProps) {
  if (!job) return null;

  const isSaved = !!job.is_saved;

  const matchPct = Math.min(100, Math.max(0, Math.round(Number(job.match_score ?? 0))));

  const matchReasonsList: string[] = Array.isArray(job.match_reasons)
    ? job.match_reasons.filter((r: unknown) => r != null && String(r).trim() !== '')
    : [];

  const showMatchReasons = matchPct >= MATCH_THRESHOLD && matchReasonsList.length > 0;

  const salary     = Number(job.salary_offered);
  const salaryText = salary > 0 ? `₱${salary.toLocaleString()}` : '—';

  const perks: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; show: boolean }[] = [
    { icon: 'restaurant',       label: 'Free Meals',    show: isTrue(job.provides_meals) },
    { icon: 'home',             label: 'Accommodation', show: isTrue(job.provides_accommodation) },
    { icon: 'checkmark-circle', label: 'SSS',           show: isTrue(job.provides_sss) },
    { icon: 'checkmark-circle', label: 'PhilHealth',    show: isTrue(job.provides_philhealth) },
    { icon: 'checkmark-circle', label: 'Pag-IBIG',      show: isTrue(job.provides_pagibig) },
  ];
  const activePerks = perks.filter(p => p.show);

  const location = [job.municipality || job.parent_municipality, job.province || job.parent_province]
    .filter(Boolean).join(', ');

  const displaySkills: string[] = Array.isArray(job.skills) && job.skills.length > 0
    ? job.skills
    : (typeof job.skill_names === 'string' && job.skill_names.trim()
      ? job.skill_names.split(',').map((t: string) => t.trim()).filter(Boolean)
      : []);

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
              <TouchableOpacity style={s.headerIconBtn} hitSlop={8}>
                <Ionicons name="share-social-outline" size={22} color={DARK} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

              {/* ── Match badge ── */}
              {matchPct > 0 && (
                <View style={s.matchBadge}>
                  <Ionicons name="flash" size={13} color={GREEN} />
                  <Text style={s.matchBadgeText}>{matchPct}% Match</Text>
                </View>
              )}

              {/* ── Job title ── */}
              <Text style={s.jobTitle}>{job.title}</Text>

              {/* ── Employer info (static) ── */}
              <View style={s.employerInfo}>
                <Text style={s.employerName}>{job.parent_name || 'Verified Employer'}</Text>
                <View style={s.pesoBadge}>
                  <Ionicons name="shield-checkmark" size={11} color={GREEN} />
                  <Text style={s.pesoBadgeText}>PESO Verified Employer</Text>
                </View>
              </View>

              {/* ── Salary card (dark brown) ── */}
              <View style={s.salaryCard}>
                <Text style={s.salaryCardLabel}>OFFERED SALARY</Text>
                <Text style={s.salaryCardAmount}>{salaryText}</Text>
                <Text style={s.salaryCardPer}>per {fmtPeriod(job.salary_period)}</Text>
              </View>

              {/* ── Employment type ── */}
              {job.employment_type && (
                <View style={s.employmentRow}>
                  <View style={s.employmentPill}>
                    <Ionicons name="briefcase-outline" size={13} color={MUTED} />
                    <Text style={s.employmentText}>{job.employment_type}</Text>
                  </View>
                  {job.work_schedule && (
                    <View style={s.employmentPill}>
                      <Ionicons name="time-outline" size={13} color={MUTED} />
                      <Text style={s.employmentText}>{job.work_schedule}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── Perks strip ── */}
              {activePerks.length > 0 && (
                <View style={s.perksRow}>
                  {activePerks.map((p, i) => (
                    <PerkPill key={i} icon={p.icon} label={p.label} />
                  ))}
                </View>
              )}

              {/* ── Why this job matches you (≥70% only) ── */}
              {showMatchReasons && (
                <View style={s.matchBox}>
                  <View style={s.matchBoxHeader}>
                    <Ionicons name="sparkles" size={15} color={GREEN} />
                    <Text style={s.matchBoxTitle}>Why this job matches you</Text>
                  </View>
                  {matchReasonsList.slice(0, 5).map((reason, idx) => (
                    <View key={idx} style={s.matchReason}>
                      <Ionicons name="checkmark-circle" size={15} color={GREEN} style={{ marginTop: 1 }} />
                      <Text style={s.matchReasonText}>{String(reason)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Job Details ── */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Job Details</Text>
                <View style={s.detailGrid}>
                  {location ? <DetailItem icon="location-outline" label="Location" value={`${location}${job.distance ? `  ·  ~${job.distance} km` : ''}`} /> : null}
                  {job.work_schedule ? <DetailItem icon="time-outline"     label="Schedule"       value={job.work_schedule} /> : null}
                  {job.start_date    ? <DetailItem icon="calendar-outline" label="Start Date"     value={job.start_date} /> : null}
                  {job.employment_type ? <DetailItem icon="briefcase-outline" label="Employment" value={job.employment_type} /> : null}
                  {job.work_hours    ? <DetailItem icon="alarm-outline"    label="Working Hours"  value={job.work_hours} /> : null}
                </View>
              </View>

              {/* ── Requirements ── */}
              {(job.min_age || job.min_experience_years || isTrue(job.require_police_clearance) || isTrue(job.prefer_tesda_nc2)) && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Requirements</Text>
                  <View style={s.detailGrid}>
                    {job.min_age && <DetailItem icon="person-outline" label="Age" value={job.max_age ? `${job.min_age}–${job.max_age} yrs` : `${job.min_age}+ yrs`} />}
                    {job.min_experience_years && <DetailItem icon="star-outline" label="Experience" value={`At least ${job.min_experience_years} yr(s)`} />}
                  </View>
                  {isTrue(job.require_police_clearance) && (
                    <View style={s.reqBadge}>
                      <Ionicons name="shield-checkmark" size={14} color={GREEN} />
                      <Text style={s.reqBadgeText}>Police Clearance Required</Text>
                    </View>
                  )}
                  {isTrue(job.prefer_tesda_nc2) && (
                    <View style={[s.reqBadge, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                      <Ionicons name="school" size={14} color="#2563EB" />
                      <Text style={[s.reqBadgeText, { color: '#2563EB' }]}>TESDA NC II Preferred</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── Skills ── */}
              {displaySkills.length > 0 && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Required Skills</Text>
                  <View style={s.skillsRow}>
                    {displaySkills.map((skill, i) => (
                      <View key={i} style={s.skillPill}>
                        <Text style={s.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── Responsibilities / Description ── */}
              {job.description ? (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Responsibilities</Text>
                  <Text style={s.bodyText}>{job.description}</Text>
                </View>
              ) : null}

              <View style={{ height: 16 }} />
            </ScrollView>

            {/* ── Apply footer ── */}
            <SafeAreaView style={s.footer}>
              <TouchableOpacity style={s.applyBtn} onPress={onApply} activeOpacity={0.85}>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <Text style={s.applyBtnText}>Apply Now</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
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

  // match badge
  matchBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: GREEN + '44', marginBottom: 14 },
  matchBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: GREEN },

  // title & employer
  jobTitle:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: DARK, lineHeight: 30, marginBottom: 8 },
  employerInfo:  { marginBottom: 18, gap: 6 },
  employerName:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: MUTED },
  pesoBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: GREEN + '44' },
  pesoBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },

  // salary card (dark brown — user's specific request)
  salaryCard:       { backgroundColor: DARK, borderRadius: 18, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center', marginBottom: 14 },
  salaryCardLabel:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  salaryCardAmount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 34, color: '#fff', letterSpacing: -0.5 },
  salaryCardPer:    { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },

  // employment type row
  employmentRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  employmentPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: DIVIDER },
  employmentText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED },

  // perks
  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  perkPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER },
  perkText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

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

  // skills
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER },
  skillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED },

  // body
  bodyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 22, color: MUTED },

  // footer
  footer:       { padding: 16, borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#fff' },
  applyBtn:     { backgroundColor: DARK, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  applyBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 16 },
});
