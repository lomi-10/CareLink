import AnimatedPressable from '@/components/shared/AnimatedPressable';
import FadeInView from '@/components/shared/FadeInView';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Platform, ActivityIndicator, Alert, FlatList, TextInput,
  KeyboardAvoidingView, ScrollView, TouchableOpacity, Image, useWindowDimensions,
  type ListRenderItemInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

export type CareBotAccent = 'parent' | 'helper';

const BOT_AVATAR = require('../../assets/images/chatbot_icon.png');

/** Warm accents per portal (CareBot keeps its own warm identity regardless of theme). */
const HELPER_ACCENT = '#E86019';
const PARENT_ACCENT = '#8B4A1F';

type ChatAction = { label: string; route: string };

type ChatLine = {
  id: string;
  text: string;
  createdAt: number;
  side: 'user' | 'bot';
  actions?: ChatAction[];
};

// ─── Keyword → screen redirects (quick-nav buttons under a reply) ──────────────
const HELPER_INTENTS: { keywords: string[]; label: string; route: string }[] = [
  { keywords: ['how to apply', 'apply', 'application form', 'find job', 'find work', 'browse job'], label: 'Find Jobs', route: '/(helper)/browse' },
  { keywords: ['my application', 'applied', 'application status'], label: 'My Applications', route: '/(helper)/applications' },
  { keywords: ['document', 'verify', 'verification', 'upload', 'clearance', 'valid id', 'tesda', 'rejected'], label: 'My Documents', route: '/(helper)/profile/documents' },
  { keywords: ['message', 'chat', 'inbox', 'conversation'], label: 'Messages', route: '/(helper)/messages' },
  { keywords: ['notification'], label: 'Notifications', route: '/(helper)/notifications' },
  { keywords: ['schedule', 'task', 'attendance', 'work hour'], label: 'Work Schedule', route: '/(helper)/work' },
  { keywords: ['saved job', 'bookmark'], label: 'Saved Jobs', route: '/(helper)/browse/saved_jobs' },
  { keywords: ['profile', 'account', 'bio'], label: 'My Profile', route: '/(helper)/profile' },
  { keywords: ['setting'], label: 'Settings', route: '/(helper)/settings' },
];

const PARENT_INTENTS: { keywords: string[]; label: string; route: string }[] = [
  { keywords: ['hire', 'find helper', 'browse helper', 'look for helper'], label: 'Find Helpers', route: '/(parent)/browse' },
  { keywords: ['post a job', 'create job', 'job post', 'job listing', 'how to post'], label: 'My Job Posts', route: '/(parent)/jobs' },
  { keywords: ['applicant', 'application', 'review'], label: 'Applications', route: '/(parent)/jobs' },
  { keywords: ['active helper', 'hired helper', 'my helper', 'work management', 'attendance', 'task'], label: 'Work Management', route: '/(parent)/hire' },
  { keywords: ['message', 'chat', 'inbox', 'conversation'], label: 'Messages', route: '/(parent)/messages' },
  { keywords: ['notification'], label: 'Notifications', route: '/(parent)/notifications' },
  { keywords: ['document', 'verify', 'verification', 'account'], label: 'My Profile', route: '/(parent)/profile' },
  { keywords: ['setting'], label: 'Settings', route: '/(parent)/settings' },
];

function matchIntentActions(userLine: string, accent: CareBotAccent): ChatAction[] {
  const t = userLine.toLowerCase();
  const intents = accent === 'helper' ? HELPER_INTENTS : PARENT_INTENTS;
  const matches: ChatAction[] = [];
  for (const intent of intents) {
    if (intent.keywords.some((k) => t.includes(k))) {
      if (!matches.some((m) => m.route === intent.route)) matches.push({ label: intent.label, route: intent.route });
      if (matches.length >= 2) break;
    }
  }
  return matches;
}

// ─── Local knowledge base ──────────────────────────────────────────────────────
// CareBot always tries the server (Gemini) first for a natural reply. If the
// server is unreachable, rate-limited, or not configured, we answer from this
// built-in guide instead of showing an error — so users always get help.
type KbEntry = { keys: string[]; roles?: CareBotAccent[]; answer: string };

