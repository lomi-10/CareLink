// app/(parent)/home/ParentWorkDashboard.tsx
// Work Mode dashboard screen content for the parent portal.
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { FontFamily } from '@/constants/GlobalStyles';
import {
  BROWN, DARK, MUTED, DIVIDER, ICON_BG, GREEN, SUCCESS_BG,
  DANGER, CREAM,
} from '@/components/parent/home/parentWarmTheme';
import { useParentWorkDashboard, type PlacementDashData } from '@/hooks/parent/useParentWorkDashboard';
import { useParentRecentlyEndedPlacements } from '@/hooks/parent/useParentRecentlyEndedPlacements';
import { PlacementReviewModal, SubmitComplaintModal, PostPlacementRenewalCard } from '@/components/shared';

// ─── Palette ─────────────────────────────────────────────────────────────────
const HERO_GRADIENT   = ['#F6D9AE', '#E2A968', '#C5853E'] as const;
const CARD_GRADIENT   = ['#FEF3DC', '#F9E4AC'] as const;
const ATTN_GRADIENT   = ['#FEF3DC', '#F9E4AC'] as const;
const PAY_GRADIENT    = ['#F3EEFF', '#E6D4FF'] as const;
const NAVY            = '#1E2A4A';
const AMBER           = '#D97706';
const AMBER_BG        = '#FEF3C7';
const PURPLE          = '#7C3AED';
const PURPLE_BG       = '#EDE9FE';
const PHOTO_W         = 104;
const PHOTO_H         = 124;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function toMonthly(salary: number | undefined, period: string | undefined): number {
  if (!salary) return 0;
  const p = (period ?? '').toLowerCase();
  if (p === 'daily') return salary * 26;
  if (p === 'weekly') return Math.round(salary * 4.33);
  return salary;
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function formatPeso(amount: number): string {
  return '₱' + amount.toLocaleString('en-PH');
}

// ─── Avatar (matches GreetingCard rectangular style) ─────────────────────────
function AvatarRect({
  uri, name, width = 48, height = 48, radius = 12,
}: { uri?: string | null; name: string; width?: number; height?: number; radius?: number }) {
  return uri ? (
    <Image
      source={{ uri }}
      style={{ width, height, borderRadius: radius }}
      contentFit="cover"
    />
  ) : (
    <View style={{
      width, height, borderRadius: radius,
      backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: Math.round(width * 0.33), color: BROWN }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ─── Stat tile inside hero ────────────────────────────────────────────────────
function HeroStatTile({
  icon, iconColor, iconBg, value, label, link, linkColor, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; iconBg: string;
  value: number; label: string;
  link?: string; linkColor?: string; onPress?: () => void;
}) {
  return (
    <View style={s.heroStatTile}>
      <View style={[s.heroStatIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={s.heroStatValue}>{value}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
      {link && onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <Text style={[s.heroStatLink, { color: linkColor ?? BROWN }]}>{link}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Helper card ─────────────────────────────────────────────────────────────
function HelperCard({ data, onTasks, onAttendance, onMessage }: {
  data: PlacementDashData;
  onTasks: () => void; onAttendance: () => void; onMessage: () => void;
}) {
  const { placement: p, checkedIn, checkInAt, tasksTotal, tasksDone } = data;
  const progress = tasksTotal > 0 ? tasksDone / tasksTotal : 0;

  return (
    <LinearGradient colors={CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.helperCard}>
      {/* Header */}
      <View style={s.helperCardHeader}>
        <View style={{ position: 'relative' }}>
          <AvatarRect uri={p.helper_photo} name={p.helper_name} width={48} height={48} radius={12} />
          <View style={[s.statusDot, { backgroundColor: checkedIn ? GREEN : AMBER }]} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.helperName} numberOfLines={1}>{p.helper_name}</Text>
          <Text style={s.helperRole} numberOfLines={1}>{p.job_title}</Text>
        </View>
      </View>

      {/* Badge */}
      <View style={s.badgeRow}>
        {checkedIn ? (
          <>
            <View style={s.checkedInBadge}><Text style={s.checkedInText}>Checked In</Text></View>
            {checkInAt ? <Text style={s.checkTime}>{formatTime(checkInAt)}</Text> : null}
          </>
        ) : (
          <>
            <View style={s.notCheckedBadge}><Text style={s.notCheckedText}>Not Checked In</Text></View>
            <Text style={s.checkTime}>Scheduled 8:00 AM</Text>
          </>
        )}
      </View>

      {/* Tasks */}
      <View style={s.taskRow}>
        <Text style={s.taskLabel}>Tasks Today</Text>
        <Text style={s.taskCount}>{tasksDone}/{tasksTotal} Completed</Text>
      </View>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>

      {/* Actions */}
      <View style={s.actionRow}>
        {([
          { icon: 'clipboard-outline', label: 'Tasks',      cb: onTasks },
          { icon: 'calendar-outline',  label: 'Attendance', cb: onAttendance },
          { icon: 'chatbubble-outline', label: 'Message',   cb: onMessage },
        ] as { icon: keyof typeof Ionicons.glyphMap; label: string; cb: () => void }[]).map((a) => (
          <TouchableOpacity key={a.label} style={s.actionBtn} onPress={a.cb} activeOpacity={0.75}>
            <Ionicons name={a.icon} size={19} color={BROWN} />
            <Text style={s.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Props = { userName: string; profileImage: string | null; onSwitchToRecruitment: () => void };

export default function ParentWorkDashboard({ userName, profileImage, onSwitchToRecruitment }: Props) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= 600;
  const { perPlacement, stats, loading, refresh } = useParentWorkDashboard();
  const { placements: recentlyEnded, loading: endedLoading, refresh: refreshEnded } = useParentRecentlyEndedPlacements(3);

  const [reviewTarget, setReviewTarget] = useState<{ applicationId: number; helperName: string; jobTitle: string } | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<{ applicationId: number; helperName: string } | null>(null);
  const [renewalTok, setRenewalTok] = useState(0);

  const payrollTotal = useMemo(
    () => perPlacement.reduce((sum, d) => sum + toMonthly(d.placement.salary_offered, d.placement.salary_period), 0),
    [perPlacement],
  );

  const allPendingLeaves = useMemo(
    () => perPlacement.flatMap((d) => d.pendingLeaves.map((l) => ({ ...l, helperData: d.placement }))),
    [perPlacement],
  );

  const contractAlerts = useMemo(
    () => perPlacement.filter((d) => d.placement.status === 'termination_pending'),
    [perPlacement],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning,' : hour < 17 ? 'Good afternoon,' : 'Good evening,';

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  // ── Attention Needed card ──────────────────────────────────────────────────
  const attentionCard = (
    <LinearGradient colors={ATTN_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sectionCard}>
      <View style={s.sectionHeader}>
        <Ionicons name="notifications" size={15} color={AMBER} />
        <Text style={s.sectionTitle}>Attention Needed</Text>
        {(allPendingLeaves.length > 0 || contractAlerts.length > 0) && (
          <TouchableOpacity
            onPress={() => router.push('/(parent)/hire/placement_leave_requests' as never)}
            style={{ marginLeft: 'auto' }}
          >
            <Text style={s.viewAllLink}>View all</Text>
          </TouchableOpacity>
        )}
      </View>
      {allPendingLeaves.length === 0 && contractAlerts.length === 0 ? (
        <Text style={s.emptyText}>No items need attention right now.</Text>
      ) : (
        <>
          {allPendingLeaves.slice(0, 3).map((item) => (
            <View key={item.id} style={s.attentionRow}>
              <AvatarRect uri={item.helperData.helper_photo} name={item.helperData.helper_name} width={38} height={38} radius={10} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.attentionName} numberOfLines={1}>{item.helperData.helper_name}</Text>
                <Text style={s.attentionSub} numberOfLines={1}>Leave Request Pending • {item.date}</Text>
              </View>
              <TouchableOpacity
                style={s.reviewBtn}
                onPress={() => router.push({ pathname: '/(parent)/hire/placement_leave_requests', params: { application_id: item.helperData.application_id } } as never)}
                activeOpacity={0.8}
              >
                <Text style={s.reviewBtnText}>Review</Text>
              </TouchableOpacity>
            </View>
          ))}
          {contractAlerts.map((d) => (
            <View key={d.placement.application_id} style={s.attentionRow}>
              <AvatarRect uri={d.placement.helper_photo} name={d.placement.helper_name} width={38} height={38} radius={10} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={s.attentionName} numberOfLines={1}>{d.placement.helper_name}</Text>
                <Text style={s.attentionSub} numberOfLines={1}>
                  Contract ending{d.placement.termination_last_day ? ` ${d.placement.termination_last_day}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[s.reviewBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={() => router.push({ pathname: '/(parent)/messages', params: { partner_id: d.placement.helper_id } } as never)}
                activeOpacity={0.8}
              >
                <Text style={[s.reviewBtnText, { color: '#2563EB' }]}>View</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </LinearGradient>
  );

  // ── Payroll Overview card ──────────────────────────────────────────────────
  const payrollCard = (
    <LinearGradient colors={PAY_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.sectionCard, !isWide && { marginTop: 12 }]}>
      <View style={s.sectionHeader}>
        <Ionicons name="wallet" size={15} color={PURPLE} />
        <Text style={s.sectionTitle}>Payroll Overview</Text>
        <Text style={[s.viewAllLink, { marginLeft: 'auto', color: MUTED, fontSize: 11 }]}>This Month</Text>
      </View>
      <Text style={s.payrollLabel}>Total Payroll</Text>
      <Text style={s.payrollTotal}>{formatPeso(payrollTotal)}</Text>
      {perPlacement.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {perPlacement.map((d) => (
            <View key={d.placement.application_id} style={s.payrollRow}>
              <AvatarRect uri={d.placement.helper_photo} name={d.placement.helper_name} width={26} height={26} radius={7} />
              <Text style={s.payrollHelperName} numberOfLines={1}>{d.placement.helper_name}</Text>
              <Text style={s.payrollAmount}>{formatPeso(toMonthly(d.placement.salary_offered, d.placement.salary_period))}</Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={s.managePayrollBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/(parent)/hire' as never)}
      >
        <Text style={s.managePayrollText}>Manage Payroll</Text>
        <Ionicons name="chevron-forward" size={15} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );

  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero card ─────────────────────────────────────────── */}
      <LinearGradient
        colors={HERO_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        {/* Decorative circles (matches GreetingCard) */}
        <View style={s.circle1} />
        <View style={s.circle2} />

        {/* Greeting + photo row */}
        <View style={s.heroContent}>
          <View style={{ flex: 1, zIndex: 2, paddingRight: 10 }}>
            {/* Kicker badge */}
            <View style={s.kickerBadge}>
              <Ionicons name="shield-checkmark" size={10} color="#fff" />
              <Text style={s.kickerText}>WORK MODE</Text>
            </View>
            <Text style={s.heroGreeting}>{greeting}</Text>
            <Text style={s.heroName} numberOfLines={2}>{userName} 👋</Text>
            <Text style={s.heroSub}>Here's what's happening with your household today.</Text>

            {/* CTA buttons — pill shaped, compact */}
            <View style={s.heroBtns}>
              <TouchableOpacity
                style={s.heroNavyBtn}
                onPress={() => router.push('/(parent)/hire')}
                activeOpacity={0.85}
              >
                <Ionicons name="people" size={13} color="#fff" />
                <Text style={s.heroNavyBtnText}>View Helpers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.heroOutlineBtn}
                onPress={() => router.push('/(parent)/hire/placement_tasks' as never)}
                activeOpacity={0.85}
              >
                <Ionicons name="clipboard-outline" size={13} color={DARK} />
                <Text style={s.heroOutlineBtnText}>Assign Task</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Profile photo — circular */}
          <View style={s.photoWrap}>
            <View style={s.photoFrame}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={s.photo} contentFit="cover" />
              ) : (
                <View style={s.photoFallback}>
                  <Ionicons name="person" size={PHOTO_W * 0.4} color={BROWN} />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Stats band inside gradient ─────────────────────── */}
        <View style={s.heroStatsBand}>
          <HeroStatTile
            icon="people" iconColor={BROWN} iconBg="rgba(139,90,43,0.18)"
            value={stats.activeHelpers} label="Active Helpers"
            link="View all" linkColor={DARK}
            onPress={() => router.push('/(parent)/hire')}
          />
          <View style={s.heroStatDivider} />
          <HeroStatTile
            icon="checkmark-circle" iconColor={GREEN} iconBg="rgba(5,150,105,0.18)"
            value={stats.checkedInToday} label="Checked In"
          />
          <View style={s.heroStatDivider} />
          <HeroStatTile
            icon="clipboard" iconColor={AMBER} iconBg="rgba(217,119,6,0.18)"
            value={stats.pendingTasksTotal} label="Pending Tasks"
            link="View all" linkColor={DARK}
            onPress={() => router.push('/(parent)/hire/placement_tasks' as never)}
          />
          <View style={s.heroStatDivider} />
          <HeroStatTile
            icon="calendar" iconColor={PURPLE} iconBg="rgba(124,58,237,0.18)"
            value={stats.pendingLeaveTotal} label="Pending Leave"
            link="Review" linkColor={DARK}
            onPress={() => router.push('/(parent)/hire/placement_leave_requests' as never)}
          />
        </View>
      </LinearGradient>

      {/* ── My Active Helpers ──────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="person" size={16} color={DARK} />
          <Text style={s.sectionTitle}>My Active Helpers</Text>
          <TouchableOpacity onPress={() => router.push('/(parent)/hire')} style={{ marginLeft: 'auto' }}>
            <Text style={s.viewAllLink}>View all &gt;</Text>
          </TouchableOpacity>
        </View>
        {perPlacement.length === 0 ? (
          <LinearGradient colors={CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyCard}>
            <Text style={s.emptyText}>No active helpers yet. Switch to Recruitment Mode to find helpers.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={onSwitchToRecruitment} activeOpacity={0.85}>
              <Text style={s.emptyBtnText}>Go to Recruitment Mode</Text>
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.helperScroll}>
            {perPlacement.map((d) => (
              <HelperCard
                key={d.placement.application_id}
                data={d}
                onTasks={() => router.push({ pathname: '/(parent)/hire/placement_tasks', params: { application_id: d.placement.application_id } } as never)}
                onAttendance={() => router.push({ pathname: '/(parent)/hire/placement_attendance', params: { application_id: d.placement.application_id } } as never)}
                onMessage={() => router.push({ pathname: '/(parent)/messages', params: { partner_id: d.placement.helper_id } } as never)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Attention Needed + Payroll (side-by-side wide / stacked mobile) ── */}
      {isWide ? (
        <View style={[s.section, { flexDirection: 'row', gap: 12 }]}>
          <View style={{ flex: 1 }}>{attentionCard}</View>
          <View style={{ flex: 1 }}>{payrollCard}</View>
        </View>
      ) : (
        <View style={s.section}>
          {attentionCard}
          {payrollCard}
        </View>
      )}

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Ionicons name="flash" size={16} color={DARK} />
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={s.quickRow}>
          {([
            { icon: 'clipboard-outline',      label: 'Assign\nTask',       path: '/(parent)/hire/placement_tasks' },
            { icon: 'document-text-outline',  label: 'Review\nLeave',      path: '/(parent)/hire/placement_leave_requests' },
            { icon: 'reader-outline',         label: 'View\nContracts',    path: '/(parent)/hire' },
            { icon: 'bar-chart-outline',      label: 'Attendance\nReport', path: '/(parent)/hire/placement_attendance' },
            { icon: 'briefcase-outline',      label: 'Post\nNew Job',      path: '/(parent)/jobs' },
          ] as { icon: keyof typeof Ionicons.glyphMap; label: string; path: string }[]).map((qa) => (
            <TouchableOpacity
              key={qa.label}
              style={s.quickBtn}
              onPress={() => router.push(qa.path as never)}
              activeOpacity={0.8}
            >
              <LinearGradient colors={CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.quickBtnIcon}>
                <Ionicons name={qa.icon} size={20} color={BROWN} />
              </LinearGradient>
              <Text style={s.quickBtnLabel}>{qa.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Recently Ended (within 7 days) ────────────────────── */}
      {(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = recentlyEnded.filter(p => {
          if (!p.ended_on) return false;
          const d = new Date(p.ended_on.replace(/-/g, '/'));
          return d >= sevenDaysAgo;
        });
        if (recent.length === 0) return null;
        return (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Ionicons name="time" size={15} color={AMBER} />
              <Text style={s.sectionTitle}>Recently Ended</Text>
              <View style={s.recentCountPill}>
                <Text style={s.recentCountText}>{recent.length}</Text>
              </View>
              <Text style={[s.viewAllLink, { marginLeft: 'auto', fontSize: 11, color: MUTED }]}>Last 7 days</Text>
            </View>
            {recent.map((p) => (
              <LinearGradient
                key={p.application_id}
                colors={CARD_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[s.sectionCard, { marginBottom: 10 }]}
              >
                <View style={s.recentRow}>
                  <AvatarRect uri={null} name={p.helper_name} width={44} height={44} radius={11} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.recentName} numberOfLines={1}>{p.helper_name}</Text>
                    <Text style={s.recentMeta} numberOfLines={1}>
                      {p.job_title}
                      {p.ended_on ? `  ·  Ended ${new Date(p.ended_on.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                    </Text>
                  </View>
                  <View style={s.endedBadge}>
                    <Text style={s.endedBadgeText}>Ended</Text>
                  </View>
                </View>
                <View style={s.recentBtnsRow}>
                  <TouchableOpacity
                    style={s.recentBtnPrimary}
                    activeOpacity={0.8}
                    onPress={() => setReviewTarget({ applicationId: p.application_id, helperName: p.helper_name, jobTitle: p.job_title })}
                  >
                    <Ionicons name="star-outline" size={14} color="#fff" />
                    <Text style={s.recentBtnPrimaryText}>Rate & Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.recentBtnOutline}
                    activeOpacity={0.8}
                    onPress={() => setComplaintTarget({ applicationId: p.application_id, helperName: p.helper_name })}
                  >
                    <Ionicons name="flag-outline" size={14} color={DANGER} />
                    <Text style={s.recentBtnOutlineText}>Submit Complaint</Text>
                  </TouchableOpacity>
                </View>
                <PostPlacementRenewalCard
                  applicationId={p.application_id}
                  jobPostId={p.job_post_id}
                  messagesPartnerUserId={p.helper_id}
                  userType="parent"
                  counterpartyName={p.helper_name}
                  jobTitle={p.job_title}
                  endedOn={p.ended_on}
                  accentColor={BROWN}
                  softBg={ICON_BG}
                  refreshToken={renewalTok}
                  onIntentSaved={() => { setRenewalTok((x) => x + 1); void refreshEnded(); }}
                />
              </LinearGradient>
            ))}
          </View>
        );
      })()}

      {/* ── Placement History preview ──────────────────────────── */}
      {!endedLoading && recentlyEnded.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Ionicons name="book" size={15} color={DARK} />
            <Text style={s.sectionTitle}>Placement History</Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/hire/history' as never)} style={{ marginLeft: 'auto' }}>
              <Text style={s.viewAllLink}>View all &gt;</Text>
            </TouchableOpacity>
          </View>
          <LinearGradient colors={CARD_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.sectionCard}>
            {recentlyEnded.slice(0, 3).map((p, idx) => (
              <View key={p.application_id} style={[s.histPreviewRow, idx > 0 && { borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 10, marginTop: 10 }]}>
                <AvatarRect uri={null} name={p.helper_name} width={36} height={36} radius={9} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.histPreviewName} numberOfLines={1}>{p.helper_name}</Text>
                  <Text style={s.histPreviewMeta} numberOfLines={1}>
                    {p.job_title}{p.ended_on ? `  ·  ${new Date(p.ended_on.replace(/-/g, '/')).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.histPreviewBtn}
                  activeOpacity={0.8}
                  onPress={() => setReviewTarget({ applicationId: p.application_id, helperName: p.helper_name, jobTitle: p.job_title })}
                >
                  <Ionicons name="star-outline" size={13} color={BROWN} />
                  <Text style={s.histPreviewBtnText}>Rate</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={s.histViewAllBtn}
              onPress={() => router.push('/(parent)/hire/history' as never)}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={14} color={BROWN} />
              <Text style={s.histViewAllText}>View Full History</Text>
              <Ionicons name="chevron-forward" size={14} color={BROWN} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      <View style={{ height: 100 }} />

      {/* ── Modals ────────────────────────────────────────────── */}
      <PlacementReviewModal
        visible={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        applicationId={reviewTarget?.applicationId ?? 0}
        userType="parent"
        counterpartyName={reviewTarget?.helperName ?? ''}
        jobTitle={reviewTarget?.jobTitle}
        accentColor={BROWN}
        onSubmitted={() => void refreshEnded()}
      />
      <SubmitComplaintModal
        visible={!!complaintTarget}
        onClose={() => setComplaintTarget(null)}
        applicationId={complaintTarget?.applicationId ?? 0}
        userType="parent"
        counterpartyLabel={complaintTarget?.helperName}
        onSubmitted={() => setComplaintTarget(null)}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { paddingBottom: 24 },

  // ── Hero ──────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 16,
    borderRadius: 22,
    paddingTop: 20,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', right: -34, top: -34,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  circle2: {
    position: 'absolute', right: 70, bottom: 60,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(139,90,43,0.10)',
  },
  heroContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  kickerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: BROWN, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, alignSelf: 'flex-start', marginBottom: 10,
  },
  kickerText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 9, color: '#fff', letterSpacing: 1.2,
  },
  heroGreeting: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK },
  heroName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK, letterSpacing: -0.3, marginBottom: 6 },
  heroSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#5A4327', lineHeight: 17, marginBottom: 14 },
  heroBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroNavyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  heroNavyBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#fff' },
  heroOutlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(139,90,43,0.18)',
  },
  heroOutlineBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  // Photo (rectangular, matches GreetingCard)
  photoWrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  photoFrame: {
    width: PHOTO_W, height: PHOTO_H, borderRadius: 20,
    overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.75)',
    backgroundColor: CREAM,
  },
  photo: { width: PHOTO_W, height: PHOTO_H },
  photoFallback: { width: PHOTO_W, height: PHOTO_H, alignItems: 'center', justifyContent: 'center' },

  // Stats band — inside gradient, semi-transparent white strip
  heroStatsBand: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginHorizontal: -20,
    paddingHorizontal: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
  heroStatTile: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  heroStatIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroStatValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  heroStatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 9, color: MUTED, textAlign: 'center', marginTop: 1 },
  heroStatLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, marginTop: 2 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(139,90,43,0.2)', marginVertical: 6 },

  // ── Section ───────────────────────────────────────────────
  section: { marginHorizontal: 12, marginBottom: 16 },
  sectionCard: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: DIVIDER },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  viewAllLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  // ── Helper cards ──────────────────────────────────────────
  helperScroll: { gap: 10, paddingRight: 4, paddingBottom: 4 },
  helperCard: {
    width: 240, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: DIVIDER,
  },
  helperCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    borderWidth: 2, borderColor: '#fff',
  },
  helperName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  helperRole: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  checkedInBadge: { backgroundColor: SUCCESS_BG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  checkedInText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: GREEN },
  notCheckedBadge: { borderWidth: 1.5, borderColor: DANGER, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  notCheckedText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: DANGER },
  checkTime: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  taskLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },
  taskCount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },
  progressTrack: { height: 4, backgroundColor: DIVIDER, borderRadius: 2, marginBottom: 10 },
  progressFill: { height: 4, backgroundColor: BROWN, borderRadius: 2 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderTopWidth: 1, borderTopColor: DIVIDER, paddingTop: 8,
  },
  actionBtn: { alignItems: 'center', gap: 3 },
  actionLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },

  // ── Attention Needed ──────────────────────────────────────
  attentionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  attentionName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
  attentionSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, marginTop: 1 },
  reviewBtn: {
    borderWidth: 1, borderColor: '#FDE68A', backgroundColor: AMBER_BG,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  reviewBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: AMBER },

  // ── Payroll Overview ──────────────────────────────────────
  payrollLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 2 },
  payrollTotal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK, marginTop: 2 },
  payrollRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  payrollHelperName: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, flex: 1 },
  payrollAmount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
  managePayrollBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: NAVY, borderRadius: 10, paddingVertical: 10, marginTop: 12,
  },
  managePayrollText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#fff' },

  // ── Quick Actions ─────────────────────────────────────────
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: { alignItems: 'center', flex: 1 },
  quickBtnIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
    borderWidth: 1, borderColor: DIVIDER,
  },
  quickBtnLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, textAlign: 'center' },

  // ── Empty state ───────────────────────────────────────────
  emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: DIVIDER },
  emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 14, backgroundColor: BROWN, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  emptyBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },

  // ── Recent Placement ──────────────────────────────────────
  recentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recentName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  recentMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 2 },
  endedBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  endedBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: MUTED },
  recentBtnsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  recentBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    backgroundColor: BROWN, borderRadius: 10, paddingVertical: 10,
  },
  recentBtnPrimaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#fff' },
  recentBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    borderWidth: 1.5, borderColor: DANGER, borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#FFF5F5',
  },
  recentBtnOutlineText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DANGER },

  recentCountPill: {
    backgroundColor: AMBER_BG, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  recentCountText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: AMBER },
  histPreviewRow: { flexDirection: 'row', alignItems: 'center' },
  histPreviewName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
  histPreviewMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED, marginTop: 1 },
  histPreviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ICON_BG, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
  },
  histPreviewBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },
  histViewAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: DIVIDER,
  },
  histViewAllText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN, flex: 1 },
});
