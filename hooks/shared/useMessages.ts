// hooks/shared/useMessages.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

export interface Conversation {
  partner_id: number;
  partner_name: string;
  partner_type: 'helper' | 'parent';
  partner_photo: string | null;
  last_message: string;
  last_sent_at: string;
  is_mine: boolean;
  unread_count: number;
  job_post_id: number | null;
  job_title: string | null;
}

export interface Message {
  message_id: number;
  sender_id: number;
  receiver_id: number;
  message_text: string;
  is_read: boolean;
  sent_at: string;
  job_post_id: number | null;
  interview?: InterviewInfo | null;
}

export interface InterviewInfo {
  interview_id: number;
  interview_date: string;
  interview_type: 'In-person' | 'Video Call' | 'Phone';
  location_or_link: string | null;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Rescheduled';
  parent_confirmed: boolean;
  helper_confirmed: boolean;
  notes: string | null;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  return { conversations, loading, refresh: fetchConversations };
}

export function useChat(partnerId: number) {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [sending,   setSending]   = useState(false);
  const [myUserId,  setMyUserId]  = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!partnerId) return;
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return;
      const user = JSON.parse(raw);
      setMyUserId(user.user_id);
      const res  = await fetch(`${API_URL}/messages/get_messages.php?user_id=${user.user_id}&partner_id=${partnerId}`);
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
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  const sendMessage = useCallback(async (text: string, jobPostId?: number | null) => {
    if (!text.trim()) return false;
    setSending(true);
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw) return false;
      const user = JSON.parse(raw);
      const res  = await fetch(`${API_URL}/messages/send_message.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id:    user.user_id,
          receiver_id:  partnerId,
          message_text: text.trim(),
          job_post_id:  jobPostId ?? null,
        }),
      });
      const data = await res.json();
      if (data.success) await fetchMessages();
      return data.success;
    } catch (e) {
      return false;
    } finally {
      setSending(false);
    }
  }, [partnerId, fetchMessages]);

  return { messages, loading, sending, myUserId, fetchMessages, sendMessage };
}
