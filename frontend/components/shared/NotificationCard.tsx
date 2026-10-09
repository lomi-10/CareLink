// components/shared/NotificationCard.tsx
// Inline, non-modal notice card for persistent context (read-only chat,
// hired-elsewhere, interview canceled, etc.). Prefer this over NotificationModal
// when the message should stay visible in-page rather than interrupt as a dialog.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

export type NotificationCardTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

type ToneCfg = {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  soft: string;
  border: string;
};

const TONES: Record<NotificationCardTone, ToneCfg> = {
  info: {
    icon: 'information-circle',
    accent: theme.color.info,
    soft: theme.color.infoSoft,
    border: '#BFD7F2',
  },
  success: {
    icon: 'checkmark-circle',
    accent: theme.color.success,
    soft: theme.color.successSoft,
    border: '#B7E0C8',
  },
  warning: {
    icon: 'warning',
    accent: theme.color.warning,
    soft: theme.color.warningSoft,
    border: '#F0D4A8',
  },
  danger: {
    icon: 'person-remove-outline',
    accent: theme.color.danger,
    soft: theme.color.dangerSoft,
    border: '#E8B6A8',
  },
  neutral: {
    icon: 'lock-closed-outline',
    accent: theme.color.inkMuted,
    soft: '#F3EEE6',
    border: theme.color.line,
  },
};

export type NotificationCardAction = {
  label: string;
  onPress: () => void;
};

export function NotificationCard({
  title,
  message,
  tone = 'info',
  icon,
  badge,
  action,
  secondaryAction,
  onDismiss,
  compact,
  style,
}: {
  title?: string;
  message: string;
  tone?: NotificationCardTone;
  /** Override the default tone icon. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Small pill shown above the title (e.g. "Read-Only · Closed"). */
  badge?: string;
  action?: NotificationCardAction;
  secondaryAction?: NotificationCardAction;
  onDismiss?: () => void;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const cfg = TONES[tone];
  const iconName = icon ?? cfg.icon;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: cfg.soft,
          borderColor: cfg.border,
        },
        compact && styles.wrapCompact,
        style,
      ]}
      accessibilityRole="summary"
    >
      <View style={[styles.iconCircle, { backgroundColor: cfg.accent + '22' }]}>
        <Ionicons name={iconName} size={compact ? 18 : 22} color={cfg.accent} />
      </View>

      <View style={styles.body}>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: cfg.accent + '18', borderColor: cfg.accent + '44' }]}>
            <Text style={[styles.badgeText, { color: cfg.accent }]}>{badge}</Text>
          </View>
        ) : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={[styles.message, !title && styles.messageSolo]}>{message}</Text>

        {(action || secondaryAction) && (
          <View style={styles.actions}>
            {action ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: cfg.accent }]}
                onPress={action.onPress}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>{action.label}</Text>
              </TouchableOpacity>
            ) : null}
            {secondaryAction ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={secondaryAction.onPress}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryBtnText, { color: cfg.accent }]}>
                  {secondaryAction.label}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={18} color={theme.color.inkMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  wrapCompact: {
    padding: 12,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    marginBottom: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.color.ink,
    marginBottom: 3,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.color.inkMuted,
    fontWeight: '600',
  },
  messageSolo: {
    fontWeight: '700',
    color: theme.color.ink,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: theme.radius.full,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
