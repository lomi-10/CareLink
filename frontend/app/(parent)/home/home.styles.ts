// app/(parent)/home/home.styles.ts — flat warm palette, no ThemeColor dependency
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG, SURFACE,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

export const h = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  container:            { flex: 1, backgroundColor: BG },
  loadingContainer:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  mainContent:          { flex: 1, backgroundColor: BG },
  scrollContent:        { padding: 32, paddingBottom: 60 },
  mobileScrollContent:  { padding: 16, paddingBottom: 40 },

  // ── Desktop top bar ───────────────────────────────────────────────────────
  desktopTopBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  desktopPageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 28, color: DARK },
  desktopPageSub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginTop: 3 },
  desktopNotifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: DIVIDER, position: 'relative',
    ...CARD_SHADOW,
  },
  desktopNotifBtnActive: { backgroundColor: ICON_BG, borderColor: CARAMEL + '60' },
  notifBadge: {
    position: 'absolute', top: 5, right: 5,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, backgroundColor: CARAMEL,
  },
  notifBadgeText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 9 },

  // ── Stats grid ────────────────────────────────────────────────────────────
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 32 },
  mobileStatsRow:{ flexDirection: 'row', flexWrap: 'wrap', gap: 8,  marginBottom: 24 },

  // ── Quick actions ─────────────────────────────────────────────────────────
  quickActionsDesktop: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  quickActionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  qaDesktop:           { flex: 1 },
  quickActionDesktopCard: {
    flex: 1, backgroundColor: SURFACE, borderRadius: 18,
    padding: 24, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: DIVIDER,
    ...CARD_SHADOW,
  },
  quickActionDesktopIcon: {
    width: 64, height: 64, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionDesktopTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  quickActionDesktopDesc:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, textAlign: 'center' },

  // ── Hire banner ───────────────────────────────────────────────────────────
  hireBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: ICON_BG, borderRadius: 16, padding: 16,
    marginTop: 8, borderWidth: 1, borderColor: DIVIDER,
    ...CARD_SHADOW,
  },
  hireBannerLeft:    { flex: 1, gap: 4 },
  hireBannerTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: BROWN },
  hireBannerSub:     { fontFamily: FontFamily.fredokaRegular,  fontSize: 12.5, color: MUTED },
  hireBannerBtn:     { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: BROWN },
  hireBannerBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 13 },

  // ── Recent placement ──────────────────────────────────────────────────────
  recentTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 10 },
  recentRateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: ICON_BG,
    borderWidth: 1, borderColor: DIVIDER, marginBottom: 12,
  },
  recentRateBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
});
