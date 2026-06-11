// app/(parent)/settings/settings.styles.ts — flat warm palette
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG, SURFACE,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 1 },
  default: { boxShadow: '0 2px 8px rgba(139,90,43,0.06)' } as any,
});

export const ss = StyleSheet.create({
  // ── Desktop layout ─────────────────────────────────────────────────────────
  desktopRoot:      { flex: 1, flexDirection: 'row', backgroundColor: BG },
  desktopMain:      { flex: 1, maxHeight: '100%' as unknown as number, backgroundColor: BG },
  desktopScroll:    { padding: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  desktopTopBar:    { marginBottom: 20 },
  desktopPageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: DARK },
  desktopPageSub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 14, color: MUTED, marginTop: 4 },

  // ── Mobile layout ─────────────────────────────────────────────────────────
  mobileRoot:   { flex: 1, backgroundColor: BG },
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: DIVIDER,
    ...CARD_SHADOW,
  },
  backBtn:           { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  mobileHeaderTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, flex: 1, textAlign: 'center' },
  mobileBody:        { flex: 1, paddingHorizontal: 16, paddingBottom: 88 },

  // ── Sections ───────────────────────────────────────────────────────────────
  section:      { marginBottom: 24 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginBottom: 10 },
  sectionHint:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 18 },

  // ── Appearance options ─────────────────────────────────────────────────────
  options:   { gap: 10, marginTop: 4 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER,
    ...CARD_SHADOW,
  },
  optionIcon:  { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ICON_BG },
  optionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  optionHint:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 16 },

  // ── Theme cards ────────────────────────────────────────────────────────────
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    width: '48%', minWidth: 150, flexGrow: 1,
    padding: 12, borderRadius: 14, borderWidth: 1.5,
    backgroundColor: SURFACE, borderColor: DIVIDER,
    ...CARD_SHADOW,
  },
  themeCardSelected: { backgroundColor: ICON_BG, borderColor: BROWN },
  themeCardLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 4 },
  themeCardHint:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 16 },

  // ── Activity log ───────────────────────────────────────────────────────────
  logItem: {
    padding: 14, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: DIVIDER, borderLeftWidth: 4, borderLeftColor: BROWN,
    backgroundColor: SURFACE, ...CARD_SHADOW,
  },
  logAction: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  logTime:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, marginTop: 4 },
  emptyText: { fontFamily: FontFamily.fredokaRegular,  fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 8 },
  center:    { paddingVertical: 24, alignItems: 'center' },
});