const KB: KbEntry[] = [
  {
    keys: ['post a job', 'post job', 'create a job', 'job post', 'how to post', 'hiring'],
    roles: ['parent'],
    answer:
      'Posting a job is easy:\n1. Open the Jobs menu.\n2. Tap “Post a Job”.\n3. Fill in the duties, work schedule, and salary (at least ₱6,000/month or your regional Kasambahay minimum).\n4. Submit it for PESO verification.\n5. Once approved, PESO-verified helpers can see and apply to it.',
  },
  {
    keys: ['review applicant', 'applicants', 'who applied', 'shortlist', 'review'],
    roles: ['parent'],
    answer:
      'When helpers apply, open Jobs → your job → Applicants. Each applicant shows a match %, skills, experience, and PESO status. Tap a profile to view their documents, message them, or shortlist. When you’re ready, hire — CareLink generates a DOLE-compliant contract for both of you to sign.',
  },
  {
    keys: ['hire a helper', 'how do i hire', 'hire someone', 'hire'],
    roles: ['parent'],
    answer:
      'You can hire from a job’s applicant list, or invite a helper you found in Find Helpers. After you choose someone, CareLink creates a contract (duties, salary, rest day, benefits). Both parties sign it, and Work Mode unlocks task management, attendance, and salary tracking.',
  },
  {
    keys: ['contract', 'compliance', 'dole', 'sign'],
    answer:
      'Every CareLink placement uses a written contract based on the Kasambahay Law (R.A. 10361): the agreed salary, one paid rest day per week, 13th-month pay, and SSS/PhilHealth/Pag-IBIG coverage where the wage qualifies. Keep the signed contract — it protects both the employer and the helper.',
  },
  {
    keys: ['payment', 'benefit', 'salary', 'wage', '13th', 'sss', 'philhealth', 'pag-ibig', 'rest day', 'pay'],
    answer:
      'Under the Kasambahay Law, a household worker is entitled to: their agreed monthly salary, a 13th-month pay, at least one rest day each week, and SSS/PhilHealth/Pag-IBIG contributions once the wage threshold applies. CareLink records salary and attendance, but always pay on time and keep receipts.',
  },
  {
    keys: ['report', 'analytics', 'work management', 'track'],
    roles: ['parent'],
    answer:
      'From your dashboard, switch to Work Management to track active placements, task completion, and check-in/out logs for each hired helper. Placement History keeps a record of past hires, contracts, and reviews.',
  },
  {
    keys: ['account', 'verification', 'get verified', 'peso verif', 'verify my'],
    answer:
      'PESO verification confirms an account is legitimate. Complete your profile (details, address, and documents), then upload your Valid ID (front & back) and Barangay Clearance in Profile → Documents. CareBot scans them and PESO reviews — usually within 1–3 working days. Reaching about 90% profile strength means you’re ready for verification.',
  },
  {
    keys: ['upload', 'document', 'valid id', 'barangay', 'clearance', 'tesda'],
    answer:
      'Go to Profile → Documents. Upload your Valid ID (front and back as separate photos) and your Barangay Clearance. CareBot scans each one, then PESO verifies it. You can tap a document to see its scan result and status anytime.',
  },
  {
    keys: ['apply', 'find job', 'find work', 'application'],
    roles: ['helper'],
    answer:
      'To apply for a job:\n1. Tap Find Jobs.\n2. Open a job that fits you.\n3. Tap Apply.\n4. Write a short cover letter (or let CareBot draft one).\nTrack everything under My Applications.',
  },
  {
    keys: ['match', 'percentage', 'matching', 'why this'],
    answer:
      'The match % compares skills, work categories, location, salary expectation, and availability between a helper and a job. The more complete and accurate the profile, the better the matches — so fill in skills, experience, and preferred work setup.',
  },
  {
    keys: ['attendance', 'task', 'schedule', 'check in', 'check out', 'work mode', 'leave'],
    answer:
      'Once a hire is signed, Work Mode unlocks. Use Tasks for daily to-dos, check in/out for attendance, and Schedule to see work days and request leave. Salary and leave balances update from these records.',
  },
  {
    keys: ['message', 'chat', 'contact', 'talk to'],
    answer:
      'Open Messages to chat with the other party once you’ve applied, invited, or been hired. Keep conversations inside CareLink so there’s a clear record.',
  },
  {
    keys: ['support', 'help', 'complaint', 'report a problem', 'peso office', 'dispute'],
    answer:
      'For account or verification help, your local PESO office is the main contact — CareLink partners with them for verification and disputes. In the app you can also file a report from a helper’s or employer’s profile, or from an active placement; a CareLink super admin reviews it first and forwards serious cases to PESO.',
  },
  {
    keys: ['kasambahay', 'batas', 'ra 10361', 'r.a. 10361', 'law', 'rights'],
    answer:
      'The Kasambahay Law (R.A. 10361) sets the basic rights of domestic workers in the Philippines: a written contract, at least one paid rest day a week, 13th-month pay, and SSS/PhilHealth/Pag-IBIG coverage where the wage qualifies, plus clear rules on wages and termination. CareLink helps you document all of this — but it isn’t legal advice; consult a lawyer for your specific situation.',
  },
];

