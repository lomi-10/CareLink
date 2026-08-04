// app/(peso)/messages/index.tsx
// PESO officers messaging helpers and employers.
//
// The screen is thin on purpose: all the behaviour lives in the shared
// StaffMessenger, which the admin portal uses too. Only the palette differs.
//
// Messages sent here land in the recipient's ordinary CareLink inbox, so a
// helper doesn't have to learn a separate place to hear from PESO — which
// matters most for the case this was built for: asking someone for a clearer
// document photo instead of rejecting them outright.

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenHeader, usePesoTheme } from '@/components/peso/ui';
import { StaffMessenger, type StaffPalette } from '@/components/shared/StaffMessenger';

export default function PesoMessagesScreen() {
  const { c } = usePesoTheme();
  const { user_id } = useLocalSearchParams<{ user_id?: string }>();
  const [staffId, setStaffId] = useState<number>(0);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then((raw) => {
      setStaffId(Number((raw ? JSON.parse(raw) : {})?.user_id ?? 0));
    });
  }, []);

  const palette: StaffPalette = {
    bg: c.canvas, surface: c.surface, raise: c.sunken,
    ink: c.ink, muted: c.muted, subtle: c.subtle,
    line: c.line, accent: c.accent, onAccent: c.onAccent,
    mine: c.accent, mineInk: c.onAccent,
    theirs: c.sunken, theirsInk: c.ink,
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScreenHeader
        eyebrow="COMMUNICATION"
        title="Messages"
        subtitle="Reach a helper or employer directly — it arrives in their normal inbox"
      />
      <StaffMessenger staffId={staffId} role="peso" palette={palette} initialUserId={user_id ? Number(user_id) : undefined} />
    </View>
  );
}
