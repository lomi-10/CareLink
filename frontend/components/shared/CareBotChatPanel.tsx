import AnimatedPressable from '@/components/shared/AnimatedPressable';
import FadeInView from '@/components/shared/FadeInView';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Alert, FlatList, TextInput, KeyboardAvoidingView, type TextStyle, type ListRenderItemInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

export type CareBotAccent = 'parent' | 'helper';

/** Warm orange accent for the helper portal — matches the helper portal's warm theme
 *  (overrides the green `theme.color.helper` locally, without touching the global constant). */
const HELPER_ACCENT = '#E86019';

type ChatAction = {
  label: string;
  route: string;
};

type ChatLine = {
  id: string;
  text: string;
  createdAt: number;
  side: 'user' | 'bot';
  actions?: ChatAction[];
};

/** Keyword → screen redirects, like a website chatbot suggesting where to go next.
 *  Matched against the user's message; the first 1-2 hits become quick-nav buttons on the reply. */
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
  { keywords: ['applicant', 'application'], label: 'Applications', route: '/(parent)/jobs' },
  { keywords: ['active helper', 'hired helper', 'my helper'], label: 'Active Helpers', route: '/(parent)/hire' },
  { keywords: ['message', 'chat', 'inbox', 'conversation'], label: 'Messages', route: '/(parent)/messages' },
  { keywords: ['notification'], label: 'Notifications', route: '/(parent)/notifications' },
  { keywords: ['profile', 'account'], label: 'My Profile', route: '/(parent)/profile' },
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

function appendLines(prev: ChatLine[], more: ChatLine[]): ChatLine[] {
  return [...prev, ...more];
}

/** Short tips when the server reports no key / not configured — never implies every failure is “missing key”. */
function offlineCarebotReply(userLine: string): string {
  const t = userLine.toLowerCase();
  if (t.includes('kasambahay') || t.includes('batas') || t.includes('law'))
    return (
      'R.A. 10361 (Kasambahay Law) sets basic rights for domestic workers in the Philippines: written contract, ' +
      'paid rest days, Social Security / PhilHealth where applicable, and clear rules on wages and termination. ' +
      'CareLink helps you document hiring and day-to-day work, but it is not legal advice — ask a lawyer for your situation.'
    );
  if (t.includes('hire') || t.includes('helper') || t.includes('apply'))
    return (
      'In CareLink, parents post jobs and review helpers; helpers browse and apply. After hire, use placement tools ' +
      'for attendance and tasks. Keep personal contact and payments safe and follow your contract.'
    );
  if (t.includes('key') || t.includes('api') || t.includes('github'))
    return (
      'Never put secret API keys in the mobile app or in GitHub. CareBot’s key belongs only on your own server ' +
      '(see your project’s server setup notes for administrators).'
    );
  return (
    'CareBot is not fully set up on the server yet, or the server refused the request. ' +
    'You can still ask about hiring, Kasambahay Law, or CareLink in plain English for short general tips.'
  );
}

function networkFallbackReply(userLine: string, hint: string): string {
  const tip = offlineCarebotReply(userLine);
  return `${hint}\n\n${tip}`;
}

/** Must match server default CHATBOT_MAX_TURNS / CARELINK_CHATBOT_MAX_TURNS_DEFAULT (last N chat rows). */
const CAREBOT_MAX_HISTORY_MESSAGES = 6;

function mapLinesToContents(lines: ChatLine[]): { role: 'user' | 'model'; text: string }[] {
  const out: { role: 'user' | 'model'; text: string }[] = [];
  for (const m of lines) {
    const text = m.text.trim();
    if (!text) continue;
    out.push({ role: m.side === 'bot' ? 'model' : 'user', text });
  }
  if (out.length > CAREBOT_MAX_HISTORY_MESSAGES) {
    return out.slice(-CAREBOT_MAX_HISTORY_MESSAGES);
  }
  return out;
}

function isNotConfiguredPayload(
  data: { success?: boolean; code?: string; message?: string },
  rawText: string,
): boolean {
  const raw = `${data.message ?? ''} ${rawText}`.toLowerCase();
  return (
    data.code === 'not_configured' ||
    /not configured|no api key|api key not set|assistant.*not.*set up|server environment only/i.test(raw)
  );
}

/** Hide vendor/provider names in any upstream error shown in the chat UI. */
function sanitizeUserFacingAssistantError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('gemini') ||
    lower.includes('generativelanguage') ||
    lower.includes('google') && (lower.includes('api') || lower.includes('quota') || lower.includes('ai'))
  ) {
    return 'CareBot could not finish that reply right now. Please try again in a moment.';
  }
  return raw;
}

