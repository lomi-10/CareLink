// app/(helper)/messages/MessagesTab.tsx
import React from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { Message } from '@/hooks/shared';
import { MUTED, SUBTLE } from './messages.styles';
import { useMessagesAppearance } from './messagesAppearance';
import { dateDivider, shouldShowDivider } from './helpers';
import { Bubble, EditModal, ImageViewer } from './components';

export default function MessagesTab({
  messages, myUserId, sending, partnerName, flatRef,
  text, setText, handleSend, handlePickImage,
  editTarget, setEditTarget, viewerUri, setViewerUri, editMessage, insets,
}: {
  messages: Message[];
  myUserId: number;
  sending: boolean;
  partnerName: string;
  flatRef: React.RefObject<FlatList<Message> | null>;
  text: string;
  setText: (t: string) => void;
  handleSend: () => void | Promise<void>;
  handlePickImage: () => void | Promise<void>;
  editTarget: Message | null;
  setEditTarget: (m: Message | null) => void;
  viewerUri: string | null;
  setViewerUri: (uri: string | null) => void;
  editMessage: (messageId: number, newText: string) => Promise<boolean>;
  insets: EdgeInsets;
}) {
  const { s } = useMessagesAppearance();

  return (
    <>
      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => String(m.message_id)}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 14 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const isMine     = item.sender_id === myUserId;
          const showDivider = shouldShowDivider(messages[index - 1], item);
          return (
            <>
              {showDivider && (
                <View style={s.dateDividerWrap}>
                  <Text style={s.dateDivider}>{dateDivider(item.sent_at)}</Text>
                </View>
              )}
              <Bubble
                msg={item}
                isMine={isMine}
                onLongPress={() => setEditTarget(item)}
                onEditPress={item.message_type === 'text' && isMine ? () => setEditTarget(item) : undefined}
                onImagePress={uri => setViewerUri(uri)}
              />
            </>
          );
        }}
        ListEmptyComponent={
          <View style={s.chatEmpty}>
            <Ionicons name="chatbubbles-outline" size={52} color={SUBTLE} />
            <Text style={s.chatEmptyTitle}>No messages yet</Text>
            <Text style={s.chatEmptySub}>Say hello to {partnerName}!</Text>
          </View>
        }
      />

      {/* Input bar */}
      <View style={[s.inputRow, Platform.OS === 'android' && insets.bottom > 0 && { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={s.inputIcon} onPress={handlePickImage}>
          <Ionicons name="image-outline" size={22} color={MUTED} />
        </TouchableOpacity>
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message…"
          placeholderTextColor={SUBTLE}
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>

      {/* Edit modal */}
      <EditModal
        visible={!!editTarget}
        initialText={editTarget?.message_text ?? ''}
        onSave={newText => { if (editTarget) editMessage(editTarget.message_id, newText); }}
        onClose={() => setEditTarget(null)}
      />

      {/* Image viewer */}
      {viewerUri && <ImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />}
    </>
  );
}
