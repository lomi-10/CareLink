// app/(parent)/messages/ContractTab.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MUTED, DANGER } from '@/components/parent/home/parentWarmTheme';
import { s } from './messages.styles';
import { fmtDate, ResolvedApplication } from './helpers';
import { ContractRow } from './components';

export default function ContractTab({
  resolvedApp, hiringAction, onReviewContract, onEditTerms, onHire, onReject, onAgree,
}: {
  resolvedApp: ResolvedApplication | null;
  hiringAction: boolean;
  onReviewContract: () => void | Promise<void>;
  onEditTerms: () => void | Promise<void>;
  onHire: () => void | Promise<void>;
  onReject: () => void;
  onAgree: () => void;
}) {
  return (
    <ScrollView style={s.contractTabBody} contentContainerStyle={{ paddingBottom: 24 }}>
      {!resolvedApp ? (
        <View style={s.contractEmptyState}>
          <View style={s.contractEmptyIconWrap}>
            <Ionicons name="document-text-outline" size={32} color={MUTED} />
          </View>
          <Text style={s.contractEmptyTitle}>No contract yet</Text>
          <Text style={s.contractEmptySub}>No application linked to this conversation yet.</Text>
        </View>
      ) : ['Rejected', 'Withdrawn', 'auto_rejected'].includes(resolvedApp.status) ? (
        <View style={s.contractEmptyState}>
          <View style={s.contractEmptyIconWrap}>
            <Ionicons name="document-text-outline" size={32} color={MUTED} />
          </View>
          <Text style={s.contractEmptyTitle}>No contract</Text>
          <Text style={s.contractEmptySub}>This application is {resolvedApp.status.toLowerCase()}.</Text>
        </View>
      ) : resolvedApp.status === 'contract_pending' ? (
        <>
          <View style={s.contractHeaderRow}>
            <Text style={s.contractHeaderTitle}>Employment Contract</Text>
            <View style={[s.statusPill, s.statusPillAmber]}>
              <Text style={s.statusPillTxt}>
                {resolvedApp.helper_decline_reason ? 'Changes Requested' : 'Pending Agreement'}
              </Text>
            </View>
          </View>

          {resolvedApp.helper_decline_reason && (
            <View style={s.contractDeclineBanner}>
              <Ionicons name="alert-circle" size={18} color={DANGER} />
              <View style={{ flex: 1 }}>
                <Text style={s.contractDeclineBannerTitle}>Helper requested changes</Text>
                <Text style={s.contractDeclineBannerText}>{resolvedApp.helper_decline_reason}</Text>
              </View>
            </View>
          )}

          <View style={s.contractSummaryCard}>
            <ContractRow label="Position" value={resolvedApp.category_name || resolvedApp.job_title} />
            {resolvedApp.skill_names && resolvedApp.skill_names.length > 0 && (
              <ContractRow label="Skills" value={resolvedApp.skill_names.join(', ')} />
            )}
            <ContractRow
              label="Salary"
              value={resolvedApp.confirmed_salary != null ? `₱${resolvedApp.confirmed_salary.toLocaleString()} / month` : '—'}
            />
            <ContractRow label="Work Hours" value={resolvedApp.work_hours || '—'} />
            <ContractRow
              label="Rest Day"
              value={resolvedApp.rest_days && resolvedApp.rest_days.length > 0 ? resolvedApp.rest_days.join(', ') : '—'}
            />
            <ContractRow label="Duration" value={resolvedApp.contract_duration || 'Indefinite'} />
            <ContractRow label="Start Date" value={fmtDate(resolvedApp.employment_start_date)} />
            {resolvedApp.employment_end_date && (
              <ContractRow label="End Date" value={fmtDate(resolvedApp.employment_end_date)} />
            )}
            <ContractRow label="Payment Schedule" value={resolvedApp.payment_schedule || '—'} />
            {resolvedApp.other_benefits && (
              <ContractRow label="Other Benefits" value={resolvedApp.other_benefits} />
            )}
            {resolvedApp.contract_generated_at && (
              <ContractRow label="Generated On" value={fmtDate(resolvedApp.contract_generated_at)} />
            )}
          </View>

          <Text style={s.contractSignStatus}>
            Employer: {resolvedApp.employer_signed_at ? 'Signed' : 'Not signed'} · Helper: {resolvedApp.helper_signed_at ? 'Signed' : 'Not signed'}
          </Text>

          <View style={s.contractActionBtnsCol}>
            <TouchableOpacity style={s.contractOutlineBtn} onPress={() => { void onReviewContract(); }}>
              <Text style={s.contractOutlineBtnTxt}>Review Contract</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.contractOutlineBtn}
              onPress={() => { void onEditTerms(); }}
              disabled={hiringAction}
            >
              <Text style={s.contractOutlineBtnTxt}>Edit Terms</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.contractPrimaryBtn, (!!resolvedApp.employer_signed_at || hiringAction) && s.contractPrimaryBtnDisabled]}
              onPress={onAgree}
              disabled={!!resolvedApp.employer_signed_at || hiringAction}
            >
              {hiringAction
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.contractPrimaryBtnTxt}>I Agree</Text>
              }
            </TouchableOpacity>
          </View>
        </>
      ) : resolvedApp.status === 'hired' || resolvedApp.status === 'Accepted' ? (
        <>
          <View style={s.contractHeaderRow}>
            <Text style={s.contractHeaderTitle}>Employment Contract</Text>
            <View style={[s.statusPill, s.statusPillGreen]}>
              <Text style={s.statusPillTxt}>Contract Signed</Text>
            </View>
          </View>

          <View style={s.contractSummaryCard}>
            <ContractRow label="Position" value={resolvedApp.category_name || resolvedApp.job_title} />
            {resolvedApp.skill_names && resolvedApp.skill_names.length > 0 && (
              <ContractRow label="Skills" value={resolvedApp.skill_names.join(', ')} />
            )}
            <ContractRow
              label="Salary"
              value={resolvedApp.confirmed_salary != null ? `₱${resolvedApp.confirmed_salary.toLocaleString()} / month` : '—'}
            />
            <ContractRow label="Work Hours" value={resolvedApp.work_hours || '—'} />
            <ContractRow
              label="Rest Day"
              value={resolvedApp.rest_days && resolvedApp.rest_days.length > 0 ? resolvedApp.rest_days.join(', ') : '—'}
            />
            <ContractRow label="Duration" value={resolvedApp.contract_duration || 'Indefinite'} />
            <ContractRow label="Start Date" value={fmtDate(resolvedApp.employment_start_date)} />
            {resolvedApp.employment_end_date && (
              <ContractRow label="End Date" value={fmtDate(resolvedApp.employment_end_date)} />
            )}
            <ContractRow label="Payment Schedule" value={resolvedApp.payment_schedule || '—'} />
            {resolvedApp.other_benefits && (
              <ContractRow label="Other Benefits" value={resolvedApp.other_benefits} />
            )}
            {resolvedApp.contract_generated_at && (
              <ContractRow label="Generated On" value={fmtDate(resolvedApp.contract_generated_at)} />
            )}
          </View>

          <Text style={s.contractSignStatus}>
            Employer signed {fmtDate(resolvedApp.employer_signed_at)} · Helper signed {fmtDate(resolvedApp.helper_signed_at)}
          </Text>

          <View style={s.contractActionBtnsCol}>
            <TouchableOpacity style={s.contractPrimaryBtn} onPress={() => { void onReviewContract(); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={s.contractPrimaryBtnTxt}>Download Contract</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={s.contractEmptyState}>
          <View style={s.contractEmptyIconWrap}>
            <Ionicons name="document-text-outline" size={32} color={MUTED} />
          </View>
          <Text style={s.contractEmptyTitle}>No contract yet</Text>
          <Text style={s.contractEmptySub}>Application status: {resolvedApp.status}</Text>
          <View style={s.contractEmptyBtns}>
            <TouchableOpacity style={s.contractOutlineBtn} onPress={onReject}>
              <Text style={s.appActionRejectTxt}>Reject Application</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.contractPrimaryBtn, hiringAction && s.contractPrimaryBtnDisabled]}
              onPress={() => { void onHire(); }}
              disabled={hiringAction}
            >
              {hiringAction
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.contractPrimaryBtnTxt}>Hire Helper</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
