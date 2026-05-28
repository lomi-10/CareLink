// components/parent/jobs/JobStatusBadge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { useParentTheme } from '@/contexts/ParentThemeContext';

type StatusType = 'Open' | 'Filled' | 'Closed' | 'Expired' | 'Pending' | 'Rejected' | string;
type IonName = React.ComponentProps<typeof Ionicons>['name'];

function statusAppearance(t: ThemeColor, status: string): { bg: string; text: string; icon: IonName } {
  switch (status) {
    case 'Open':
      return { bg: t.successSoft, text: t.success, icon: 'radio-button-on' };
    case 'Filled':
      return { bg: t.parentSoft, text: t.parent, icon: 'checkmark-circle' };
    case 'Closed':
      return { bg: t.warningSoft, text: t.warning, icon: 'stop-circle' };
    case 'Expired':
      return { bg: t.dangerSoft, text: t.danger, icon: 'time' };
    case 'Pending':
      return { bg: t.warningSoft, text: t.warning, icon: 'hourglass' };
    case 'Rejected':
      return { bg: t.dangerSoft, text: t.danger, icon: 'close-circle' };
    default:
      return { bg: t.surface, text: t.muted, icon: 'ellipse' };
  }
}

interface JobStatusBadgeProps {
  status: StatusType;
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const { color: t } = useParentTheme();
  const cfg = statusAppearance(t, status);
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} />
      <Text style={[styles.text, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
