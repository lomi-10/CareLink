import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { fetchRenewalStatus, postRenewalIntent } from '@/lib/renewalApi';
import { NotificationModal } from '@/components/shared/NotificationModal';

type Props = {
  applicationId: number;
  jobPostId: number;
  /** Parent opens conversation with helper (`helper_id`) or helper with parent (`parent_id`). */
  messagesPartnerUserId: number;
  userType: 'parent' | 'helper';
  counterpartyName: string;
  jobTitle?: string;
  endedOn?: string | null;
  accentColor: string;
  softBg?: string;
  refreshToken?: number;
  onIntentSaved?: () => void;
};

function formatEnded(d?: string | null): string | null {
  if (!d) return null;
  try {
    const x = new Date(String(d).replace(/-/g, '/'));
    if (Number.isNaN(x.getTime())) return d;
    return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

function labelInterest(v: boolean | null | undefined): string {
  if (v === true) return 'Open to renewing';
  if (v === false) return 'Not renewing';
  return 'Has not answered yet';
}

export function PostPlacementRenewalCard({
  applicationId,
  jobPostId,
  messagesPartnerUserId,
  userType,
  counterpartyName,
  jobTitle,
  endedOn,
  accentColor,
  softBg,
  refreshToken = 0,
  onIntentSaved,
}: Props) {
  const router = useRouter();
  const bg = softBg ?? accentColor + '14';

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [parentInterested, setParentInterested] = useState<boolean | null>(null);
  const [helperInterested, setHelperInterested] = useState<boolean | null>(null);
  const [bothInterested, setBothInterested] = useState(false);
  const [inlineMsg, setInlineMsg] = useState<{ tone: 'muted' | 'error' | 'success'; text: string } | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    message: string;
    title?: string;
  }>({ visible: false, type: 'success', message: '' });
  const [editingChoices, setEditingChoices] = useState(false);

  const counterpartInterestLabel =
    userType === 'parent' ? 'Helper' : 'Employer';

  const myIntent = userType === 'parent' ? parentInterested : helperInterested;
  const showChoiceButtons = bothInterested ? false : myIntent === null || editingChoices;

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem('user_data');
    if (!raw) {
      setLoading(false);
      return;
    }
    const u = JSON.parse(raw) as { user_id?: string };
    const uid = Number(u.user_id);
    if (!uid || !applicationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchRenewalStatus(applicationId, uid, userType);
      if (res.success) {
        setParentInterested(res.parent_interested ?? null);
        setHelperInterested(res.helper_interested ?? null);
        setBothInterested(!!res.both_interested);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [applicationId, userType]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const styles = useMemo(() => createStyles(accentColor), [accentColor]);

  const saveIntent = async (interested: boolean) => {
    setInlineMsg(null);
    const raw = await AsyncStorage.getItem('user_data');
    if (!raw) {
      const msg = 'Please sign in again.';
      setToast({ visible: true, type: 'error', message: msg, title: 'Sign in' });
      setInlineMsg({ tone: 'error', text: msg });
      return;
    }
    const u = JSON.parse(raw) as { user_id?: string };
    const uid = Number(u.user_id);
    if (!uid) return;
    setBusy(true);
    try {
      const res = await postRenewalIntent({
        application_id: applicationId,
        user_id: uid,
        user_type: userType,
        interested,
      });
      if (!res.success) {
        const msg = res.message || 'Could not save.';
        setToast({ visible: true, type: 'error', message: msg, title: 'Renewal' });
        setInlineMsg({ tone: 'error', text: msg });
        return;
      }
      setParentInterested(res.parent_interested ?? null);
      setHelperInterested(res.helper_interested ?? null);
      setBothInterested(!!res.both_interested);
      const okMsg = res.both_interested
        ? 'You are both open to renewing — check Messages.'
        : interested
          ? 'Saved — the other party has been notified.'
          : 'Saved — you chose not to renew. You can change this anytime.';
      setToast({ visible: true, type: 'success', message: okMsg, title: 'Renewal' });
      setInlineMsg({ tone: 'success', text: okMsg });
      setEditingChoices(false);
      onIntentSaved?.();
    } finally {
      setBusy(false);
    }
  };

  const openMessages = () => {
    const pathname = userType === 'parent' ? '/(parent)/messages' : '/(helper)/messages';
    router.push({
      pathname: pathname as never,
      params: {
        partner_id: String(messagesPartnerUserId),
        partner_name: encodeURIComponent(counterpartyName),
        job_post_id: String(jobPostId),
      },
    } as never);
  };

  const cpInterest =
    userType === 'parent' ? helperInterested : parentInterested;

  return (
    <>
    <View style={[styles.card, { backgroundColor: bg, borderColor: accentColor + '44' }]}>
      <View style={styles.headRow}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '22' }]}>
          <Ionicons name="refresh-outline" size={22} color={accentColor} />
        </View>
        <View style={styles.headText}>
          <Text style={styles.title}>Contract ended · renewal</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {jobTitle ? `${jobTitle} · ` : ''}
            {counterpartyName}
            {formatEnded(endedOn) ? ` · ended ${formatEnded(endedOn)}` : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.meta}>
        {counterpartInterestLabel}:{' '}
        <Text style={styles.metaStrong}>{labelInterest(cpInterest)}</Text>
      </Text>

      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginVertical: 12 }} />
      ) : !bothInterested ? (
        <>
          {showChoiceButtons ? (
            <>
              <Text style={styles.prompt}>Would you like to extend or renew with them?</Text>
              <View style={styles.rowBtns}>
                <TouchableOpacity
                  style={[styles.choice, styles.choiceYes]}
                  onPress={() => void saveIntent(true)}
                  disabled={busy}
                  activeOpacity={0.88}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.choiceYesText}>Interested</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choice, styles.choiceNo]}
                  onPress={() => void saveIntent(false)}
                  disabled={busy}
                  activeOpacity={0.88}
                >
                  <Text style={styles.choiceNoText}>Not interested</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.answeredBox}>
              <Text style={styles.answeredLabel}>Your answer</Text>
              <Text style={styles.answeredValue}>
                {myIntent === true ? 'Open to renewing' : 'Not renewing'}
              </Text>
              <TouchableOpacity
                style={[styles.changeBtn, { borderColor: accentColor }]}
                onPress={() => {
                  setEditingChoices(true);
                  setInlineMsg(null);
                }}
                disabled={busy}
                activeOpacity={0.88}
              >
                <Text style={[styles.changeBtnText, { color: accentColor }]}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
          {inlineMsg ? (
            <Text
              style={[
                styles.feedback,
                inlineMsg.tone === 'error' && styles.feedbackErr,
                inlineMsg.tone === 'success' && styles.feedbackOk,
              ]}
            >
              {inlineMsg.text}
            </Text>
          ) : null}
        </>
      ) : null}

      {bothInterested ? (
        <View style={[styles.matchBanner, { borderColor: accentColor + '55' }]}>
          <Ionicons name="checkmark-circle" size={22} color={accentColor} />
          <Text style={[styles.matchText, { color: theme.color.ink }]}>
            {userType === 'parent'
              ? 'You both want to renew. Send a new employment contract from Messages.'
              : 'You both want to renew. Your employer will send a new contract — stay in touch in Messages.'}
          </Text>
        </View>
      ) : null}

      {bothInterested ? (
        <TouchableOpacity style={[styles.cta, { backgroundColor: accentColor }]} onPress={openMessages}>
          <Ionicons name="chatbubbles-outline" size={20} color="#fff" />
          <Text style={styles.ctaText}>
            {userType === 'parent' ? 'Open Messages · send renewal contract' : 'Open Messages'}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>
      ) : null}
    </View>
    <NotificationModal
      visible={toast.visible}
      type={toast.type}
      title={toast.title}
      message={toast.message}
      onClose={() => setToast((t) => ({ ...t, visible: false }))}
      autoClose
      duration={toast.type === 'error' ? 4200 : 2800}
    />
    </>
  );
}

