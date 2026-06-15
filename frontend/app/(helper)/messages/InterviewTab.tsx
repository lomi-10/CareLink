// app/(helper)/messages/InterviewTab.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ORANGE, GREEN, DANGER } from './messages.styles';
import { useMessagesAppearance } from './messagesAppearance';
import { fmtLongDate, fullTime, interviewPillStyle, ResolvedApplication } from './helpers';
import { ContractRow } from './components';

export default function InterviewTab({
  resolvedApp, partnerName, interviewActionLoading, onPropose, onConfirm, onDecline, onCancel,
}: {
  resolvedApp: ResolvedApplication | null;
  partnerName: string;
  interviewActionLoading: boolean;
  onPropose: () => void;
  onConfirm: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { s } = useMessagesAppearance();

  return (
    <ScrollView style={s.contractTabBody} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={s.contractHeaderRow}>
        <Text style={s.contractHeaderTitle}>Interview Schedule</Text>
        <View style={[s.statusPill, resolvedApp?.interview_id ? interviewPillStyle(s, resolvedApp.interview_status) : s.statusPillGray]}>
          <Text style={s.statusPillTxt}>{resolvedApp?.interview_id ? (resolvedApp.interview_status || 'Scheduled') : 'None'}</Text>
        </View>
      </View>

      {!resolvedApp?.interview_id ? (
        <View style={s.contractEmptyState}>
          <View style={s.contractEmptyIconWrap}>
            <Ionicons name="calendar-outline" size={36} color={ORANGE} />
          </View>
          <Text style={s.contractEmptyTitle}>No interview scheduled</Text>
          <Text style={s.contractEmptySub}>Propose a time to meet {partnerName} for an interview.</Text>
          <View style={s.contractEmptyBtns}>
            <TouchableOpacity style={s.contractPrimaryBtn} onPress={onPropose}>
              <Text style={s.contractPrimaryBtnTxt}>Propose Interview Time</Text>
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
            <ContractRow label="Your Confirmation" value={resolvedApp.helper_confirmed ? 'Yes' : 'Pending'} />
          </View>
          <View style={s.contractActionBtnsCol}>
            {resolvedApp.interview_status === 'Scheduled' && !resolvedApp.helper_confirmed && (
              <>
                <TouchableOpacity
                  style={[s.contractPrimaryBtn, { backgroundColor: GREEN }]}
                  onPress={() => { void onConfirm(); }}
                  disabled={interviewActionLoading}
                >
                  {interviewActionLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.contractPrimaryBtnTxt}>Confirm</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.contractDangerOutlineBtn}
                  onPress={() => { void onDecline(); }}
                  disabled={interviewActionLoading}
                >
                  {interviewActionLoading ? <ActivityIndicator color={DANGER} size="small" /> : <Text style={s.contractDangerOutlineBtnTxt}>Decline</Text>}
                </TouchableOpacity>
              </>
            )}
            {resolvedApp.interview_type === 'Video Call' && ['Scheduled', 'Confirmed'].includes(resolvedApp.interview_status ?? '') && resolvedApp.location_or_link && (
              <TouchableOpacity style={[s.contractPrimaryBtn, { backgroundColor: GREEN }]} onPress={() => Linking.openURL(resolvedApp.location_or_link!)}>
                <Text style={s.contractPrimaryBtnTxt}>Join Interview</Text>
              </TouchableOpacity>
            )}
            {['Scheduled', 'Confirmed', 'Rescheduled'].includes(resolvedApp.interview_status ?? '') && (
              <TouchableOpacity
                style={s.contractDangerOutlineBtn}
                onPress={onCancel}
                disabled={interviewActionLoading}
              >
                {interviewActionLoading ? <ActivityIndicator color={DANGER} size="small" /> : <Text style={s.contractDangerOutlineBtnTxt}>Cancel Interview</Text>}
              </TouchableOpacity>
            )}
            {resolvedApp.interview_status === 'Cancelled' && (
              <TouchableOpacity style={s.contractOutlineBtn} onPress={onPropose}>
                <Text style={s.contractOutlineBtnTxt}>Propose New Time</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
