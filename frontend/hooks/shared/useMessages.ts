// hooks/shared/useMessages.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Conversation {
  partner_id:    number;
  partner_name:  string;
  partner_type:  'helper' | 'parent';
  partner_photo: string | null;
  last_message:  string;
  last_sent_at:  string;
  is_mine:       boolean;
  unread_count:  number;
  job_post_id:   number | null;
  job_title:     string | null;
}

export type MessageType = 'text' | 'image' | 'video_call';

export interface Message {
  message_id:   number;
  sender_id:    number;
  receiver_id:  number;
  message_text: string;
  message_type: MessageType;
  image_url:    string | null;
  is_edited:    boolean;
  edited_at:    string | null;
  is_read:      boolean;
  sent_at:      string;
  job_post_id:  number | null;
}

// ─── useConversations ─────────────────────────────────────────────────────────

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/messages/get_conversations.php?user_id=${user.user_id}`);
      const data = await res.json();
      if (data.success) setConversations(data.conversations ?? []);
    } catch (e) {
      console.error('[useConversations]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations]);

  return { conversations, loading, refresh: fetchConversations };
}

// ─── useChat ──────────────────────────────────────────────────────────────────

export function useChat(partnerId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const [myUserId, setMyUserId] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!partnerId) return;
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      setMyUserId(user.user_id);
      const res  = await fetch(
        `${API_URL}/messages/get_messages.php?user_id=${user.user_id}&partner_id=${partnerId}`
      );
      const data = await res.json();
      if (data.success) setMessages(data.messages ?? []);
    } catch (e) {
      console.error('[useChat]', e);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  // ── Send text ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (
    text: string,
    jobPostId?: number | null,
    type: MessageType = 'text',
  ): Promise<boolean> => {
    if (type === 'text' && !text.trim()) return false;
    setSending(true);
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return false;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/messages/send_message.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id:    user.user_id,
          receiver_id:  partnerId,
          message_text: text.trim(),
          job_post_id:  jobPostId ?? null,
          message_type: type,
        }),
      });
      const data = await res.json();
      if (data.success) await fetchMessages();
      return !!data.success;
    } catch {
      return false;
    } finally {
      setSending(false);
    }
  }, [partnerId, fetchMessages]);

  // ── Edit message ──────────────────────────────────────────────────────────
  const editMessage = useCallback(async (messageId: number, newText: string): Promise<boolean> => {
    if (!newText.trim()) return false;
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return false;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/messages/edit_message.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: messageId, user_id: user.user_id, new_text: newText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev =>
          prev.map(m =>
            m.message_id === messageId
              ? { ...m, message_text: newText.trim(), is_edited: true }
              : m
          )
        );
      }
      return !!data.success;
    } catch {
      return false;
    }
  }, []);

  // ── Send image ────────────────────────────────────────────────────────────
  const sendImage = useCallback(async (
    localUri: string,
    jobPostId?: number | null,
  ): Promise<boolean> => {
    setSending(true);
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return false;
      const user = JSON.parse(raw);

      // 1. Upload the image file (web: FormData needs Blob, not { uri })
      const form = new FormData();
      form.append('user_id', String(user.user_id));
      const filename = localUri.split('/').pop()?.split('?')[0] ?? 'photo.jpg';
      const ext      = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
      const mime     = mimeMap[ext] ?? 'image/jpeg';

      if (Platform.OS === 'web') {
        const blob = await (await fetch(localUri)).blob();
        form.append('image', blob, filename.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? filename : `${filename}.jpg`);
      } else {
        form.append('image', { uri: localUri, name: filename, type: mime } as any);
      }

      const upRes  = await fetch(`${API_URL}/messages/upload_image.php`, { method: 'POST', body: form });
      const upData = await upRes.json();
      if (!upData.success) return false;

      // 2. Send message record with the returned URL
      const sendRes  = await fetch(`${API_URL}/messages/send_message.php`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id:    user.user_id,
          receiver_id:  partnerId,
          message_text: '',
          job_post_id:  jobPostId ?? null,
          message_type: 'image',
          image_url:    upData.image_url,
        }),
      });
      const sendData = await sendRes.json();
      if (sendData.success) await fetchMessages();
      return !!sendData.success;
    } catch (e) {
      console.error('[sendImage]', e);
      return false;
    } finally {
      setSending(false);
    }
  }, [partnerId, fetchMessages]);

  // ── Start video call ──────────────────────────────────────────────────────
  const sendVideoCall = useCallback(async (
    myId: number,
    jobPostId?: number | null,
  ): Promise<string | null> => {
    const roomId  = `CareLink-${Math.min(myId, partnerId)}-${Math.max(myId, partnerId)}`;
    const callUrl = `https://meet.jit.si/${roomId}`;
    const sent    = await sendMessage(callUrl, jobPostId, 'video_call');
    return sent ? callUrl : null;
  }, [partnerId, sendMessage]);

  return { messages, loading, sending, myUserId, fetchMessages, sendMessage, editMessage, sendImage, sendVideoCall };
}
