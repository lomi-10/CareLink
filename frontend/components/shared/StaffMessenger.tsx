// components/shared/StaffMessenger.tsx
// Two-pane messenger for STAFF (PESO officers and admins).
//
// Shared by both portals rather than written twice: the behaviour is identical,
// only the palette differs, so it takes a `palette` prop instead of importing a
// theme. Anything role-specific stays in the thin screens that wrap this.
//
// It reuses the ordinary messaging endpoints (shared/messages/*), so a message
// from PESO lands in the user's normal inbox — there is no separate "staff
// message" the user has to learn about. The only staff-specific piece is
// shared/staff_contacts.php, which answers "who may I write to".

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '@/constants/api';

export type StaffPalette = {
  bg: string; surface: string; raise: string;
  ink: string; muted: string; subtle: string;
  line: string; accent: string; onAccent: string;
  mine: string; theirs: string; mineInk: string; theirsInk: string;
};

type Contact = {
  user_id: number; name: string; email: string;
  user_type: 'helper' | 'parent' | 'peso';
  status?: string; photo?: string | null;
  last_at?: string | null; unread: number;
};

type Msg = {
  message_id: number; sender_id: number; receiver_id: number;
  message_text: string; message_type?: string; sent_at: string;
};

const TYPE_LABEL: Record<string, string> = { helper: 'Helper', parent: 'Employer', peso: 'PESO staff' };

