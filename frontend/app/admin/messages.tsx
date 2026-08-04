// app/admin/messages.tsx
// Super admin messaging — helpers, employers AND PESO staff.
//
// Same shared StaffMessenger the PESO portal uses, so the two never drift
// apart; only the palette and the allowed contact types differ. The wider reach
// is the point: an admin supports everyone, including the PESO officers
// themselves, who have no other in-app way to be contacted.

import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { StaffMessenger, type StaffPalette } from '@/components/shared/StaffMessenger';

export default function AdminMessagesScreen() {
  const { palette: c } = useAdminTheme();
  const { user_id } = useLocalSearchParams<{ user_id?: string }>();
  const [adminId, setAdminId] = useState<number>(0);

  useEffect(() => {
    AsyncStorage.getItem('user_data').then((raw) => {
      setAdminId(Number((raw ? JSON.parse(raw) : {})?.user_id ?? 0));
    });
  }, []);

  const palette: StaffPalette = {
    bg: c.bg, surface: c.panel, raise: c.panel2,
    ink: c.text, muted: c.muted, subtle: c.subtle,
    line: c.border, accent: c.accent, onAccent: '#FFFFFF',
    mine: c.accent, mineInk: '#FFFFFF',
    theirs: c.panel2, theirsInk: c.text,
  };

  return (
    <AdminShell
      active="messages"
      title="Messages"
      subtitle="Message helpers, employers and PESO staff directly"
    >
      <View style={{ flex: 1, minHeight: 520 }}>
        <StaffMessenger staffId={adminId} role="admin" palette={palette} initialUserId={user_id ? Number(user_id) : undefined} />
      </View>
    </AdminShell>
  );
}
