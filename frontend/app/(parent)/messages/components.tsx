// app/(parent)/messages/components.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, TextInput, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Conversation, Message, pendingConnectionLabel } from '@/hooks/shared';
import { FontFamily } from '@/constants/GlobalStyles';
import { CARAMEL, DARK, MUTED } from '@/components/parent/home/parentWarmTheme';
import { s, ACCENT } from './messages.styles';
import { timeLabel, fullTime } from './helpers';

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({
  name, photo, size = 40, color,
}: { name: string; photo?: string | null; size?: number; color?: string }) {
  const bg       = color ?? ACCENT;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F3E3CF' }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontFamily: FontFamily.fredokaSemiBold }}>{initials}</Text>
    </View>
  );
}

// ─── ContractRow ──────────────────────────────────────────────────────────────

export function ContractRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.contractRow}>
      <Text style={s.contractRowLabel}>{label}</Text>
      <Text style={s.contractRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── ConvItem ─────────────────────────────────────────────────────────────────

export function ConvItem({ item, onPress, active }: { item: Conversation; onPress: () => void; active: boolean }) {
  return (
    <TouchableOpacity style={[s.convItem, active && s.convItemActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={s.convAvaWrap}>
        <Avatar name={item.partner_name} photo={item.partner_photo} size={48} color={CARAMEL} />
        {item.unread_count > 0 && (
          <View style={s.badge}><Text style={s.badgeTxt}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={s.convRow}>
          <Text style={[s.convName, item.unread_count > 0 && { fontFamily: FontFamily.fredokaSemiBold, color: DARK }]} numberOfLines={1}>
            {item.partner_name}
          </Text>
          <Text style={s.convTime}>{timeLabel(item.last_sent_at)}</Text>
        </View>
        {item.job_title && (
          <Text style={s.convJob} numberOfLines={1}>re: {item.job_title}</Text>
        )}
        {item.has_messages ? (
          <Text
            style={[s.convPreview, item.unread_count > 0 && { color: DARK, fontFamily: FontFamily.fredokaSemiBold }]}
            numberOfLines={1}
          >
            {item.is_mine ? 'You: ' : ''}
            {item.last_message || 'Photo'}
          </Text>
        ) : (
          <View style={s.convPreviewPendingRow}>
            <Ionicons name="sparkles" size={12} color={CARAMEL} />
            <Text style={s.convPreviewPending} numberOfLines={1}>
              {pendingConnectionLabel(item.application_status)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── ImageViewer Modal ────────────────────────────────────────────────────────

export function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.imgViewerBg} activeOpacity={1} onPress={onClose}>
        <Image source={{ uri }} style={s.imgViewerImg} resizeMode="contain" />
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

export function Bubble({
  msg, isMine, onLongPress, onImagePress, onEditPress,
}: {
  msg: Message;
  isMine: boolean;
  onLongPress?: () => void;
  onImagePress?: (uri: string) => void;
  onEditPress?: () => void;
}) {
  const isVideoCall = msg.message_type === 'video_call';
  const isImage     = msg.message_type === 'image';

  if (isVideoCall) {
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
        <TouchableOpacity
          style={[s.videoCard, isMine && s.videoCardMine]}
          onPress={() => Linking.openURL(msg.message_text)}
          activeOpacity={0.8}
        >
          <View style={[s.videoCardIcon, isMine && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.videoCardTitle, isMine && { color: '#fff' }]}>Video Call Invitation</Text>
            <Text style={[s.videoCardSub, isMine && { color: 'rgba(255,255,255,0.75)' }]}>Tap to join the call</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isMine ? 'rgba(255,255,255,0.7)' : ACCENT} />
        </TouchableOpacity>
        <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
        </Text>
      </View>
    );
  }

  if (isImage && msg.image_url) {
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
        <TouchableOpacity onPress={() => onImagePress?.(msg.image_url!)} activeOpacity={0.9}>
          <Image source={{ uri: msg.image_url }} style={s.imgBubble} resizeMode="cover" />
        </TouchableOpacity>
        <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%', gap: 4 }}>
        <TouchableOpacity
          style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}
          onLongPress={isMine ? onLongPress : undefined}
          delayLongPress={400}
          activeOpacity={0.85}
        >
          <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{msg.message_text}</Text>
          {msg.is_edited && (
            <Text style={[s.editedLabel, isMine && s.editedLabelMine]}>edited</Text>
          )}
        </TouchableOpacity>
        {isMine && onEditPress && (
          <TouchableOpacity onPress={onEditPress} hitSlop={8} style={s.editBubbleBtn} accessibilityLabel="Edit message">
            <Ionicons name="create-outline" size={18} color={MUTED} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
        {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
      </Text>
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

export function EditModal({
  visible, initialText, onSave, onClose,
}: { visible: boolean; initialText: string; onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initialText);
  useEffect(() => { if (visible) setText(initialText); }, [visible, initialText]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.editModalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.editModalBox} activeOpacity={1}>
          <Text style={s.editModalTitle}>Edit Message</Text>
          <TextInput
            style={s.editModalInput}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={2000}
          />
          <View style={s.editModalBtns}>
            <TouchableOpacity style={s.editModalCancel} onPress={onClose}>
              <Text style={s.editModalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.editModalSave, !text.trim() && { opacity: 0.4 }]}
              onPress={() => { if (text.trim()) { onSave(text.trim()); onClose(); } }}
              disabled={!text.trim()}
            >
              <Text style={s.editModalSaveTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