export type CareBotChatPanelProps = {
  /** Change when opening a fresh session (e.g. context sessionKey). */
  sessionKey: number;
  /** Optional header with close (modal). */
  showChrome?: boolean;
  onRequestClose?: () => void;
  /** If omitted, accent is inferred from `user_data` once loaded. */
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

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem('user_data');
        if (raw) {
          const u = JSON.parse(raw) as {
            user_id: string;
            first_name?: string;
            full_name?: string;
            user_type?: string;
            user?: { user_type?: string };
          };
          const id = Number(u.user_id);
          if (Number.isFinite(id) && id > 0) {
            setUserId(id);
            setUserName((u.full_name || u.first_name || 'You') as string);
          }
          const t = (u.user_type || u.user?.user_type || 'parent').toLowerCase();
          if (!accentProp) {
            setAccent(t === 'helper' ? 'helper' : 'parent');
          }
        }
      } catch {
        /* ignore */
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (accentProp) setAccent(accentProp);
  }, [accentProp]);

  useEffect(() => {
    if (booting || userId < 1) return;
    setLines([
      {
        id: 'welcome',
        text: "Hi — I'm CareBot. I can walk you through CareLink (jobs, hiring, tasks, attendance) and Kasambahay Law basics. What would you like to know?",
        createdAt: Date.now(),
        side: 'bot',
      },
    ]);
    setDraft('');
  }, [booting, userId, sessionKey]);

  const router = useRouter();
  const accentColor = accent === 'helper' ? HELPER_ACCENT : theme.color.parent;

  const goToAction = useCallback(
    (route: string) => {
      onRequestClose?.();
      router.push(route as never);
    },
    [onRequestClose, router],
  );

  const submitDraft = useCallback(async () => {
    const trimmed = draftRef.current.trim();
    if (!trimmed) return;
    if (userId < 1) {
      Alert.alert('CareBot', 'Please sign in to use the assistant.');
      return;
    }

    const userLine: ChatLine = {
      id: `u-${Date.now()}`,
      text: trimmed,
      createdAt: Date.now(),
      side: 'user',
    };
    const next = appendLines(linesRef.current, [userLine]);
    setLines(next);
    setDraft('');
    setIsTyping(true);

    const transcript = mapLinesToContents(next);
    const endpoint = `${API_URL}/chatbot_api.php`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: transcript, user_id: userId }),
      });

      const rawBody = await response.text();
      let data: { success?: boolean; reply?: string; message?: string; code?: string } = {};
      try {
        data = rawBody ? (JSON.parse(rawBody) as typeof data) : {};
      } catch {
        data = {
          success: false,
          message: sanitizeUserFacingAssistantError(
            `Server did not return JSON. First part of response: ${rawBody.slice(0, 160).replace(/\s+/g, ' ')}`,
          ),
        };
      }

      const serverMsg = typeof data.message === 'string' ? data.message : '';
      const notConfigured = isNotConfiguredPayload(data, rawBody);
      const intentActions = matchIntentActions(trimmed, accent);

      if (data.code === 'rate_limited' || data.code === 'invalid_user') {
        const botLine: ChatLine = {
          id: `e-${Date.now()}`,
          text: sanitizeUserFacingAssistantError(serverMsg || 'Request was rejected.'),
          createdAt: Date.now(),
          side: 'bot',
        };
        setLines((prev) => appendLines(prev, [botLine]));
        return;
      }

      if (!response.ok || !data.success || typeof data.reply !== 'string') {
        let errText: string;
        if (notConfigured) {
          errText = offlineCarebotReply(trimmed);
        } else if (!response.ok) {
          errText = sanitizeUserFacingAssistantError(
            serverMsg ||
              `CareBot could not reach the server (HTTP ${response.status}). Check your connection or try again later.`,
          );
        } else {
          errText = sanitizeUserFacingAssistantError(
            serverMsg || 'The server returned an unexpected response (no reply text).',
          );
        }
        const botLine: ChatLine = {
          id: `e-${Date.now()}`,
          text: errText,
          createdAt: Date.now(),
          side: 'bot',
          actions: intentActions.length ? intentActions : undefined,
        };
        setLines((prev) => appendLines(prev, [botLine]));
        return;
      }

      const botLine: ChatLine = {
        id: `b-${Date.now()}`,
        text: data.reply.trim(),
        createdAt: Date.now(),
        side: 'bot',
        actions: intentActions.length ? intentActions : undefined,
      };
      setLines((prev) => appendLines(prev, [botLine]));
    } catch {
      const hint = `Could not reach ${endpoint}. If you are on a phone, confirm ${API_URL} uses your PC’s LAN IP and Laragon is running.`;
      const intentActions = matchIntentActions(trimmed, accent);
      const botLine: ChatLine = {
        id: `e-${Date.now()}`,
        text: networkFallbackReply(trimmed, hint),
        createdAt: Date.now(),
        side: 'bot',
        actions: intentActions.length ? intentActions : undefined,
      };
      setLines((prev) => appendLines(prev, [botLine]));
    } finally {
      setIsTyping(false);
    }
  }, [userId, accent]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ChatLine>) => {
      const mine = item.side === 'user';
      return (
        <FadeInView from="bottom" delay={index * 80}>
          <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowBot]}>
            <View
              style={[
                styles.bubble,
                mine ? [styles.bubbleMine, { backgroundColor: accentColor }] : styles.bubbleBot,
              ]}
            >
              {!mine ? <Text style={styles.bubbleLabel}>CareBot</Text> : null}
              <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
            </View>
          </View>
          {!mine && item.actions?.length ? (
            <View style={[styles.actionsRow, styles.bubbleRowBot]}>
              {item.actions.map((action) => (
                <AnimatedPressable
                  key={action.route}
                  style={[styles.actionChip, { borderColor: accentColor }]}
                  onPress={() => goToAction(action.route)}
                  accessibilityLabel={`Go to ${action.label}`}
                >
                  <Text style={[styles.actionChipText, { color: accentColor }]}>{action.label}</Text>
                  <Ionicons name="arrow-forward" size={14} color={accentColor} />
                </AnimatedPressable>
              ))}
            </View>
          ) : null}
        </FadeInView>
      );
    },
    [accentColor, goToAction],
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (showChrome ? 12 : 88) : 0}
    >
      {showChrome ? (
        <View style={styles.chromeRow}>
          <Text style={styles.chromeTitle}>CareBot</Text>
          {onRequestClose ? (
            <AnimatedPressable onPress={onRequestClose} hitSlop={12} accessibilityLabel="Close CareBot">
              <Ionicons name="close" size={26} color={theme.color.ink} />
            </AnimatedPressable>
          ) : null}
        </View>
      ) : null}
      {booting ? (
        <View style={styles.booting}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : userId < 1 ? (
        <View style={styles.signInHint}>
          <Text style={styles.signInTitle}>Please sign in first</Text>
          <Text style={styles.signInBody}>
            CareBot only works when you are logged in. Log in from the home screen, then open CareBot again.
          </Text>
          <Text style={styles.signInSub}>Administrators: enable CareBot on your CareLink server (see server setup docs).</Text>
        </View>
      ) : (
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
              <ActivityIndicator size="small" color={theme.color.muted} />
              <Text style={styles.typingText}>CareBot is typing…</Text>
            </View>
          ) : null}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message as ${userName}…`}
              placeholderTextColor={theme.color.muted}
              multiline
              maxLength={2000}
              editable={!isTyping}
            />
            <AnimatedPressable
              style={[styles.sendBtn, { backgroundColor: accentColor }, (!draft.trim() || isTyping) && styles.sendBtnOff]}
              onPress={() => void submitDraft()}
              disabled={!draft.trim() || isTyping}
              accessibilityLabel="Send message">
              <Ionicons name="send" size={22} color="#fff" />
            </AnimatedPressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.surface,
    minHeight: 200,
  },
  chatColumn: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
    backgroundColor: theme.color.surfaceElevated,
  },
  chromeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.color.ink,
  },
  booting: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
  },
  signInHint: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    backgroundColor: theme.color.surface,
  },
  signInTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.ink,
    marginBottom: 10,
  },
  signInBody: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.color.inkMuted,
    marginBottom: 14,
  },
  signInSub: {
    fontSize: 12,
    color: theme.color.muted,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 6,
    flexGrow: 1,
  },
  bubbleRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowBot: { justifyContent: 'flex-start' },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -2,
    marginBottom: 10,
    paddingLeft: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: theme.color.surface,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    borderBottomLeftRadius: 4,
  },
  bubbleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.color.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.color.ink,
  },
  bubbleTextMine: { color: '#fff' },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: { fontSize: 13, color: theme.color.muted, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
    backgroundColor: theme.color.surfaceElevated,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.line,
    paddingHorizontal: theme.space.md,
    paddingVertical: 10,
    fontSize: theme.font.body,
    color: theme.color.ink,
  } satisfies TextStyle,
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnOff: { opacity: 0.45 },
});
