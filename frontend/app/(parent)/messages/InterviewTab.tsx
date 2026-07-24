// app/(parent)/messages/InterviewTab.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MUTED, DANGER, GREEN, BROWN, ICON_BG } from '@/components/parent/home/parentWarmTheme';
import { s } from './messages.styles';
import { fmtLongDate, fullTime, interviewPillStyle, ResolvedApplication } from './helpers';
import { ContractRow } from './components';
import { InterviewGuideModal } from './InterviewGuideModal';

export default function InterviewTab({
  resolvedApp, partnerName, interviewActionLoading, onSchedule, onReschedule, onCancel,
}: {
  resolvedApp: ResolvedApplication | null;
  partnerName: string;
  interviewActionLoading: boolean;
  onSchedule: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const [guideOpen, setGuideOpen] = useState(false);
  return (
    <ScrollView style={s.contractTabBody} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={s.contractHeaderRow}>
        <Text style={s.contractHeaderTitle}>Interview Schedule</Text>
        <View style={[s.statusPill, !resolvedApp?.interview_id ? s.statusPillGray : interviewPillStyle(resolvedApp.interview_status)]}>
          <Text style={s.statusPillTxt}>{resolvedApp?.interview_id ? (resolvedApp.interview_status || 'Scheduled') : 'None'}</Text>
        </View>
      </View>

      {/* Interview guide — questions to ask, saved answers pre-fill the contract. */}
      {!!resolvedApp?.application_id && (
        <TouchableOpacity
          onPress={() => setGuideOpen(true)}
          activeOpacity={0.85}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ICON_BG, borderRadius: 14, padding: 14, marginBottom: 16 }}
        >
          <Ionicons name="clipboard-outline" size={22} color={BROWN} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: BROWN }}>Want a guide to interview this helper?</Text>
            <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>Questions to ask — your answers pre-fill the contract.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={BROWN} />
        </TouchableOpacity>
      )}

      <InterviewGuideModal
        visible={guideOpen}
        applicationId={resolvedApp?.application_id ?? null}
        helperName={partnerName}
        onClose={() => setGuideOpen(false)}
      />

      {!resolvedApp?.interview_id ? (
        <View style={s.contractEmptyState}>
          <View style={s.contractEmptyIconWrap}>
            <Ionicons name="calendar-outline" size={32} color={MUTED} />
          </View>
          <Text style={s.contractEmptyTitle}>No interview scheduled</Text>
          <Text style={s.contractEmptySub}>Schedule an interview to meet {partnerName} before finalizing the hire.</Text>
          <View style={s.contractEmptyBtns}>
            <TouchableOpacity style={s.contractPrimaryBtn} onPress={onSchedule}>
              <Text style={s.contractPrimaryBtnTxt}>Schedule Interview</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={s.contractSummaryCard}>
            <ContractRow label="Date" value={fmtLongDate(resolvedApp.interview_date)} />
            <ContractRow label="Time" value={resolvedApp.interview_date ? fullTime(resolvedApp.interview_date) : '—'} />
            <ContractRow label="Interview Type" value={resolvedApp.interview_type || '—'} />
            <ContractRow
              label={resolvedApp.interview_type === 'Video Call' ? 'Meeting Link' : resolvedApp.interview_type === 'Phone' ? 'Phone' : 'Location'}
              value={resolvedApp.location_or_link || '—'}
            />
            <ContractRow label="Helper Confirmed" value={resolvedApp.helper_confirmed ? 'Yes' : 'Pending'} />
          </View>

          <View style={s.contractActionBtnsCol}>
            {resolvedApp.interview_type === 'Video Call'
              && ['Scheduled', 'Confirmed'].includes(resolvedApp.interview_status || '')
              && !!resolvedApp.location_or_link && (
              <TouchableOpacity
                style={[s.contractPrimaryBtn, { backgroundColor: GREEN }]}
                onPress={() => Linking.openURL(resolvedApp.location_or_link!)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="videocam" size={16} color="#fff" />
                  <Text style={s.contractPrimaryBtnTxt}>Join Interview</Text>
                </View>
              </TouchableOpacity>
            )}
            {['Scheduled', 'Confirmed', 'Rescheduled'].includes(resolvedApp.interview_status || '') && (
              <>
                <TouchableOpacity style={s.contractOutlineBtn} onPress={onReschedule}>
                  <Text style={s.contractOutlineBtnTxt}>Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.contractDangerOutlineBtn}
                  onPress={onCancel}
                  disabled={interviewActionLoading}
                >
                  {interviewActionLoading
                    ? <ActivityIndicator size="small" color={DANGER} />
                    : <Text style={s.contractDangerOutlineBtnTxt}>Cancel Interview</Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
