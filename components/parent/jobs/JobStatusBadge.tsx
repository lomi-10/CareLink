// components/parent/jobs/JobStatusBadge.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

type StatusType = 'Open' | 'Filled' | 'Closed' | 'Expired' | 'Pending' | 'Rejected' | string;

interface JobStatusBadgeProps {
  status: StatusType;
}

const STATUS_MAP: Record<string, { bg: string; text: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  Open:     { bg: theme.color.successSoft, text: theme.color.success, icon: 'radio-button-on'   },
  Filled:   { bg: theme.color.parentSoft,  text: theme.color.parent,  icon: 'checkmark-circle'  },
  Closed:   { bg: theme.color.warningSoft, text: theme.color.warning, icon: 'stop-circle'       },
  Expired:  { bg: theme.color.dangerSoft,  text: theme.color.danger,  icon: 'time'              },
  Pending:  { bg: theme.color.warningSoft, text: theme.color.warning, icon: 'hourglass'         },
  Rejected: { bg: theme.color.dangerSoft,  text: theme.color.danger,  icon: 'close-circle'      },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const cfg = STATUS_MAP[status] ?? { bg: theme.color.surface, text: theme.color.muted, icon: 'ellipse' as const };
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
