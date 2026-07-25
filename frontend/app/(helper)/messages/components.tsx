// app/(helper)/messages/components.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, TextInput, Modal, Linking, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Conversation, Message, pendingConnectionLabel } from '@/hooks/shared';
import { DARK, MUTED, BLUE, ORANGE } from './messages.styles';

const GREEN = '#059669';
const RED   = '#DC2626';
import { useMessagesAppearance } from './messagesAppearance';
import { timeLabel, fullTime } from './helpers';

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function Avatar({
  name, photo, size = 40, color,
}: { name: string; photo?: string | null; size?: number; color?: string }) {
  const bg = color ?? ORANGE;
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#e0e0e0' }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.38, fontWeight: '700' }}>{initials}</Text>
    </View>
  );
}

// ─── ConvItem ─────────────────────────────────────────────────────────────────

export function ConvItem({ item, onPress, active }: { item: Conversation; onPress: () => void; active: boolean }) {
  const { s } = useMessagesAppearance();
  return (
    <TouchableOpacity style={[s.convItem, active && s.convItemActive]} onPress={onPress} activeOpacity={0.7}>
      <View style={s.convAvaWrap}>
        <Avatar name={item.partner_name} photo={item.partner_photo} size={48} color={BLUE} />
        {item.unread_count > 0 && (
          <View style={s.badge}><Text style={s.badgeTxt}>{item.unread_count > 9 ? '9+' : item.unread_count}</Text></View>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={s.convRow}>
          <Text style={[s.convName, item.unread_count > 0 && { fontWeight: '700' }]} numberOfLines={1}>
            {item.partner_name}
          </Text>
          <Text style={s.convTime}>{timeLabel(item.last_sent_at)}</Text>
        </View>
        {item.job_title && (
          <Text style={s.convJob} numberOfLines={1}>re: {item.job_title}</Text>
        )}
        {item.has_messages ? (
          <Text style={[s.convPreview, item.unread_count > 0 && { color: DARK, fontWeight: '600' }]} numberOfLines={1}>
            {item.is_mine ? 'You: ' : ''}
            {item.last_message || 'Photo'}
          </Text>
        ) : (
          <View style={s.convPreviewPendingRow}>
            <Ionicons name="sparkles" size={12} color={ORANGE} />
            <Text style={s.convPreviewPending} numberOfLines={1}>
              {pendingConnectionLabel(item.application_status)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── ContractRow ──────────────────────────────────────────────────────────────

export function ContractRow({ label, value }: { label: string; value: string }) {
  const { s } = useMessagesAppearance();
  return (
    <View style={s.contractRow}>
      <Text style={s.contractRowLabel}>{label}</Text>
      <Text style={s.contractRowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// ─── ImageViewer Modal ────────────────────────────────────────────────────────

export function ImageViewer({ uri, onClose }: { uri: string; onClose: () => void }) {
  const { s } = useMessagesAppearance();
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
  onAcceptInvite, onDeclineInvite, onOpenInviteJob, inviteBusy,
}: {
  msg: Message;
  isMine: boolean;
  onLongPress?: () => void;
  onImagePress?: (uri: string) => void;
  onEditPress?: () => void;
  onAcceptInvite?: () => void;
  onDeclineInvite?: () => void;
  onOpenInviteJob?: () => void;
  inviteBusy?: boolean;
}) {
  const { s } = useMessagesAppearance();
  const isVideoCall = msg.message_type === 'video_call';
  const isImage     = msg.message_type === 'image';
  const isInvite    = msg.message_type === 'job_invite';

  if (isInvite) {
    const status   = msg.invite_status ?? 'pending';
    const accepted = status === 'accepted';
    const declined = status === 'declined';
    const showActions = !isMine && status === 'pending';
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
        <View style={{ maxWidth: 330, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#EDE0D0', overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF3EC' }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: ORANGE + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="briefcase" size={17} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: DARK, fontSize: 13 }}>Job Invitation</Text>
              {!!msg.job_title && <Text style={{ color: MUTED, fontSize: 11.5 }} numberOfLines={1}>{msg.job_title}</Text>}
            </View>
            {status !== 'pending' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: (accepted ? GREEN : RED) + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                <Ionicons name={accepted ? 'checkmark-circle' : 'close-circle'} size={12} color={accepted ? GREEN : RED} />
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: accepted ? GREEN : RED }}>{accepted ? 'Accepted' : 'Declined'}</Text>
              </View>
            )}
          </View>
          {/* Body */}
          <View style={{ paddingHorizontal: 12, paddingVertical: 11 }}>
            <Text style={{ color: DARK, fontSize: 13.5, lineHeight: 20 }}>{msg.message_text}</Text>

            {showActions && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity disabled={inviteBusy} onPress={onDeclineInvite} activeOpacity={0.8}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1.5, borderColor: '#EDE0D0', alignItems: 'center' }}>
                  <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={inviteBusy} onPress={onAcceptInvite} activeOpacity={0.85}
                  style={{ flex: 1.5, paddingVertical: 10, borderRadius: 11, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                  {inviteBusy ? <ActivityIndicator size="small" color="#fff" /> : (
                    <><Ionicons name="checkmark" size={15} color="#fff" /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Accept</Text></>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {!isMine && accepted && (
              <TouchableOpacity onPress={onOpenInviteJob} activeOpacity={0.85}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, paddingVertical: 10, borderRadius: 11, backgroundColor: ORANGE + '18' }}>
                <Ionicons name="arrow-forward-circle" size={16} color={ORANGE} />
                <Text style={{ color: ORANGE, fontWeight: '800', fontSize: 13 }}>View job &amp; apply</Text>
              </TouchableOpacity>
            )}

            {!isMine && declined && (
              <Text style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>You declined this invitation.</Text>
            )}

            {isMine && (
              <Text style={{ color: MUTED, fontSize: 11.5, marginTop: 8 }}>
                {accepted ? 'The helper accepted your invitation.' : declined ? 'The helper declined your invitation.' : 'Waiting for the helper to respond…'}
              </Text>
            )}
          </View>
        </View>
        <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaRight : s.bubbleMetaLeft]}>
          {fullTime(msg.sent_at)}{isMine && (msg.is_read ? ' ✓✓' : ' ✓')}
        </Text>
      </View>
    );
  }

  if (isVideoCall) {
    return (
      <View style={[s.bubbleWrap, isMine ? s.bubbleWrapRight : s.bubbleWrapLeft]}>
        <TouchableOpacity
          style={[s.videoCard, isMine && s.videoCardMine]}
          onPress={() => Linking.openURL(msg.message_text)}
          activeOpacity={0.8}
        >
          <View style={s.videoCardIcon}>
            <Ionicons name="videocam" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.videoCardTitle, isMine && { color: '#fff' }]}>Video Call Invitation</Text>
            <Text style={[s.videoCardSub, isMine && { color: 'rgba(255,255,255,0.85)' }]}>Tap to join the call</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isMine ? 'rgba(255,255,255,0.7)' : ORANGE} />
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
          <Image
            source={{ uri: msg.image_url }}
            style={s.imgBubble}
            resizeMode="cover"
          />
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

// ─── Edit Message Modal ───────────────────────────────────────────────────────

export function EditModal({
  visible, initialText, onSave, onClose,
}: { visible: boolean; initialText: string; onSave: (t: string) => void; onClose: () => void }) {
  const { s } = useMessagesAppearance();
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
