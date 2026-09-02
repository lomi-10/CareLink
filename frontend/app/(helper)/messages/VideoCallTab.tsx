// app/(helper)/messages/VideoCallTab.tsx
//
// The call used to open in a new browser tab, which took the user out of
// CareLink entirely — they lost the chat, the contract and the interview
// details mid-call, and on a phone they landed in a browser with no way back.
//
// On web the room is now embedded in this tab. Daily serves a complete call UI
// at the room URL, so an iframe with the right `allow` list is the whole
// integration; no SDK, and nothing that needs a native rebuild.
//
// On a phone the app still runs under Expo Go, where an iframe does not exist
// and no native video SDK can be loaded, so the link is opened externally
// there. That is a platform limit, not a preference — see
// backend/shared/create_call_room.php.
import React, { createElement, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import { ORANGE, DARK, MUTED } from './messages.styles';

export default function VideoCallTab({
  partnerName,
  onStartCall,
}: {
  partnerName: string;
  /** Creates the room and posts the link into the chat. Returns the room URL. */
  onStartCall: () => Promise<string | null>;
}) {
  const [calling, setCalling] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);

  const handleStart = async () => {
    setCalling(true);
    try {
      const url = await onStartCall();
      if (!url) return; // the hook already surfaced why through the chat banner
      if (Platform.OS === 'web') setRoomUrl(url);
      else Linking.openURL(url);
    } finally {
      setCalling(false);
    }
  };

  // ── In-call, on web ────────────────────────────────────────────────────────
  if (roomUrl && Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 14, paddingVertical: 10, gap: 12,
        }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, flex: 1 }}
          >
            In a call with {partnerName}
          </Text>
          {/* An escape hatch that is always visible. If the embed ever comes up
              blank — a browser extension blocking frames, a provider adding
              frame-ancestors, a slow load — the user has somewhere to go
              instead of staring at an empty box deciding the button is broken.
              That is exactly how the zero-height bug was experienced. */}
          <TouchableOpacity
            onPress={() => Linking.openURL(roomUrl)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
              borderWidth: 1, borderColor: ORANGE,
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="open-outline" size={16} color={ORANGE} />
            <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE }}>
              Open in new tab
            </Text>
          </TouchableOpacity>
          {/* Leaving unmounts the iframe, which releases the camera and
              microphone. Without this the only way out was to switch tabs,
              and the webcam light stayed on. */}
          <TouchableOpacity
            onPress={() => setRoomUrl(null)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#D64545', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="exit-outline" size={16} color="#fff" />
            <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' }}>
              Leave call
            </Text>
          </TouchableOpacity>
        </View>

        {/* createElement, and minHeight, both deliberately — this matches the
            contract-PDF iframe in ChatPanel, which is the pattern proven to
            work here.

            The first attempt used JSX with `flex: 1, height: '100%'`. Inside
            this flex column nothing bounds the height, so the iframe computed
            to ZERO pixels: the call connected, the camera turned on, and the
            user saw an unchanged screen and reported the button as dead.
            minHeight is what guarantees it is actually on screen. */}
        {createElement('iframe', {
          title: `Video call with ${partnerName}`,
          src: roomUrl,
          // Without this allow list the browser blocks the camera and mic and
          // the call loads to a black frame with no error.
          allow: 'camera; microphone; fullscreen; display-capture; autoplay',
          style: { flex: 1, width: '100%', border: 'none', minHeight: 420, borderRadius: 12 },
        } as Record<string, unknown>)}
      </View>
    );
  }

  // ── Not in a call ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: `${ORANGE}22`,
        alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Ionicons name="videocam" size={36} color={ORANGE} />
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
          backgroundColor: ORANGE,
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