function carebotLocalAnswer(userLine: string, accent: CareBotAccent): string {
  const t = userLine.toLowerCase();
  // Prefer entries scoped to the current role, then shared entries.
  const scoped = KB.filter((e) => e.roles?.includes(accent));
  const shared = KB.filter((e) => !e.roles);
  for (const e of [...scoped, ...shared]) {
    if (e.keys.some((k) => t.includes(k))) return e.answer;
  }
  return accent === 'parent'
    ? 'Here’s the short version: in CareLink you post jobs and review PESO-verified helpers, hire with a Kasambahay-compliant contract, then manage tasks, attendance, and salary in Work Management. Ask me about posting a job, reviewing applicants, contracts, payments & benefits, or account verification.'
    : 'Here’s the short version: complete your profile and get PESO-verified, then browse jobs, apply, and once hired use Work Mode for tasks, attendance, and schedule. Ask me about applying, getting verified, your match %, or payments & rights.';
}

/** Server default CHATBOT_MAX_TURNS / CARELINK_CHATBOT_MAX_TURNS_DEFAULT (last N rows). */
const CAREBOT_MAX_HISTORY_MESSAGES = 6;

function mapLinesToContents(lines: ChatLine[]): { role: 'user' | 'model'; text: string }[] {
  const out: { role: 'user' | 'model'; text: string }[] = [];
  for (const m of lines) {
    const text = m.text.trim();
    if (!text) continue;
    out.push({ role: m.side === 'bot' ? 'model' : 'user', text });
  }
  return out.length > CAREBOT_MAX_HISTORY_MESSAGES ? out.slice(-CAREBOT_MAX_HISTORY_MESSAGES) : out;
}

// ─── Suggested topics (web sidebar + mobile chips) ─────────────────────────────
type Topic = { icon: keyof typeof Ionicons.glyphMap; label: string; question: string };
const PARENT_TOPICS: Topic[] = [
  { icon: 'briefcase-outline', label: 'How do I post a job?', question: 'How do I post a job?' },
  { icon: 'people-outline', label: 'How do I review applicants?', question: 'How do I review applicants?' },
  { icon: 'document-text-outline', label: 'Contract & Compliance', question: 'How do contracts and compliance work?' },
  { icon: 'wallet-outline', label: 'Payments & Benefits', question: 'What payments and benefits are required?' },
  { icon: 'bar-chart-outline', label: 'Reports & Analytics', question: 'Where can I see reports and analytics?' },
  { icon: 'shield-checkmark-outline', label: 'Account & Verification', question: 'How do I get PESO-verified?' },
];
const HELPER_TOPICS: Topic[] = [
  { icon: 'search-outline', label: 'How do I apply for a job?', question: 'How do I apply for a job?' },
  { icon: 'shield-checkmark-outline', label: 'Get PESO-verified', question: 'How do I get PESO-verified?' },
  { icon: 'document-text-outline', label: 'Upload my documents', question: 'How do I upload my documents?' },
  { icon: 'sparkles-outline', label: 'How does matching work?', question: 'How is my match percentage computed?' },
  { icon: 'calendar-outline', label: 'Tasks & attendance', question: 'How do tasks and attendance work?' },
  { icon: 'wallet-outline', label: 'Payments & rights', question: 'What are my payments and rights?' },
];

