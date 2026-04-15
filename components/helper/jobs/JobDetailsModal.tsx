// components/helper/jobs/JobDetailsModal.tsx

import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { ParentProfileModal } from './ParentProfileModal';
import API_URL from '@/constants/api';

interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  job: any;
}

const isTrue = (val: any) => val === 1 || val === '1' || val === true;

function Section({ icon, title, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon} size={14} color={theme.color.helper} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <View style={s.detailIconWrap}>
        <Ionicons name={icon} size={14} color={theme.color.helper} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function PerkTag({ icon, label, color = theme.color.warning }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color?: string }) {
  return (
    <View style={[pk.tag, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[pk.text, { color }]}>{label}</Text>
    </View>
  );
}

const pk = StyleSheet.create({
  tag:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.color.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 12, fontWeight: '600' },
});

export function JobDetailsModal({ visible, onClose, onApply, job }: JobDetailsModalProps) {
  const [showParentProfile, setShowParentProfile] = useState(false);

  if (!job) return null;

  const displayCategory = job.custom_category || job.category_name
    || (job.categories && job.categories[0]) || 'General';

  const getProfileUrl = (filename: string | null | undefined) => {
    if (!filename) return null;
    if (filename.includes('http')) return filename;
    return `${API_URL}/uploads/profiles/${filename}`;
  };

  const displaySkills: string[] = Array.isArray(job.skills) && job.skills.length > 0
    ? job.skills
    : (typeof job.skill_names === 'string' && job.skill_names.trim()
      ? job.skill_names.split(',').map((s: string) => s.trim())
      : []);

  const profileUri = getProfileUrl(job.parent_profile_image);

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={[s.card, Platform.OS === 'web' && { width: '82%' }]}>

            {/* ── Header ── */}
            <View style={s.header}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={s.title} numberOfLines={2}>{job.title}</Text>
                <View style={s.badgeRow}>
                  <View style={s.pesoBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={theme.color.helper} />
                    <Text style={s.pesoBadgeText}>PESO Verified</Text>
                  </View>
                  <View style={s.catPill}>
                    <Text style={s.catText}>{displayCategory}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={22} color={theme.color.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

              {/* ── Employer card ── */}
              <TouchableOpacity
                style={s.employerCard}
                onPress={() => setShowParentProfile(true)}
                activeOpacity={0.8}
              >
                {profileUri ? (
                  <Image source={{ uri: profileUri }} style={s.employerAvatar} />
                ) : (
                  <View style={[s.employerAvatar, s.employerAvatarFallback]}>
                    <Ionicons name="person" size={22} color={theme.color.parent} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.employerName}>{job.parent_name || 'Verified Employer'}</Text>
                  <Text style={s.employerLoc}>
                    {[job.parent_municipality || job.municipality, job.parent_province || job.province].filter(Boolean).join(', ')}
                    {job.distance ? `  ·  ~${job.distance} km` : ''}
                  </Text>
                </View>
                <View style={s.viewProfileBtn}>
                  <Text style={s.viewProfileBtnText}>Profile</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.color.parent} />
                </View>
              </TouchableOpacity>

              {/* Role & Schedule */}
              <Section icon="calendar-outline" title="Role & Schedule">
                <DetailRow icon="briefcase-outline" label="Employment Type" value={job.employment_type} />
                <DetailRow icon="time-outline"      label="Work Schedule"   value={job.work_schedule} />
                {job.work_hours && <DetailRow icon="alarm-outline" label="Working Hours" value={job.work_hours} />}
                {job.start_date && <DetailRow icon="calendar-outline" label="Start Date" value={job.start_date} />}
              </Section>

              {/* Description */}
              <Section icon="document-text-outline" title="Job Description">
                <Text style={s.bodyText}>{job.description || 'No description provided.'}</Text>
              </Section>

              {/* Skills */}
              {displaySkills.length > 0 && (
                <Section icon="star-outline" title="Required Skills">
                  <View style={s.tagsRow}>
                    {displaySkills.map((skill: string, i: number) => (
                      <View key={i} style={s.skillTag}>
                        <Text style={s.skillTagText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                  {job.custom_skills ? (
                    <View style={[s.infoBox, { marginTop: 10 }]}>
                      <Text style={s.bodyText}>{job.custom_skills}</Text>
                    </View>
                  ) : null}
                </Section>
              )}

              {/* Candidate Requirements */}
              <Section icon="person-outline" title="Requirements">
                <View style={s.reqRow}>
                  <View style={s.reqIconBox}><Ionicons name="person-outline" size={15} color={theme.color.helper} /></View>
                  <View>
                    <Text style={s.reqLabel}>Age</Text>
                    <Text style={s.reqValue}>
                      {job.min_age && job.max_age ? `${job.min_age}–${job.max_age} yrs` : 'Any age'}
                    </Text>
                  </View>
                </View>
                <View style={s.reqRow}>
                  <View style={s.reqIconBox}><Ionicons name="star-outline" size={15} color={theme.color.helper} /></View>
                  <View>
                    <Text style={s.reqLabel}>Experience</Text>
                    <Text style={s.reqValue}>
                      {job.min_experience_years ? `At least ${job.min_experience_years} yr(s)` : 'No minimum'}
                    </Text>
                  </View>
                </View>
                {isTrue(job.require_police_clearance) && (
                  <View style={s.verifiedReq}>
                    <Ionicons name="shield-checkmark" size={15} color={theme.color.success} />
                    <Text style={s.verifiedReqText}>Police Clearance Required</Text>
                  </View>
                )}
                {isTrue(job.prefer_tesda_nc2) && (
                  <View style={[s.verifiedReq, { backgroundColor: theme.color.infoSoft }]}>
                    <Ionicons name="school" size={15} color={theme.color.info} />
                    <Text style={[s.verifiedReqText, { color: theme.color.info }]}>TESDA NC II Preferred</Text>
                  </View>
                )}
              </Section>

              {/* Compensation */}
              <Section icon="cash-outline" title="Compensation & Benefits">
                <View style={s.salaryBox}>
                  <Text style={s.salaryLabel}>Offered Salary</Text>
                  <Text style={s.salaryAmount}>₱{Number(job.salary_offered).toLocaleString()}</Text>
                  <Text style={s.salaryPer}>per {job.salary_period === 'Monthly' ? 'Month' : 'Day'}</Text>
                </View>

                <View style={s.perksRow}>
                  {isTrue(job.provides_meals)          && <PerkTag icon="restaurant"       label="Free Meals" />}
                  {isTrue(job.provides_accommodation)   && <PerkTag icon="home"             label="Accommodation" />}
                  {isTrue(job.provides_sss)             && <PerkTag icon="checkmark-circle" label="SSS" color={theme.color.success} />}
                  {isTrue(job.provides_philhealth)      && <PerkTag icon="checkmark-circle" label="PhilHealth" color={theme.color.success} />}
                  {isTrue(job.provides_pagibig)         && <PerkTag icon="checkmark-circle" label="Pag-IBIG" color={theme.color.success} />}
                  {Number(job.vacation_days) > 0        && <PerkTag icon="airplane"         label={`${job.vacation_days} Vacation Days`} color={theme.color.info} />}
                  {Number(job.sick_days) > 0            && <PerkTag icon="medkit"           label={`${job.sick_days} Sick Leaves`} color={theme.color.danger} />}
                </View>

                {job.benefits ? (
                  <View style={s.infoBox}>
                    <Text style={s.subLabel}>Other Benefits</Text>
                    <Text style={s.bodyText}>{job.benefits}</Text>
                  </View>
                ) : null}
              </Section>

              {/* Contract */}
              {(job.contract_duration || job.probation_period) && (
                <Section icon="document-outline" title="Contract Terms">
                  <View style={s.contractGrid}>
                    <View style={s.contractTile}>
                      <Text style={s.contractLabel}>Duration</Text>
                      <Text style={s.contractValue}>{job.contract_duration || 'Not specified'}</Text>
                    </View>
                    <View style={s.contractTile}>
                      <Text style={s.contractLabel}>Probation</Text>
                      <Text style={s.contractValue}>{job.probation_period || 'None'}</Text>
                    </View>
                  </View>
                </Section>
              )}

              <View style={{ height: 12 }} />
            </ScrollView>

            {/* ── Apply footer ── */}
            <SafeAreaView style={s.footer}>
              <TouchableOpacity style={s.applyBtn} onPress={onApply} activeOpacity={0.85}>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <Text style={s.applyBtnText}>Apply for this Position</Text>
              </TouchableOpacity>
            </SafeAreaView>

          </View>
        </View>
      </Modal>

      <ParentProfileModal
        visible={showParentProfile}
        onClose={() => setShowParentProfile(false)}
        parentData={job}
      />
    </>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:    { width: '100%', maxWidth: 660, maxHeight: '93%', backgroundColor: theme.color.surfaceElevated, borderRadius: 24, overflow: 'hidden', ...theme.shadow.card },

  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 22, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  title:   { fontSize: 21, fontWeight: '800', color: theme.color.ink, marginBottom: 10, letterSpacing: -0.4 },
  badgeRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pesoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.color.helperSoft,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: theme.color.helper + '33',
  },
  pesoBadgeText: { fontSize: 11, fontWeight: '700', color: theme.color.helper },
  catPill: {
    backgroundColor: theme.color.surface,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: theme.color.line,
  },
  catText: { fontSize: 11, fontWeight: '600', color: theme.color.muted },
  closeBtn:{ padding: 6, backgroundColor: theme.color.surface, borderRadius: 16 },

  scroll:  { paddingHorizontal: 22, paddingTop: 8 },

  employerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.color.parentSoft,
    padding: 14, borderRadius: 14, marginBottom: 24,
    borderWidth: 1, borderColor: theme.color.parent + '22',
  },
  employerAvatar: { width: 46, height: 46, borderRadius: 23 },
  employerAvatarFallback: { backgroundColor: theme.color.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  employerName: { fontSize: 15, fontWeight: '800', color: theme.color.parent, marginBottom: 2 },
  employerLoc:  { fontSize: 12, color: theme.color.inkMuted, fontWeight: '500' },
  viewProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: theme.color.surfaceElevated,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  viewProfileBtnText: { fontSize: 11, fontWeight: '700', color: theme.color.parent },

  section:      { marginBottom: 24 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  sectionIconWrap: { width: 26, height: 26, borderRadius: 7, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.color.ink, textTransform: 'uppercase', letterSpacing: 0.6 },

  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  detailIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center' },
  detailLabel:  { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:  { fontSize: 13, fontWeight: '600', color: theme.color.ink },

  bodyText: { fontSize: 14, lineHeight: 22, color: theme.color.muted },
  subLabel: { fontSize: 12, fontWeight: '700', color: theme.color.inkMuted, marginBottom: 6 },

  tagsRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag:  { backgroundColor: theme.color.helperSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: theme.color.helper + '22' },
  skillTagText: { fontSize: 12, fontWeight: '600', color: theme.color.helper },
  infoBox:   { backgroundColor: theme.color.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.color.line },

  reqRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.surface, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.color.line },
  reqIconBox:{ width: 32, height: 32, borderRadius: 9, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center' },
  reqLabel:  { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase' },
  reqValue:  { fontSize: 13, fontWeight: '600', color: theme.color.ink },
  verifiedReq: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.successSoft, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.color.success + '33' },
  verifiedReqText: { fontSize: 13, fontWeight: '700', color: theme.color.success },

  salaryBox:   { backgroundColor: theme.color.helper, padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 14 },
  salaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  salaryAmount:{ color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 4 },
  salaryPer:   { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  perksRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

  contractGrid:{ flexDirection: 'row', gap: 12 },
  contractTile:{ flex: 1, backgroundColor: theme.color.surface, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.color.line },
  contractLabel:{ fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', marginBottom: 4 },
  contractValue:{ fontSize: 14, fontWeight: '700', color: theme.color.ink },

  footer:   { padding: 18, borderTopWidth: 1, borderTopColor: theme.color.line },
  applyBtn: { backgroundColor: theme.color.helper, paddingVertical: 15, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: theme.color.helper, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
