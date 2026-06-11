// app/(parent)/browse/browse_helpers.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG, SURFACE, GREEN,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

export const s = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────────────────────
  container:    { flex: 1, backgroundColor: BG },
  mainContent:  { flex: 1, backgroundColor: BG },
  contentWrapper: { flex: 1, backgroundColor: BG },

  // ── Desktop page header ──────────────────────────────────────────────────────
  pageHeader: { paddingHorizontal: 32, paddingTop: 32, paddingBottom: 16, backgroundColor: 'transparent' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 32, color: DARK },

  // ── Mobile top bar ─────────────────────────────────────────────────────────
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#F1DDBE',
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  mobileTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK },
  menuButton:  { padding: 8 },

  // ── Recommended section ───────────────────────────────────────────────────
  recSection: {
    paddingTop: 18, paddingBottom: 16,
    backgroundColor: '#FFF4E6',
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  recHeaderRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 16, marginBottom: 14,
  },
  recIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center',
  },
  recHeaderText: { flex: 1 },
  recTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16.5, color: DARK },
  recSubtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, marginTop: 1 },
  recSubtitleAccent: { fontFamily: FontFamily.fredokaSemiBold, color: CARAMEL },

  recScroll: { paddingHorizontal: 16, gap: 12 },

  recCard: {
    width: 200,
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1, borderColor: DIVIDER,
    padding: 14, gap: 10,
    ...CARD_SHADOW,
  },
  recTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: ICON_BG },
  recAvatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  recInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: BROWN },
  recInfo:   { flex: 1, minWidth: 0 },
  recName:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  recMeta:   { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED, marginTop: 1 },

  recMatchBadge: {
    backgroundColor: '#FEF9EF', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#F5D797',
  },
  recMatchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#B45309' },

  recChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recChip: {
    backgroundColor: ICON_BG, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  recChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },

  // ── Results bar ───────────────────────────────────────────────────────────
  resultsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  resultsText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },

  // ── Grid ─────────────────────────────────────────────────────────────────
  listContainer: { padding: 12, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 4 },
  mobileCardWrapper:  { flex: 1, maxWidth: '50%', paddingHorizontal: 4, marginBottom: 8 },
  desktopCardWrapper: { flex: 1, maxWidth: '33.333%', paddingHorizontal: 8, marginBottom: 16 },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
  emptyText:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginTop: 16, marginBottom: 8 },
  emptySubtext: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, textAlign: 'center', marginBottom: 24 },
  resetButton:  { backgroundColor: BROWN, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  resetButtonText: { fontFamily: FontFamily.fredokaSemiBold, color: SURFACE, fontSize: 15 },
});

// Re-export palette constants so browse/index.tsx can use them
export { BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG, SURFACE, GREEN };
