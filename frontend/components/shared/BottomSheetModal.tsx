// components/shared/BottomSheetModal.tsx
//
// The shape a form modal should take on a phone: a BOTTOM SHEET (half-sheet).
// Edge-to-edge horizontally, rounded top corners, anchored to the bottom, and
// only as tall as it needs to be — never a floating card with margins on all
// four sides, and never a full-screen takeover.
//
// WHY THIS IS THE RIGHT SHAPE ON MOBILE
// • Thumb reach. A sheet rises from the bottom, so its primary action sits in
//   the easiest third of the screen. A centred card puts the button mid-screen
//   and the close affordance at the very top, which is the hardest place to
//   reach one-handed.
// • Context is preserved. The dimmed screen behind stays partly visible, so the
//   sheet reads as "a layer on top of what I was doing" rather than a new
//   place. A full-screen modal loses that and feels like navigation.
// • Horizontal margins waste the scarcest resource on a phone — width. Inputs
//   in a side-inset card are noticeably narrower for no benefit.
//
// ON DESKTOP the constraint inverts: width is plentiful, height is scarce and
// bottom-anchoring is meaningless with a mouse. So on web this renders as a
// centred card instead. Same component, correct shape per platform.

import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Platform,
  KeyboardAvoidingView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontFamily } from '@/constants/GlobalStyles';

export function BottomSheetModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  /** Share of screen height the sheet may occupy on mobile. */
  maxHeightRatio = 0.9,
  surface = '#FFFDF9',
  ink = '#2A1608',
  muted = '#7A5C3E',
  line = '#EFE0CB',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pinned below the scrollable body — put the primary action here. */
  footer?: React.ReactNode;
  maxHeightRatio?: number;
  surface?: string;
  ink?: string;
  muted?: string;
  line?: string;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const sheet = (
    <View
      style={[
        isWeb ? s.webCard : s.sheet,
        { backgroundColor: surface, maxHeight: height * maxHeightRatio },
        !isWeb && { paddingBottom: Math.max(insets.bottom, 12) },
      ]}
    >
      {/* Grabber: the standard signal that a surface is a dismissible sheet.
          Meaningless with a mouse, so it's mobile-only. */}
      {!isWeb && <View style={[s.grabber, { backgroundColor: line }]} />}

      {!!title && (
        <View style={[s.header, { borderBottomColor: line }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {!!title && <Text style={[s.title, { color: ink }]} numberOfLines={1}>{title}</Text>}
            {!!subtitle && <Text style={[s.subtitle, { color: muted }]} numberOfLines={2}>{subtitle}</Text>}
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            style={s.close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={muted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={s.body}>{children}</View>

      {!!footer && <View style={[s.footer, { borderTopColor: line }]}>{footer}</View>}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isWeb ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Tapping the dimmed area closes — expected of a sheet, and it gives a
          one-handed escape that doesn't require reaching the top-right X. */}
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={isWeb ? s.webWrap : s.wrap}
        >
          {/* Swallows taps so pressing inside the sheet never dismisses it. */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={isWeb ? undefined : { width: '100%' }}>
            {sheet}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },

  // Mobile: bottom-anchored, full width.
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.18, shadowRadius: 18 },
      android: { elevation: 16 },
      default: {},
    }),
  },
  grabber: { alignSelf: 'center', width: 42, height: 4.5, borderRadius: 3, marginBottom: 10 },

  // Web: centred card — bottom-anchoring is meaningless with a mouse.
  webWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  webCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 20,
    paddingTop: 4,
    overflow: 'hidden',
    ...Platform.select({ default: { boxShadow: '0 24px 60px rgba(0,0,0,0.35)' } as any }),
  },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18 },
  subtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, marginTop: 2, lineHeight: 18 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  body: { paddingHorizontal: 20, paddingTop: 14, flexShrink: 1 },

  // Pinned so the primary action stays reachable however long the form is.
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