export type CareBotChatPanelProps = {
  sessionKey: number;
  showChrome?: boolean;
  onRequestClose?: () => void;
  accentRole?: CareBotAccent;
};

export function CareBotChatPanel({
  sessionKey,
  showChrome,
  onRequestClose,
  accentRole: accentProp,
}: CareBotChatPanelProps) {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [booting, setBooting] = useState(true);
  const [userId, setUserId] = useState(0);
  const [userName, setUserName] = useState('You');
  const [accent, setAccent] = useState<CareBotAccent>('parent');
  const linesRef = useRef<ChatLine[]>([]);
  const listRef = useRef<FlatList<ChatLine>>(null);
  const draftRef = useRef('');

  const { width: winW } = useWindowDimensions();
  const wide = Platform.OS === 'web' && winW >= 720;

  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { linesRef.current = lines; }, [lines]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) {
          const u = JSON.parse(raw) as {
            user_id: string; first_name?: string; full_name?: string;
            user_type?: string; user?: { user_type?: string };
          };
          const id = Number(u.user_id);
          if (Number.isFinite(id) && id > 0) {
            setUserId(id);
            setUserName((u.full_name || u.first_name || 'You') as string);
          }
          const t = (u.user_type || u.user?.user_type || 'parent').toLowerCase();
          if (!accentProp) setAccent(t === 'helper' ? 'helper' : 'parent');
        }
      } catch { /* ignore */ } finally { setBooting(false); }
    })();
  }, []);

  useEffect(() => { if (accentProp) setAccent(accentProp); }, [accentProp]);

  useEffect(() => {
    if (booting || userId < 1) return;
    setLines([
      {
        id: 'welcome',
        text: "Hi! I'm CareBot. I can help you with CareLink jobs, hiring, tasks, attendance, and Kasambahay Law basics.\n\nWhat would you like to know?",
        createdAt: Date.now(),
        side: 'bot',
      },
    ]);
    setDraft('');
  }, [booting, userId, sessionKey]);

  const router = useRouter();
  const accentColor = accent === 'helper' ? HELPER_ACCENT : PARENT_ACCENT;
  const topics = accent === 'helper' ? HELPER_TOPICS : PARENT_TOPICS;

  const goToAction = useCallback((route: string) => {
    onRequestClose?.();
    router.push(route as never);
  }, [onRequestClose, router]);

  const submitDraft = useCallback(async (textArg?: string) => {
    const trimmed = (textArg ?? draftRef.current).trim();
    if (!trimmed) return;
    if (userId < 1) {
      Alert.alert('CareBot', 'Please sign in to use the assistant.');
      return;
    }

    const userLine: ChatLine = { id: `u-${Date.now()}`, text: trimmed, createdAt: Date.now(), side: 'user' };
    const next = [...linesRef.current, userLine];
    setLines(next);
    setDraft('');
    setIsTyping(true);

    const transcript = mapLinesToContents(next);
    const intentActions = matchIntentActions(trimmed, accent);
    // Always available — used verbatim if the server can't produce a reply.
    const fallback = carebotLocalAnswer(trimmed, accent);

    const addBot = (text: string) => {
      const botLine: ChatLine = {
        id: `b-${Date.now()}`, text, createdAt: Date.now(), side: 'bot',
        actions: intentActions.length ? intentActions : undefined,
      };
      setLines((prev) => [...prev, botLine]);
    };

    try {
      const response = await fetch(`${API_URL}/chatbot_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: transcript, user_id: userId }),
      });
      const rawBody = await response.text();
      let data: { success?: boolean; reply?: string; message?: string; code?: string } = {};
      try { data = rawBody ? JSON.parse(rawBody) : {}; } catch { data = {}; }

      // Use the AI reply when we truly got one; otherwise fall back to the guide
      // (never surface a raw error — the user still gets a helpful answer).
      if (response.ok && data.success && typeof data.reply === 'string' && data.reply.trim()) {
        addBot(data.reply.trim());
      } else {
        addBot(fallback);
      }
    } catch {
      addBot(fallback);
    } finally {
      setIsTyping(false);
    }
  }, [userId, accent]);

  // ── Message bubble ──
  const renderItem = useCallback(({ item, index }: ListRenderItemInfo<ChatLine>) => {
    const mine = item.side === 'user';
    return (
      <FadeInView from="bottom" delay={Math.min(index, 6) * 60}>
        <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowBot]}>
          {!mine ? <Image source={BOT_AVATAR} style={styles.msgAvatar} /> : null}
          <View style={[styles.bubble, mine ? [styles.bubbleMine, { backgroundColor: accent === 'helper' ? '#FCE3D2' : '#F6E2CE' }] : styles.bubbleBot]}>
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
          </View>
        </View>
        {!mine && item.actions?.length ? (
          <View style={styles.actionsRow}>
            {item.actions.map((a) => (
              <AnimatedPressable
                key={a.route}
                style={[styles.actionChip, { borderColor: accentColor }]}
                onPress={() => goToAction(a.route)}
                accessibilityLabel={`Go to ${a.label}`}
              >
                <Ionicons name="arrow-forward-circle-outline" size={15} color={accentColor} />
                <Text style={[styles.actionChipText, { color: accentColor }]}>{a.label}</Text>
              </AnimatedPressable>
            ))}
          </View>
        ) : null}
      </FadeInView>
    );
  }, [accentColor, accent, goToAction]);

  // ── Header (brand bar) ──
  const header = (
    <View style={[styles.header, { backgroundColor: accentColor }]}>
      <Image source={BOT_AVATAR} style={styles.headerAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>CareBot</Text>
        <View style={styles.headerSubRow}>
          <Text style={styles.headerSub}>{wide ? 'Your AI assistant for CareLink' : 'AI Assistant'}</Text>
          {!wide ? (
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          ) : null}
        </View>
      </View>
      {onRequestClose ? (
        <AnimatedPressable onPress={onRequestClose} hitSlop={10} accessibilityLabel="Close CareBot" style={styles.headerBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </AnimatedPressable>
      ) : null}
    </View>
  );

  // ── Chat column (shared by web + mobile) ──
  const chatColumn = (
    <View style={styles.chatColumn}>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={lines}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      />
      {isTyping ? (
        <View style={styles.typingRow}>
          <Image source={BOT_AVATAR} style={styles.msgAvatar} />
          <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={styles.typingText}>CareBot is typing…</Text>
          </View>
        </View>
      ) : null}
      {/* Mobile suggested chips (web uses the sidebar instead). flexGrow:0 stops
          RN-Web from stretching this row to fill the column. */}
      {!wide && lines.length <= 2 && !isTyping ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {topics.map((tp) => (
            <TouchableOpacity key={tp.label} style={styles.chip} onPress={() => submitDraft(tp.question)} activeOpacity={0.85}>
              <Ionicons name={tp.icon} size={13} color={accentColor} />
              <Text style={[styles.chipText, { color: accentColor }]}>{tp.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={draft}
          onChangeText={setDraft}
          placeholder="Type your message…"
          placeholderTextColor={theme.color.muted}
          multiline
          maxLength={2000}
          editable={!isTyping}
          onSubmitEditing={() => void submitDraft()}
        />
        <AnimatedPressable
          style={[styles.sendBtn, { backgroundColor: accentColor }, (!draft.trim() || isTyping) && styles.sendBtnOff]}
          onPress={() => void submitDraft()}
          disabled={!draft.trim() || isTyping}
          accessibilityLabel="Send message"
        >
          <Ionicons name="send" size={20} color="#fff" />
        </AnimatedPressable>
      </View>
      <Text style={styles.disclaimer}>CareBot can make mistakes. Please verify important information.</Text>
    </View>
  );

  // ── Web sidebar (suggested topics + contact support) ──
  const sidebar = (
    <View style={styles.sidebar}>
      <Text style={styles.sidebarLabel}>SUGGESTED TOPICS</Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {topics.map((tp) => (
          <TouchableOpacity key={tp.label} style={styles.topicBtn} onPress={() => submitDraft(tp.question)} activeOpacity={0.85}>
            <View style={[styles.topicIcon, { backgroundColor: accent === 'helper' ? '#FCE9DC' : '#F4E7D6' }]}>
              <Ionicons name={tp.icon} size={17} color={accentColor} />
            </View>
            <Text style={styles.topicText} numberOfLines={2}>{tp.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.color.subtle} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.supportCard}>
        <Text style={styles.supportTitle}>Need human help?</Text>
        <Text style={styles.supportSub}>You can contact PESO support</Text>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => submitDraft('How do I contact PESO support or report a problem?')}
          activeOpacity={0.85}
        >
          <Ionicons name="headset-outline" size={16} color={accentColor} />
          <Text style={[styles.supportBtnText, { color: accentColor }]}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (showChrome ? 12 : 88) : 0}
    >
      {showChrome ? header : null}
      {booting ? (
        <View style={styles.booting}><ActivityIndicator size="large" color={accentColor} /></View>
      ) : userId < 1 ? (
        <View style={styles.signInHint}>
          <Text style={styles.signInTitle}>Please sign in first</Text>
          <Text style={styles.signInBody}>
            CareBot works when you’re logged in. Log in from the home screen, then open CareBot again.
          </Text>
        </View>
      ) : wide ? (
        <View style={styles.webBody}>
          {sidebar}
          <View style={styles.webDivider} />
          {chatColumn}
        </View>
      ) : (
        chatColumn
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF9', minHeight: 200 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 1 },
  headerSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.9)' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText: { fontSize: 11.5, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
  headerBtn: { padding: 4 },

  // Web two-column body
  webBody: { flex: 1, flexDirection: 'row' },
  webDivider: { width: 1, backgroundColor: '#EFE3D2' },
  sidebar: { width: 250, padding: 16, backgroundColor: '#FFFDF9' },
  sidebarLabel: { fontSize: 11, fontWeight: '800', color: theme.color.muted, letterSpacing: 1.2, marginBottom: 12 },
  topicBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#EFE3D2', backgroundColor: '#fff',
  },
  topicIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topicText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#3B2A18', lineHeight: 17 },
  supportCard: { marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: '#FBEFDF' },
  supportTitle: { fontSize: 14, fontWeight: '800', color: '#3B2A18' },
  supportSub: { fontSize: 12, color: theme.color.muted, marginTop: 2, marginBottom: 10 },
  supportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAD9C0',
  },
  supportBtnText: { fontSize: 13.5, fontWeight: '700' },

  // Chat
  chatColumn: { flex: 1, minHeight: 0, backgroundColor: '#FFFDF9' },
  list: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 6, gap: 4 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, maxWidth: '100%' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowBot: { justifyContent: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff' },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16 },
  bubbleBot: { backgroundColor: '#fff', borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#F0E4D3' },
  bubbleMine: { borderTopRightRadius: 4 },
  bubbleText: { fontSize: 14.5, lineHeight: 21, color: '#3B2A18' },
  bubbleTextMine: { color: '#5A3410' },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginLeft: 38 },
  actionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.4, backgroundColor: '#fff',
  },
  actionChipText: { fontSize: 12.5, fontWeight: '700' },

  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingBottom: 6 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13, color: theme.color.muted },

  chipScroll: { flexGrow: 0, flexShrink: 0, maxHeight: 52 },
  chipRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1.2, borderColor: '#EAD9C0', backgroundColor: '#fff',
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: '#F0E4D3', backgroundColor: '#FFFDF9', flexShrink: 0,
  },
  textInput: {
    flex: 1, maxHeight: 110, minHeight: 44, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    borderRadius: 22, borderWidth: 1, borderColor: '#EAD9C0', backgroundColor: '#fff',
    fontSize: 15, color: '#3B2A18',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.5 },
  disclaimer: { fontSize: 11, color: theme.color.subtle, textAlign: 'center', paddingBottom: 10, paddingTop: 2 },

  booting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  signInHint: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  signInTitle: { fontSize: 17, fontWeight: '800', color: '#3B2A18' },
  signInBody: { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 20 },
});
