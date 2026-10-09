// app/(parent)/messages/MessagesTab.tsx
import React from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { Message } from '@/hooks/shared';
import { NotificationCard } from '@/components/shared';
import { MUTED, SUBTLE } from '@/components/parent/home/parentWarmTheme';
import { s } from './messages.styles';
import { dateDivider, shouldShowDivider } from './helpers';
import { Bubble, EditModal, ImageViewer } from './components';

export default function MessagesTab({
  messages, myUserId, sending, partnerName, flatRef,
  text, setText, handleSend, handlePickImage, handleTakePhoto,
  editTarget, setEditTarget, viewerUri, setViewerUri, editMessage, insets, onOpenVideoCall,
  unavailableNotice,
  recoverySlot,
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
  handleTakePhoto?: () => void | Promise<void>;
  editTarget: Message | null;
  setEditTarget: (m: Message | null) => void;
  viewerUri: string | null;
  setViewerUri: (uri: string | null) => void;
  editMessage: (messageId: number, newText: string) => Promise<boolean>;
  /** Passed down so a call opens in the app rather than a new tab. */
  onOpenVideoCall?: (url: string) => void;
  insets: EdgeInsets;
  unavailableNotice?: string | null;
  /** Optional recovery UI (e.g. similar helpers) shown under the closed notice. */
  recoverySlot?: React.ReactNode;
}) {
  return (
    <>
      {unavailableNotice ? (
        <NotificationCard
          tone="neutral"
          icon="lock-closed-outline"
          badge="Read-Only · Closed"
          title="This conversation is closed"
          message={unavailableNotice}
        />
      ) : null}
      {recoverySlot}
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
                onLongPress={unavailableNotice ? undefined : () => setEditTarget(item)}
                onEditPress={!unavailableNotice && item.message_type === 'text' && isMine ? () => setEditTarget(item) : undefined}
                onImagePress={uri => setViewerUri(uri)}
                onOpenVideoCall={onOpenVideoCall}
                disableInteractions={!!unavailableNotice}
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
      <View style={[s.inputRow, Platform.OS === 'android' && insets.bottom > 0 && { paddingBottom: insets.bottom + 10 }, unavailableNotice && { opacity: 0.5 }]}>
        <TouchableOpacity style={s.inputIcon} onPress={handlePickImage} disabled={!!unavailableNotice}>
          <Ionicons name="image-outline" size={22} color={MUTED} />
        </TouchableOpacity>
        {handleTakePhoto ? (
          <TouchableOpacity style={s.inputIcon} onPress={handleTakePhoto} disabled={!!unavailableNotice}>
            <Ionicons name="camera-outline" size={22} color={MUTED} />
          </TouchableOpacity>
        ) : null}
        <TextInput
          style={s.input}
          value={text}
          onChangeText={setText}
          placeholder={unavailableNotice ? 'Messaging unavailable' : 'Type a message'}
          placeholderTextColor={SUBTLE}
          multiline
          maxLength={2000}
          returnKeyType="default"
          editable={!unavailableNotice}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending || !!unavailableNotice) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending || !!unavailableNotice}
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
