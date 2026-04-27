import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { GiftedChat, IMessage, User } from 'react-native-gifted-chat';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

const USER_ID = 1;
const BOT_ID = 2;

const BOT_USER: User = {
  _id: BOT_ID,
  name: 'CareBot',
};

const ME_USER: User = {
  _id: USER_ID,
  name: 'You',
};

function mapMessagesToContents(messages: IMessage[]): { role: 'user' | 'model'; text: string }[] {
  const out: { role: 'user' | 'model'; text: string }[] = [];
  for (const m of messages) {
    if (m.system) continue;
    const text = (m.text ?? '').trim();
    if (!text) continue;
    const id = Number(m.user._id);
    const role: 'user' | 'model' = id === BOT_ID ? 'model' : 'user';
    out.push({ role, text });
  }
  return out;
}

export default function AIChatbot() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef<IMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    const userMessage = newMessages[0];
    if (!userMessage?.text?.trim()) return;

    const nextMessages = GiftedChat.append(messagesRef.current, newMessages);
    setMessages(nextMessages);
    setIsTyping(true);

    const transcript = mapMessagesToContents(nextMessages);

    try {
      const response = await fetch(`${API_URL}/chatbot_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: transcript }),
      });

      const data = (await response.json()) as { success?: boolean; reply?: string; message?: string };

      if (!response.ok || !data.success || typeof data.reply !== 'string') {
        const errText = data.message ?? `Request failed (${response.status})`;
        const botReply: IMessage = {
          _id: `err-${Date.now()}`,
          text: errText,
          createdAt: new Date(),
          user: BOT_USER,
          system: true,
        };
        setMessages((prev) => GiftedChat.append(prev, [botReply]));
        return;
      }

      const botMessage: IMessage = {
        _id: `bot-${Date.now()}`,
        text: data.reply.trim(),
        createdAt: new Date(),
        user: BOT_USER,
      };
      setMessages((prev) => GiftedChat.append(prev, [botMessage]));
    } catch {
      const botReply: IMessage = {
        _id: `err-${Date.now()}`,
        text: 'Could not reach the assistant. Check your connection and API server.',
        createdAt: new Date(),
        user: BOT_USER,
        system: true,
      };
      setMessages((prev) => GiftedChat.append(prev, [botReply]));
    } finally {
      setIsTyping(false);
    }
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'CareBot',
          headerShown: true,
          headerStyle: { backgroundColor: theme.color.surfaceElevated },
          headerTintColor: theme.color.ink,
          headerShadowVisible: true,
        }}
      />
      <View style={styles.root}>
        <GiftedChat
          messages={messages}
          onSend={(m) => void onSend(m)}
          user={ME_USER}
          isTyping={isTyping}
          placeholder="Ask about Kasambahay Law, hiring, or CareLink…"
          alwaysShowSend
          messagesContainerStyle={styles.messagesContainer}
          textInputStyle={styles.textInput}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.color.surface,
  },
  messagesContainer: {
    backgroundColor: theme.color.surface,
  },
  textInput: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.line,
    paddingHorizontal: theme.space.md,
    marginVertical: theme.space.xs,
    fontSize: theme.font.body,
    color: theme.color.ink,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
});
