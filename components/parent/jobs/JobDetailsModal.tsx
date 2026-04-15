// components/parent/jobs/JobDetailsModal.tsx

import type { JobPost } from '@/hooks/parent';
import { useJobReferences } from '@/hooks/shared';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { JobStatusBadge } from './JobStatusBadge';

interface JobDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  job: JobPost | null;
}

const isTrue = (val: any) => val === 1 || val === '1' || val === true;

function Section({ icon, title, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon} size={15} color={theme.color.parent} />
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
        <Ionicons name={icon} size={15} color={theme.color.parent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.detailLabel}>{label}</Text>
        <Text style={s.detailValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export function JobDetailsModal({ visible, onClose, job }: JobDetailsModalProps) {
  const { languages } = useJobReferences();
  if (!job) return null;

  const displayCategory = job.custom_category || job.category_name;
  const displayLanguage = languages.find(l => l.language_id.toString() === job.preferred_language_id?.toString())?.language_name || 'Any';

  const parseDaysOff = () => {
    try {
      if (!job.days_off) return 'Not specified';
      const parsed = JSON.parse(job.days_off);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed.join(', ') : 'Not specified';
    } catch { return 'Not specified'; }
  };

  const skillList: string[] = (() => {
    const sn = (job as any).skill_names;
    if (typeof sn === 'string' && sn.trim()) return sn.split(',').map((s: string) => s.trim());
    return [];
  })();

  const isPending  = job.status === 'Pending';
  const isRejected = job.status === 'Rejected';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* ── Header ── */}
          <View style={s.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={s.title} numberOfLines={2}>{job.title || 'Untitled Job'}</Text>
              <View style={s.badgeRow}>
                <JobStatusBadge status={job.status} />
                {displayCategory && (
                  <View style={s.catPill}>
                    <Text style={s.catText}>{displayCategory}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={theme.color.muted} />
            </TouchableOpacity>
          </View>

          {/* ── PESO notice banners ── */}
          {isPending && (
            <View style={s.pendingBanner}>
              <Ionicons name="hourglass-outline" size={15} color={theme.color.warning} />
              <Text style={s.pendingBannerText}>
                This job post is awaiting PESO verification before being visible to helpers.
              </Text>
            </View>
          )}
          {isRejected && (
            <View style={[s.pendingBanner, { backgroundColor: theme.color.dangerSoft }]}>
              <Ionicons name="close-circle-outline" size={15} color={theme.color.danger} />
              <Text style={[s.pendingBannerText, { color: theme.color.danger }]}>
                This post was rejected by PESO. Please edit and resubmit.
              </Text>
            </View>
          )}

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

            {/* Location */}
            <Section icon="location-outline" title="Location">
              <DetailRow icon="map-outline" label="Address"
                value={[job.barangay, job.municipality, job.province].filter(Boolean).join(', ')} />
            </Section>

            {/* Role & Schedule */}
            <Section icon="calendar-outline" title="Role & Schedule">
              <DetailRow icon="briefcase-outline"  label="Employment Type" value={job.employment_type} />
              <DetailRow icon="time-outline"        label="Work Schedule"   value={job.work_schedule} />
              {job.work_hours && <DetailRow icon="alarm-outline" label="Working Hours" value={job.work_hours} />}
              {job.start_date && <DetailRow icon="calendar-outline" label="Start Date" value={job.start_date} />}
              <DetailRow icon="cafe-outline" label="Days Off" value={parseDaysOff()} />
            </Section>

            {/* Description */}
            <Section icon="document-text-outline" title="Job Description">
              <Text style={s.bodyText}>{job.description || 'No description provided.'}</Text>
            </Section>

            {/* Skills & Preferences */}
            <Section icon="star-outline" title="Skills & Preferences">
              <View style={s.prefRow}>
                <View style={s.prefChip}>
                  <Ionicons name="language-outline" size={13} color={theme.color.parent} />
                  <Text style={s.prefChipText}>Language: {displayLanguage}</Text>
                </View>
                {job.preferred_religion && (
                  <View style={s.prefChip}>
                    <Ionicons name="heart-outline" size={13} color={theme.color.parent} />
                    <Text style={s.prefChipText}>{job.preferred_religion}</Text>
                  </View>
                )}
              </View>

              {skillList.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  <Text style={s.subLabel}>Required Skills</Text>
                  <View style={s.tagsRow}>
                    {skillList.map((skill, i) => (
                      <View key={i} style={s.skillTag}>
                        <Text style={s.skillTagText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {(job as any).custom_skills ? (
                <View style={[s.infoBox, { marginTop: 10 }]}>
                  <Text style={s.subLabel}>Additional Requirements</Text>
                  <Text style={s.bodyText}>{(job as any).custom_skills}</Text>
                </View>
              ) : null}
            </Section>

            {/* Candidate Requirements */}
            <Section icon="person-outline" title="Candidate Requirements">
              <View style={s.reqRow}>
                <View style={s.reqIconBox}>
                  <Ionicons name="person-outline" size={16} color={theme.color.parent} />
                </View>
                <View>
                  <Text style={s.reqLabel}>Age Bracket</Text>
                  <Text style={s.reqValue}>
                    {job.min_age && job.max_age ? `${job.min_age}–${job.max_age} years old` : 'Any age'}
                  </Text>
                </View>
              </View>
              <View style={s.reqRow}>
                <View style={s.reqIconBox}>
                  <Ionicons name="star-outline" size={16} color={theme.color.parent} />
                </View>
                <View>
                  <Text style={s.reqLabel}>Experience</Text>
                  <Text style={s.reqValue}>
                    {job.min_experience_years ? `At least ${job.min_experience_years} yr(s)` : 'No minimum'}
                  </Text>
                </View>
              </View>
              {isTrue(job.require_police_clearance) && (
                <View style={s.verifiedReq}>
                  <Ionicons name="shield-checkmark" size={16} color={theme.color.success} />
                  <Text style={s.verifiedReqText}>Police Clearance Required</Text>
                </View>
              )}
              {isTrue(job.prefer_tesda_nc2) && (
                <View style={[s.verifiedReq, { backgroundColor: theme.color.infoSoft }]}>
                  <Ionicons name="school" size={16} color={theme.color.info} />
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
                {isTrue(job.provides_meals)         && <PerkTag icon="restaurant"      label="Free Meals" />}
                {isTrue(job.provides_accommodation)  && <PerkTag icon="home"            label="Accommodation" />}
                {isTrue(job.provides_sss)            && <PerkTag icon="checkmark-circle" label="SSS" color={theme.color.success} />}
                {isTrue(job.provides_philhealth)     && <PerkTag icon="checkmark-circle" label="PhilHealth" color={theme.color.success} />}
                {isTrue(job.provides_pagibig)        && <PerkTag icon="checkmark-circle" label="Pag-IBIG" color={theme.color.success} />}
                {Number(job.vacation_days) > 0       && <PerkTag icon="airplane"        label={`${job.vacation_days} Vacation Days`} color={theme.color.info} />}
                {Number(job.sick_days) > 0           && <PerkTag icon="medkit"          label={`${job.sick_days} Sick Leaves`} color={theme.color.danger} />}
              </View>

              {job.benefits ? (
                <View style={s.infoBox}>
                  <Text style={s.subLabel}>Other Benefits</Text>
                  <Text style={s.bodyText}>{job.benefits}</Text>
                </View>
              ) : null}
            </Section>

            {/* Contract Terms */}
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

            {/* Meta */}
            <View style={s.meta}>
              <Text style={s.metaText}>
                Posted: {new Date(job.posted_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
              </Text>
              {job.filled_at && (
                <Text style={s.metaText}>
                  Filled: {new Date(job.filled_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
                </Text>
              )}
            </View>

            <View style={{ height: 12 }} />
          </ScrollView>

          {/* ── Footer ── */}
          <View style={s.footer}>
            <TouchableOpacity style={s.closeFullBtn} onPress={onClose}>
              <Text style={s.closeFullBtnText}>Close</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

function PerkTag({ icon, label, color = '#D97706' }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color?: string }) {
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

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:    { width: '100%', maxWidth: 660, maxHeight: '92%', backgroundColor: theme.color.surfaceElevated, borderRadius: 24, overflow: 'hidden', ...theme.shadow.card },

  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 22, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  title:   { fontSize: 22, fontWeight: '800', color: theme.color.ink, marginBottom: 10, letterSpacing: -0.4 },
  badgeRow:{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  catPill: { backgroundColor: theme.color.parentSoft, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.color.parent + '33' },
  catText: { fontSize: 12, fontWeight: '700', color: theme.color.parent },
  closeBtn:{ padding: 6, backgroundColor: theme.color.surface, borderRadius: 16 },

  pendingBanner: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 12,
    backgroundColor: theme.color.warningSoft,
    padding: 12,
    borderRadius: 10,
  },
  pendingBannerText: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.color.warning },

  scroll:  { paddingHorizontal: 22, paddingTop: 8 },

  section:      { marginBottom: 24 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: theme.color.ink, textTransform: 'uppercase', letterSpacing: 0.6 },

  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  detailIconWrap: { width: 32, height: 32, borderRadius: 9, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  detailLabel:  { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue:  { fontSize: 14, fontWeight: '600', color: theme.color.ink },

  bodyText: { fontSize: 14, lineHeight: 22, color: theme.color.muted },
  subLabel: { fontSize: 12, fontWeight: '700', color: theme.color.inkMuted, marginBottom: 6 },

  prefRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.color.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.color.line },
  prefChipText: { fontSize: 12, color: theme.color.inkMuted, fontWeight: '600' },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillTag: { backgroundColor: theme.color.parentSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: theme.color.parent + '22' },
  skillTagText: { fontSize: 12, fontWeight: '600', color: theme.color.parent },

  infoBox:  { backgroundColor: theme.color.surface, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.color.line },

  reqRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.surface, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.color.line },
  reqIconBox:{ width: 34, height: 34, borderRadius: 9, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  reqLabel: { fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase' },
  reqValue: { fontSize: 13, fontWeight: '600', color: theme.color.ink },
  verifiedReq: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.successSoft, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.color.success + '33' },
  verifiedReqText: { fontSize: 13, fontWeight: '700', color: theme.color.success },

  salaryBox:  { backgroundColor: theme.color.parent, padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 14 },
  salaryLabel:{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  salaryAmount:{ color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 4 },
  salaryPer:  { color: 'rgba(255,255,255,0.75)', fontSize: 13 },

  perksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },

  contractGrid: { flexDirection: 'row', gap: 12 },
  contractTile: { flex: 1, backgroundColor: theme.color.surface, padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.color.line },
  contractLabel:{ fontSize: 10, fontWeight: '700', color: theme.color.subtle, textTransform: 'uppercase', marginBottom: 4 },
  contractValue:{ fontSize: 14, fontWeight: '700', color: theme.color.ink },

  meta:     { borderTopWidth: 1, borderTopColor: theme.color.line, paddingTop: 16, paddingBottom: 8, gap: 4 },
  metaText: { fontSize: 12, color: theme.color.subtle },

  footer:      { padding: 18, borderTopWidth: 1, borderTopColor: theme.color.line },
  closeFullBtn:{ backgroundColor: theme.color.ink, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
