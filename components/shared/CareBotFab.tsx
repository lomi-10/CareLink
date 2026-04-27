import AnimatedPressable from '@/components/shared/AnimatedPressable';
import { CALM_MODAL_FROM, CALM_MODAL_IN, CALM_MODAL_OUT, CALM_MODAL_TRANSITION } from '@/components/shared/calmMoti';
import { MotiView } from 'moti';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Modal, StyleSheet, Platform, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { usePathname, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCareBot } from '@/contexts/CareBotContext';
import { theme } from '@/constants/theme';
import { CareBotChatPanel } from './CareBotChatPanel';

const FAB_SIZE = 56;

function segmentsIndicateParentOrHelper(segments: readonly string[] | string[][]): boolean {
  const flat = segments.flat().map((s) => String(s));
  return flat.some((s) => {
    const n = s.replace(/[()]/g, '');
    return (
      s === '(parent)' ||
      s === '(helper)' ||
      s === 'parent' ||
      s === 'helper' ||
      s.includes('(parent)') ||
      s.includes('(helper)') ||
      n === 'parent' ||
      n === 'helper'
    );
  });
}

export function CareBotFab() {
  const pathname = usePathname() ?? '';
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { isOpen, sessionKey, open, close } = useCareBot();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (isOpen) setExiting(false);
  }, [isOpen]);

  const requestClose = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      close();
      setExiting(false);
    }, CALM_MODAL_TRANSITION.duration);
  };

  const panelOpen = isOpen && !exiting;

  /** `usePathname()` often omits `(group)` segments on native; `useSegments()` is the source of truth. */
  const inParentOrHelperPortal = useMemo(() => {
    if (segmentsIndicateParentOrHelper(segments)) return true;
    const p = pathname.toLowerCase();
    return (
      pathname.includes('(parent)') ||
      pathname.includes('(helper)') ||
      pathname.startsWith('/parent') ||
      pathname.startsWith('/helper') ||
      p.includes('/parent/') ||
      p.includes('/helper/')
    );
  }, [segments, pathname]);

  const showFab = inParentOrHelperPortal;

  const isHelperPortal = useMemo(() => {
    const flat = segments.flat().map(String);
    if (flat.some((s) => s === '(helper)' || s === 'helper' || s.includes('(helper)'))) return true;
    const p = pathname.toLowerCase();
    return pathname.includes('(helper)') || pathname.startsWith('/helper') || p.includes('/helper/');
  }, [segments, pathname]);

  const { width: winW, height: winH } = Dimensions.get('window');
  const modalMaxH = Math.min(winH * 0.86, 720);
  const modalW = Math.min(440, winW * 0.92);
  /** Explicit height fixes RN layout: a maxHeight-only card collapses so only a thin line shows. */
  const cardHeight = Math.min(
    modalMaxH,
    Math.max(360, winH - insets.top - insets.bottom - 20),
  );

  const wrapStyle = useMemo(() => {
    const base = {
      flex: 1,
      justifyContent: 'center' as const,
      paddingTop: insets.top + 8,
      paddingBottom: insets.bottom + 8,
    };
    if (Platform.OS === 'web') {
      return {
        ...base,
        alignItems: 'flex-start' as const,
        paddingLeft: Math.min(96, winW * 0.08),
      };
    }
    return { ...base, alignItems: 'center' as const, paddingHorizontal: 12 };
  }, [insets.bottom, insets.top, winW]);

  const fabBottom = insets.bottom + (Platform.OS === 'ios' ? 92 : 76);

  return (
    <View style={styles.host} pointerEvents="box-none">
      {showFab ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.fabWrap,
            {
              bottom: fabBottom,
              right: Math.max(16, insets.right + 12),
            },
          ]}
        >
          <AnimatedPressable
            variant="primary"
            style={[styles.fab, isHelperPortal && styles.fabHelper]}
            onPress={open}
            accessibilityLabel="Open CareBot"
          >
            <Ionicons name="sparkles" size={26} color="#fff" />
          </AnimatedPressable>
        </View>
      ) : null}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={requestClose}
      >
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss CareBot"
          >
            <View style={[styles.modalDimming, StyleSheet.absoluteFill]} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalCenter, wrapStyle]} pointerEvents="box-none">
            <MotiView
              from={CALM_MODAL_FROM}
              animate={panelOpen ? { ...CALM_MODAL_IN } : { ...CALM_MODAL_OUT }}
              transition={CALM_MODAL_TRANSITION}
              style={[styles.card, { width: modalW, height: cardHeight, maxHeight: modalMaxH }]}
            >
              <CareBotChatPanel sessionKey={sessionKey} showChrome onRequestClose={requestClose} />
            </MotiView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Full-screen layer above the stack so the FAB and modal anchor correctly on native. */
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 9999,
    pointerEvents: 'box-none',
  },
  fabWrap: {
    position: 'absolute',
    zIndex: 100000,
    elevation: 10000,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: theme.color.parent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  fabHelper: {
    backgroundColor: theme.color.helper,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalDimming: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.color.surface,
    borderWidth: 1,
    borderColor: theme.color.line,
    flexShrink: 0,
    ...Platform.select({
      web: { boxShadow: '0 12px 40px rgba(15,23,42,0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
      },
    }),
  },
});
