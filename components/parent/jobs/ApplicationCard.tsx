// components/parent/jobs/ApplicationCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ApplicationCardProps {
  application: any; // Type from useJobApplications
  onViewProfile: () => void;
  onShortlist: () => void;
  onReject: () => void;
  onScheduleInterview?: () => void;
  onMessage?: () => void;
}

export function ApplicationCard({ application, onViewProfile, onShortlist, onReject, onScheduleInterview, onMessage }: ApplicationCardProps) {
  
  // Dynamic status configuration for premium badges
  const getStatusConfig = () => {
    switch (application.status) {
      case 'Pending': return { color: '#D97706', bg: '#FEF3C7', icon: 'time', label: 'Needs Review' };
      case 'Reviewed': return { color: '#2563EB', bg: '#DBEAFE', icon: 'eye', label: 'Reviewed' };
      case 'Shortlisted': return { color: '#7C3AED', bg: '#F3E8FF', icon: 'star', label: 'Shortlisted' };
      case 'Interview Scheduled': return { color: '#059669', bg: '#D1FAE5', icon: 'calendar', label: 'Interviewing' };
      case 'Accepted': return { color: '#059669', bg: '#D1FAE5', icon: 'checkmark-circle', label: 'Hired' };
      case 'Rejected': return { color: '#DC2626', bg: '#FEE2E2', icon: 'close-circle', label: 'Rejected' };
      case 'Withdrawn': return { color: '#6B7280', bg: '#F3F4F6', icon: 'arrow-undo', label: 'Withdrawn' };
      default: return { color: '#6B7280', bg: '#F3F4F6', icon: 'information-circle', label: application.status };
    }
  };

  const statusConfig = getStatusConfig();
  const canTakeAction = ['Pending', 'Reviewed'].includes(application.status);
  const canSchedule   = ['Shortlisted', 'Interview Scheduled'].includes(application.status);

  // Format the applied date cleanly
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Get helper initials for the avatar placeholder
  const getInitials = (name: string) => {
    if (!name) return 'H';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onViewProfile} activeOpacity={0.95}>
      
      {/* --- TOP ROW: AVATAR, NAME, STATUS --- */}
      <View style={styles.header}>
        <View style={styles.helperInfoContainer}>
          {application.helper_photo ? (
            <Image source={{ uri: application.helper_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(application.helper_name)}</Text>
            </View>
          )}
          
          <View style={styles.nameContainer}>
            <Text style={styles.helperName} numberOfLines={1}>{application.helper_name || 'Unknown Helper'}</Text>
            <View style={styles.metaRow}>
              {application.helper_age && (
                <Text style={styles.metaText}>{application.helper_age} yrs • {application.helper_gender || 'Any'}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* --- QUICK STATS ROW --- */}
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Ionicons name="briefcase-outline" size={16} color="#4B5563" />
          <Text style={styles.statPillText}>
            {application.helper_experience_years ? `${application.helper_experience_years} Years Exp.` : 'No Exp. Listed'}
          </Text>
        </View>
        
        <View style={styles.statPill}>
          <Ionicons name="star" size={16} color="#D97706" />
          <Text style={styles.statPillText}>
            {application.helper_rating_average ? Number(application.helper_rating_average).toFixed(1) : 'New'}
            {application.helper_rating_count ? ` (${application.helper_rating_count})` : ''}
          </Text>
        </View>

        <View style={styles.statPill}>
          <Ionicons name="location-outline" size={16} color="#4B5563" />
          <Text style={styles.statPillText} numberOfLines={1}>
            {application.helper_municipality || 'Location N/A'}
          </Text>
        </View>
      </View>

      {/* --- COVER LETTER PREVIEW --- */}
      {application.cover_letter ? (
        <View style={styles.coverLetterPreview}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#9CA3AF" style={{ marginTop: 2 }} />
          <Text style={styles.coverLetterText} numberOfLines={2}>
            "{application.cover_letter}"
          </Text>
        </View>
      ) : null}

      <Text style={styles.appliedDateText}>Applied on {formatDate(application.applied_at)}</Text>

      {/* --- FOOTER ACTIONS --- */}
      <View style={styles.footer}>
        {canTakeAction && (
          <>
            <TouchableOpacity style={styles.rejectBtn} onPress={(e) => { e.stopPropagation(); onReject(); }}>
              <Ionicons name="close" size={18} color="#DC2626" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shortlistBtn} onPress={(e) => { e.stopPropagation(); onShortlist(); }}>
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={styles.shortlistBtnText}>Shortlist</Text>
            </TouchableOpacity>
          </>
        )}
        {canSchedule && onScheduleInterview && (
          <TouchableOpacity style={styles.scheduleBtn} onPress={(e) => { e.stopPropagation(); onScheduleInterview(); }}>
            <Ionicons name="calendar-outline" size={15} color="#fff" />
            <Text style={styles.scheduleBtnText}>Interview</Text>
          </TouchableOpacity>
        )}
        {onMessage && !canTakeAction && (
          <TouchableOpacity style={styles.msgBtn} onPress={(e) => { e.stopPropagation(); onMessage(); }}>
            <Ionicons name="chatbubble-outline" size={15} color="#2563EB" />
            <Text style={styles.msgBtnText}>Message</Text>
          </TouchableOpacity>
        )}
        {!canTakeAction && !canSchedule && <View style={{ flex: 1 }} />}

        <TouchableOpacity style={styles.viewProfileBtn} onPress={(e) => { e.stopPropagation(); onViewProfile(); }}>
          <Text style={styles.viewProfileText}>View Profile</Text>
          <Ionicons name="chevron-forward" size={16} color="#4B5563" />
        </TouchableOpacity>
      </View>

    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
      android: { elevation: 3 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
    }),
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  helperInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  helperName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // Cover Letter
  coverLetterPreview: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  coverLetterText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  appliedDateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    fontWeight: '500',
  },

  // Footer Actions
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 8,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  shortlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#7C3AED', // Premium Purple for Shortlist
  },
  shortlistBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  viewProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  viewProfileText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: '#059669',
  },
  scheduleBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, backgroundColor: '#EFF6FF',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  msgBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '700' },
});