export function StaffMessenger({
  staffId, role, palette: p,
}: {
  staffId: number;
  role: 'peso' | 'admin';
  palette: StaffPalette;
}) {
  const { width } = useWindowDimensions();
  const twoPane = width >= 900;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'' | 'helper' | 'parent' | 'peso'>('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const s = useMemo(() => makeStyles(p), [p]);

  const loadContacts = useCallback(async () => {
    if (!staffId) return;
    try {
      const url = `${API_URL}/shared/staff_contacts.php?staff_user_id=${staffId}&role=${role}`
        + (query.trim() ? `&q=${encodeURIComponent(query.trim())}` : '')
        + (filter ? `&type=${filter}` : '');
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setContacts(data.contacts ?? []);
      else setError(data.message || 'Could not load contacts.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoadingContacts(false);
    }
  }, [staffId, role, query, filter]);

  const loadThread = useCallback(async (partnerId: number) => {
    setLoadingThread(true);
    try {
      const res = await fetch(
        `${API_URL}/messages/get_messages.php?user_id=${staffId}&partner_id=${partnerId}&requester_id=${staffId}`,
      );
      const data = await res.json();
      setMessages(data.success ? (data.messages ?? []) : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, [staffId]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { void loadContacts(); }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadContacts, query]);

  useEffect(() => { if (active) void loadThread(active.user_id); }, [active, loadThread]);

  // Poll the open thread, matching the 5s cadence the helper/parent chat uses.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => { void loadThread(active.user_id); }, 5000);
    return () => clearInterval(id);
  }, [active, loadThread]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !active || sending) return;
    setSending(true);
    setError(null);
    // Optimistic: the message appears immediately and is reconciled by the next
    // poll. A staff member typing a long reply shouldn't watch a spinner.
    const optimistic: Msg = {
      message_id: -Date.now(),
      sender_id: staffId,
      receiver_id: active.user_id,
      message_text: text,
      sent_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setDraft('');
    try {
      const res = await fetch(`${API_URL}/messages/send_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: staffId, receiver_id: active.user_id,
          requester_id: staffId, message_text: text,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Message not sent.');
        setMessages((m) => m.filter((x) => x.message_id !== optimistic.message_id));
        setDraft(text); // hand the text back rather than losing it
      } else {
        void loadThread(active.user_id);
        void loadContacts();
      }
    } catch {
      setError('Could not reach the server.');
      setMessages((m) => m.filter((x) => x.message_id !== optimistic.message_id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const filters: { key: '' | 'helper' | 'parent' | 'peso'; label: string }[] = [
    { key: '', label: 'All' },
    { key: 'helper', label: 'Helpers' },
    { key: 'parent', label: 'Employers' },
    ...(role === 'admin' ? [{ key: 'peso' as const, label: 'PESO staff' }] : []),
  ];

  const list = (
    <View style={[s.pane, s.listPane, twoPane && { maxWidth: 340 }]}>
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={p.subtle} />
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or email…"
          placeholderTextColor={p.subtle}
        />
      </View>

      <View style={s.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key || 'all'}
            style={[s.chip, filter === f.key && { backgroundColor: p.accent, borderColor: p.accent }]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, filter === f.key && { color: p.onAccent }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loadingContacts ? (
        <View style={s.center}><ActivityIndicator color={p.accent} /></View>
      ) : contacts.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="people-outline" size={34} color={p.subtle} />
          <Text style={s.emptyText}>No one to show</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {contacts.map((cnt) => {
            const on = active?.user_id === cnt.user_id;
            return (
              <TouchableOpacity
                key={cnt.user_id}
                style={[s.row, on && { backgroundColor: p.raise, borderColor: p.accent }]}
                onPress={() => setActive(cnt)}
                activeOpacity={0.85}
              >
                {cnt.photo
                  ? <Image source={{ uri: cnt.photo }} style={s.ava} />
                  : <View style={[s.ava, s.avaFb]}><Text style={s.avaText}>{(cnt.name || '?').charAt(0).toUpperCase()}</Text></View>}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.rowName} numberOfLines={1}>{cnt.name}</Text>
                  <Text style={s.rowSub} numberOfLines={1}>{TYPE_LABEL[cnt.user_type] ?? cnt.user_type}</Text>
                </View>
                {cnt.unread > 0 && (
                  <View style={s.badge}><Text style={s.badgeText}>{cnt.unread > 9 ? '9+' : cnt.unread}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const thread = (
    <View style={[s.pane, { flex: 1 }]}>
      {!active ? (
        <View style={s.center}>
          <Ionicons name="chatbubbles-outline" size={40} color={p.subtle} />
          <Text style={s.emptyText}>Choose someone to message</Text>
        </View>
      ) : (
        <>
          <View style={s.threadHead}>
            {!twoPane && (
              <TouchableOpacity onPress={() => setActive(null)} hitSlop={10} style={{ marginRight: 4 }}>
                <Ionicons name="arrow-back" size={22} color={p.ink} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.threadName}>{active.name}</Text>
              <Text style={s.threadSub}>{TYPE_LABEL[active.user_type]} · {active.email}</Text>
            </View>
          </View>

          {loadingThread && messages.length === 0 ? (
            <View style={s.center}><ActivityIndicator color={p.accent} /></View>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              contentContainerStyle={s.threadBody}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && (
                <Text style={s.threadHint}>
                  No messages yet. Anything you send arrives in their normal CareLink inbox.
                </Text>
              )}
              {messages.map((m) => {
                const mine = Number(m.sender_id) === staffId;
                return (
                  <View key={m.message_id} style={[s.bubbleWrap, mine ? s.bubbleRight : s.bubbleLeft]}>
                    <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                      <Text style={[s.bubbleText, { color: mine ? p.mineInk : p.theirsInk }]}>
                        {m.message_text}
                      </Text>
                    </View>
                    <Text style={s.bubbleTime}>
                      {new Date(String(m.sent_at).replace(' ', 'T')).toLocaleString('en-PH', {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {!!error && <Text style={s.error}>{error}</Text>}

          <View style={s.composer}>
            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${active.name.split(' ')[0]}…`}
              placeholderTextColor={p.subtle}
              multiline
            />
            <TouchableOpacity
              style={[s.sendBtn, (!draft.trim() || sending) && { opacity: 0.5 }]}
              onPress={send}
              disabled={!draft.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? <ActivityIndicator size="small" color={p.onAccent} />
                       : <Ionicons name="send" size={17} color={p.onAccent} />}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  // Narrow screens show one pane at a time, like an ordinary phone inbox.
  if (!twoPane) return <View style={s.root}>{active ? thread : list}</View>;

  return <View style={[s.root, { flexDirection: 'row', gap: 14 }]}>{list}{thread}</View>;
}

const makeStyles = (p: StaffPalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: p.bg, padding: 14 },
  pane: { backgroundColor: p.surface, borderRadius: 16, borderWidth: 1, borderColor: p.line, overflow: 'hidden' },
  listPane: { flex: 1, padding: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  emptyText: { color: p.muted, fontSize: 13.5, textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: p.raise, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10,
  },
  search: { flex: 1, color: p.ink, fontSize: 13.5, outlineStyle: 'none' } as any,

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: p.line },
  chipText: { fontSize: 12, fontWeight: '700', color: p.muted },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', marginBottom: 4,
  },
  ava: { width: 38, height: 38, borderRadius: 19 },
  avaFb: { backgroundColor: p.raise, alignItems: 'center', justifyContent: 'center' },
  avaText: { fontWeight: '800', color: p.muted },
  rowName: { fontSize: 13.5, fontWeight: '800', color: p.ink },
  rowSub: { fontSize: 11.5, color: p.muted, marginTop: 1 },
  badge: { backgroundColor: p.accent, borderRadius: 999, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center' },
  badgeText: { color: p.onAccent, fontSize: 11, fontWeight: '800' },

  threadHead: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: p.line,
  },
  threadName: { fontSize: 15, fontWeight: '800', color: p.ink },
  threadSub: { fontSize: 11.5, color: p.muted, marginTop: 1 },
  threadBody: { padding: 14, gap: 10 },
  threadHint: { color: p.muted, fontSize: 13, textAlign: 'center', paddingVertical: 20, lineHeight: 19 },

  bubbleWrap: { maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14 },
  bubbleMine: { backgroundColor: p.mine, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: p.theirs, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  bubbleTime: { fontSize: 10.5, color: p.subtle, marginTop: 3, marginHorizontal: 4 },

  error: { color: '#DC2626', fontSize: 12.5, paddingHorizontal: 14, paddingBottom: 6 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: p.line,
  },
  input: {
    flex: 1, backgroundColor: p.raise, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, color: p.ink, fontSize: 14,
    maxHeight: 110, outlineStyle: 'none',
  } as any,
  sendBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: p.accent,
    alignItems: 'center', justifyContent: 'center',
  },
});