function createStyles(accent: string) {
  return StyleSheet.create({
    card: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 14,
    },
    headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headText: { flex: 1, minWidth: 0 },
    title: { fontSize: 16, fontWeight: '800', color: theme.color.ink },
    sub: { fontSize: 13, color: theme.color.muted, marginTop: 4, lineHeight: 18 },
    meta: { fontSize: 13, color: theme.color.muted, marginTop: 12, lineHeight: 18 },
    metaStrong: { fontWeight: '700', color: theme.color.ink },
    prompt: { fontSize: 14, fontWeight: '600', color: theme.color.ink, marginTop: 10 },
    rowBtns: { flexDirection: 'row', gap: 10, marginTop: 10 },
    choice: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
    },
    choiceYes: { backgroundColor: accent },
    choiceYesText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    choiceNo: {
      backgroundColor: theme.color.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.color.line,
    },
    choiceNoText: { color: theme.color.ink, fontWeight: '700', fontSize: 14 },
    matchBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: theme.color.surfaceElevated,
    },
    matchText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 19 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: 12,
    },
    ctaText: { color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 },
    feedback: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 10,
      lineHeight: 18,
      color: theme.color.muted,
    },
    feedbackErr: { color: theme.color.danger },
    feedbackOk: { color: theme.color.success },
    answeredBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.color.line,
      backgroundColor: theme.color.surfaceElevated,
    },
    answeredLabel: { fontSize: 12, fontWeight: '700', color: theme.color.muted, textTransform: 'uppercase' },
    answeredValue: { fontSize: 15, fontWeight: '800', color: theme.color.ink, marginTop: 6 },
    changeBtn: {
      alignSelf: 'flex-start',
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1.5,
      backgroundColor: theme.color.surface,
    },
    changeBtnText: { fontSize: 13, fontWeight: '800' },
  });
}
