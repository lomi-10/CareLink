// app/(parent)/hire/active_helpers.styles.ts — flat warm palette, no ThemeColor dependency
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, DARK, MUTED, DIVIDER, ICON_BG, SURFACE,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 },
  android: { elevation: 2 },
  default: { boxShadow: '0 3px 10px rgba(139,90,43,0.07)' } as any,
});

export const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  rootRow: { flex: 1, flexDirection: 'row', backgroundColor: BG },
  main:    { flex: 1, maxWidth: 720, alignSelf: 'center', width: '100%' },

  desktopHead: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  pageTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: DARK },
  pageSub:     { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginTop: 4 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 88 },

  lead:  { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, lineHeight: 22, marginBottom: 16 },
  bold:  { fontFamily: FontFamily.fredokaSemiBold, color: DARK },
  empty: { fontFamily: FontFamily.fredokaRegular, fontSize: 15, color: MUTED, textAlign: 'center', marginTop: 32, paddingHorizontal: 16 },

  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, marginTop: 28, marginBottom: 10 },
  sectionSub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 20 },

  pastCard: {
    borderRadius: 16, borderWidth: 1, borderColor: DIVIDER,
    padding: 14, marginBottom: 12, backgroundColor: SURFACE,
    ...CARD_SHADOW,
  },
  pastHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  pastName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, flex: 1 },
  pastMeta: { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 18 },
  pastEmpty:{ fontFamily: FontFamily.fredokaRegular,  fontSize: 14, color: MUTED, marginTop: 8, lineHeight: 20 },

  rateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: ICON_BG, borderWidth: 1, borderColor: DIVIDER,
  },
  rateBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },
});
