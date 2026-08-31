// components/shared/FeedbackScreen.tsx
// The persistent "System Evaluation" screen (as opposed to FeedbackModal, the
// short end-of-demo popup). One submission isn't a single event here — each
// QUESTION is tracked separately per account, so:
//   - a user answers everything once, ever
//   - if new questions are added later, a returning user sees only those
//   - once truly nothing is left, the screen says so plainly and offers a
//     real way to still be heard (CareBot or messaging support) instead of
//     just being a dead end
//
// Shared by both portals and both platforms (mobile + web) — role-specific
// chrome (top nav / tab bar) is the caller's job; this is just the content.

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, useWindowDimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FontFamily } from '@/constants/GlobalStyles';
import API_URL from '@/constants/api';
import { useFeedback, type FeedbackAnswerDraft } from '@/hooks/shared/useFeedback';
import { useCareBotOptional } from '@/contexts/CareBotContext';

export function FeedbackScreen({
  role, accent, messagesRoute,
}: {
  role: 'helper' | 'parent';
  accent: string;
  /** This portal's Messages route, e.g. '/(parent)/messages' — used by "Message Support". */
  messagesRoute: string;
}) {
  const router = useRouter();
  const careBot = useCareBotOptional();
  const { loading, questions, answeredCount, totalCount, submitting, error, submit, refresh } = useFeedback(role);
  const [draft, setDraft] = useState<Record<number, number | string>>({});
  const [done, setDone] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const answeredHere = useMemo(
    () => questions.filter((q) => (q.question_type === 'rating' ? typeof draft[q.question_id] === 'number' : String(draft[q.question_id] ?? '').trim() !== '')).length,
    [questions, draft],
  );

  const handleSubmit = async () => {
    const answers: FeedbackAnswerDraft[] = questions.map((q) => {
      const v = draft[q.question_id];
      return q.question_type === 'rating'
        ? { question_id: q.question_id, rating_value: typeof v === 'number' ? v : undefined }
        : { question_id: q.question_id, text_value: typeof v === 'string' ? v : undefined };
    }).filter((a) => a.rating_value != null || (a.text_value ?? '').trim() !== '');

    if (answers.length === 0) return;
    const ok = await submit(answers);
    if (ok) setDone(true);
  };

  const messageSupport = async () => {
    setContactBusy(true);
    try {
      const res = await fetch(`${API_URL}/shared/get_support_contact.php`);
      const data = await res.json();
      if (data.success && data.admin) {
        router.push({ pathname: messagesRoute, params: { partner_id: String(data.admin.user_id) } } as never);
      }
    } finally {
      setContactBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  // ── Thank-you ──
  if (done) {
    return (
      <View style={[s.wrap, wide && s.wrapWide]}>
        <View style={[s.card, wide && s.cardWide, s.centerCard]}>
          <View style={[s.iconWrap, { backgroundColor: accent + '18' }]}>
            <Ionicons name="checkmark-circle" size={40} color={accent} />
          </View>
          <Text style={s.title}>Thank you!</Text>
          <Text style={s.body}>Your answers help make CareLink better for everyone.</Text>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: accent }]} onPress={() => router.back()} activeOpacity={0.88}>
            <Text style={s.primaryText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Could not load ──
  //
  // This MUST come before the "nothing left to answer" branch below. Both end up
  // with questions.length === 0, so ordering them the other way rendered every
  // load failure — expired session, network drop, a bad response — as
  // "You're all caught up!", which tells the user the opposite of the truth and
  // hides the problem from testing. Reported during UAT prep.
  if (error) {
    return (
      <View style={[s.wrap, wide && s.wrapWide]}>
        <View style={[s.card, wide && s.cardWide, s.centerCard]}>
          <View style={[s.iconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle" size={40} color="#DC2626" />
          </View>
          <Text style={s.title}>Couldn't load the questions</Text>
          <Text style={s.body}>{error}</Text>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: accent }]}
            onPress={() => refresh()}
            activeOpacity={0.88}
          >
            <Ionicons name="refresh" size={17} color="#fff" />
            <Text style={s.primaryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Nothing left to answer ──
  if (questions.length === 0) {
    return (
      <View style={[s.wrap, wide && s.wrapWide]}>
        <View style={[s.card, wide && s.cardWide, s.centerCard]}>
          <View style={[s.iconWrap, { backgroundColor: accent + '18' }]}>
            <Ionicons name="checkmark-done-circle" size={40} color={accent} />
          </View>
          <Text style={s.title}>You're all caught up!</Text>
          <Text style={s.body}>
            No questions available right now — you've answered everything we have.{'\n'}Any concerns in the meantime?
          </Text>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: accent }]}
            onPress={() => careBot?.open()}
            activeOpacity={0.88}
          >
            <Ionicons name="sparkles" size={17} color="#fff" />
            <Text style={s.primaryText}>Ask CareBot</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: accent }]}
            onPress={messageSupport}
            disabled={contactBusy}
            activeOpacity={0.85}
          >
            {contactBusy ? <ActivityIndicator color={accent} /> : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={17} color={accent} />
                <Text style={[s.secondaryText, { color: accent }]}>Message Support</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Question form ──
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[s.wrap, wide && s.wrapWide, { paddingBottom: 60 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.card, wide && s.cardWide]}>
        <Text style={s.formTitle}>System Evaluation</Text>
        <Text style={s.formSub}>
          {answeredCount > 0
            ? `You've answered ${answeredCount} of ${totalCount} so far — here are the rest.`
            : 'Rate each statement from 1 (strongly disagree) to 5 (strongly agree). Honest answers help most — including the critical ones.'}
        </Text>

        <View style={s.progressTrack}>
          <View style={[s.progressFill, { backgroundColor: accent, width: `${totalCount ? ((answeredCount + answeredHere) / totalCount) * 100 : 0}%` }]} />
        </View>
        <Text style={s.progressLabel}>{answeredCount + answeredHere} of {totalCount} answered</Text>

        {questions.map((q, i) => (
          <View key={q.question_id} style={s.qBlock}>
            <Text style={s.qLabel}>{i + 1}. {q.question_text}</Text>
            {q.question_type === 'rating' ? (
              <View style={s.scaleRow}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = draft[q.question_id] === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[s.scaleDot, on && { backgroundColor: accent, borderColor: accent }]}
                      onPress={() => setDraft((d) => ({ ...d, [q.question_id]: n }))}
                      accessibilityLabel={`${q.question_text}: ${n} of 5`}
                    >
                      <Text style={[s.scaleDotText, on && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <TextInput
                style={s.textInput}
                value={typeof draft[q.question_id] === 'string' ? (draft[q.question_id] as string) : ''}
                onChangeText={(v) => setDraft((d) => ({ ...d, [q.question_id]: v }))}
                placeholder="Type your answer…"
                placeholderTextColor="#B8956A"
                multiline
              />
            )}
          </View>
        ))}

        {!!error && <Text style={s.error}>{error}</Text>}

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: accent }, (submitting || answeredHere === 0) && { opacity: 0.55 }]}
          onPress={handleSubmit}
          disabled={submitting || answeredHere === 0}
          activeOpacity={0.88}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Submit Feedback</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexGrow: 1, padding: 16 },
  wrapWide: { alignItems: 'center', padding: 32 },
  card: { backgroundColor: '#FFFDF9', borderRadius: 20, padding: 22 },
  cardWide: { width: '100%', maxWidth: 640 },
  centerCard: { alignItems: 'center', marginTop: 40 },

  iconWrap: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: '#2A1608', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: '#7A5C3E', textAlign: 'center', lineHeight: 21, marginBottom: 20 },

  formTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 21, color: '#2A1608' },
  formSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: '#9A7B5A', marginTop: 4, marginBottom: 16, lineHeight: 19 },

  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#F0E2CF', overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: '#B8956A', marginBottom: 18 },

  qBlock: { marginBottom: 20 },
  qLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: '#2A1608', marginBottom: 10, lineHeight: 20 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  scaleDot: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#EDE0D0',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  scaleDotText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#7A5C3E' },
  textInput: {
    borderWidth: 1.5, borderColor: '#EDE0D0', borderRadius: 12, padding: 12,
    fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: '#2A1608',
    minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff',
    ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }),
  },

  error: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#DC2626', marginBottom: 12, textAlign: 'center' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', paddingVertical: 15, borderRadius: 14, marginTop: 6,
  },
  primaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', paddingVertical: 14, borderRadius: 14, marginTop: 10, borderWidth: 1.5,
  },
  secondaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5 },
});
