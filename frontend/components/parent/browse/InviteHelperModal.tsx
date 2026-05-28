// components/parent/browse/InviteHelperModal.tsx
// Invite a helper to apply for a specific job post.

import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';
import type { HelperProfile } from '@/hooks/parent';

interface Job {
  job_post_id: string;
  title: string;
  salary_offered: number | string;
  status: string;
  category_name?: string;
}

interface Props {
  visible: boolean;
  helper: HelperProfile | null;
  jobs: Job[] | null;
  onClose: () => void;
  onSuccess?: (helperId: number, helperName: string, jobPostId: string) => void;
}

export function InviteHelperModal({ visible, helper, jobs, onClose, onSuccess }: Props) {
  const router = useRouter();
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJobId,  setSelectedJobId]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');
  const [sent,     setSent]     = useState(false);   // success state
  const [sentJobId, setSentJobId] = useState('');

  useEffect(() => {
    if (!visible) { setSent(false); setSelectedJobId(null); setError(''); return; }
    if (jobs && jobs.length > 0) {
      setAvailableJobs(jobs.filter(j => j.status === 'Open'));
    } else {
      fetchJobs();
    }
  }, [visible, jobs]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/get_posted_jobs.php?parent_id=${user.user_id}`);
      const data = await res.json();
      if (data.success) {
        setAvailableJobs((data.jobs ?? []).filter((j: Job) => j.status === 'Open'));
      } else throw new Error(data.message || 'Failed to load jobs');
    } catch (e: any) {
      setError(e.message || 'Failed to load job posts.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedJobId || !helper) return;
    setError('');
    setSending(true);
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) throw new Error('Not logged in');
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/parent/invite_helper.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ parent_id: user.user_id, helper_id: helper.user_id, job_post_id: selectedJobId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to send invitation');
      setSentJobId(selectedJobId);
      setSent(true);
      onSuccess?.(Number(helper.user_id), helper.full_name, selectedJobId);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleMessage = () => {
    onClose();
    router.push({
      pathname: '/(parent)/messages',
      params: {
        partner_id:   String(helper?.user_id),
        partner_name: encodeURIComponent(helper?.full_name ?? ''),
        job_post_id:  sentJobId,
      },
    } as any);
  };

  if (!helper) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerIcon}>
              <Ionicons name="paper-plane-outline" size={20} color={theme.color.parent} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.headerTitle}>Invite to Apply</Text>
              <Text style={s.headerSub} numberOfLines={1}>{helper.full_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={theme.color.muted} />
            </TouchableOpacity>
          </View>

          {/* ── Success state ── */}
          {sent ? (
            <View style={s.successBox}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={52} color={theme.color.success} />
              </View>
              <Text style={s.successTitle}>Invitation Sent!</Text>
              <Text style={s.successSub}>
                {helper.full_name} will receive a notification and can view your job in their messages.
              </Text>
              <TouchableOpacity style={s.msgNowBtn} onPress={handleMessage}>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color="#fff" />
                <Text style={s.msgNowBtnText}>Send a Message Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.laterBtn} onPress={onClose}>
                <Text style={s.laterBtnText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={s.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                <Text style={s.instrText}>
                  Select one of your open job posts to invite{' '}
                  <Text style={{ fontWeight: '700', color: theme.color.ink }}>{helper.full_name}</Text>{' '}
                  to apply.
                </Text>

                {loading && (
                  <View style={s.loadingBox}>
                    <ActivityIndicator color={theme.color.parent} />
                    <Text style={s.loadingTxt}>Loading your jobs…</Text>
                  </View>
                )}

                {!loading && availableJobs.length === 0 && (
                  <View style={s.emptyBox}>
                    <Ionicons name="briefcase-outline" size={44} color={theme.color.subtle} />
                    <Text style={s.emptyTitle}>No Open Jobs</Text>
                    <Text style={s.emptySub}>Post an open job first to invite helpers.</Text>
                  </View>
                )}

                {!loading && availableJobs.map(j => (
                  <TouchableOpacity
                    key={j.job_post_id}
                    style={[s.jobCard, selectedJobId === j.job_post_id && s.jobCardSelected]}
                    onPress={() => setSelectedJobId(j.job_post_id)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      {j.category_name && (
                        <Text style={s.jobCat}>{j.category_name}</Text>
                      )}
                      <Text style={s.jobTitle} numberOfLines={1}>{j.title}</Text>
                      <Text style={s.jobSalary}>₱{Number(j.salary_offered).toLocaleString()} / mo</Text>
                    </View>
                    {selectedJobId === j.job_post_id && (
                      <Ionicons name="checkmark-circle" size={22} color={theme.color.parent} />
                    )}
                  </TouchableOpacity>
                ))}

                {error ? <Text style={s.errorTxt}>{error}</Text> : null}
              </ScrollView>

              <View style={s.footer}>
                <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.sendBtn, (!selectedJobId || sending) && s.sendBtnDisabled]}
                  onPress={handleSend}
                  disabled={!selectedJobId || sending}
                >
                  {sending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <>
                        <Ionicons name="paper-plane" size={16} color="#fff" />
                        <Text style={s.sendBtnText}>Send Invite</Text>
                      </>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 24 : 16,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
      },
    }),
  },

  // Header
  header:     { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  headerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.color.parentSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle:{ fontSize: 16, fontWeight: '800', color: theme.color.ink },
  headerSub:  { fontSize: 12, color: theme.color.muted, marginTop: 1 },

  // Body
  body:       { padding: 18, maxHeight: 380 },
  instrText:  { fontSize: 14, color: theme.color.muted, marginBottom: 16, lineHeight: 20 },

  // Loading / empty
  loadingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 24, justifyContent: 'center' },
  loadingTxt: { fontSize: 13, color: theme.color.muted },
  emptyBox:   { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.color.ink, marginTop: 12 },
  emptySub:   { fontSize: 13, color: theme.color.muted, marginTop: 4, textAlign: 'center' },

  // Job card
  jobCard:         { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 12, marginBottom: 10 },
  jobCardSelected: { borderColor: theme.color.parent, backgroundColor: theme.color.parentSoft },
  jobCat:          { fontSize: 11, fontWeight: '700', color: theme.color.parent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  jobTitle:        { fontSize: 14, fontWeight: '700', color: theme.color.ink, marginBottom: 2 },
  jobSalary:       { fontSize: 13, color: theme.color.muted },

  // Error
  errorTxt:   { color: theme.color.danger, fontSize: 13, marginTop: 8 },

  // Footer
  footer:     { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.color.line },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: theme.color.line, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: theme.color.muted },
  sendBtn:    { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: theme.color.parent },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Success state
  successBox:   { alignItems: 'center', padding: 28, paddingTop: 20 },
  successIcon:  { marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '800', color: theme.color.ink, marginBottom: 8 },
  successSub:   { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  msgNowBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingVertical: 13, paddingHorizontal: 28, borderRadius: 12, marginBottom: 10 },
  msgNowBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  laterBtn:     { paddingVertical: 8, paddingHorizontal: 16 },
  laterBtnText: { fontSize: 13, color: theme.color.muted, fontWeight: '600' },
});
