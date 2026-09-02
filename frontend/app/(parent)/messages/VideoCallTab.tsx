// app/(parent)/messages/VideoCallTab.tsx
//
// Only the "start a call" screen. The call ITSELF is rendered by ChatPanel, as
// a pane that covers the whole conversation.
//
// It used to embed the call here, which tied it to this tab — and this tab only
// exists once the application is a hire. That meant an employer could not hold
// a video call with a candidate they had not hired yet, which is backwards:
// the interview is the reason to call. ChatPanel owns the pane so every entry
// point reaches it — this button, the header camera button, and tapping a
// Video Call Invitation in the chat.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import { DARK, MUTED } from '@/components/parent/home/parentWarmTheme';
import { ACCENT } from './messages.styles';

export default function VideoCallTab({
  partnerName,
  onStartCall,
}: {
  partnerName: string;
  /** Creates the room, posts the link into the chat, and opens the call pane. */
  onStartCall: () => Promise<void>;
}) {
  const [calling, setCalling] = useState(false);

  const handleStart = async () => {
    setCalling(true);
    try { await onStartCall(); } finally { setCalling(false); }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: `${ACCENT}22`,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Ionicons name="videocam" size={36} color={ACCENT} />
      </View>
      <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 8 }}>
        Video Call
      </Text>
      <Text style={{
        fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED,
        textAlign: 'center', marginBottom: 32, lineHeight: 20,
      }}>
        {Platform.OS === 'web'
          ? `Start a live video call with ${partnerName}. It opens here, and the link is sent in chat so they can join.`
          : `Start a live video call with ${partnerName}. A link will be sent in chat so both of you can join.`}
      </Text>
      <TouchableOpacity
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: ACCENT,
          paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
          opacity: calling ? 0.7 : 1,
        }}
        onPress={handleStart}
        disabled={calling}
        activeOpacity={0.8}
      >
        {calling
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons name="videocam" size={18} color="#fff" />}
        <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' }}>
          {calling ? 'Starting call…' : 'Start Video Call'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
