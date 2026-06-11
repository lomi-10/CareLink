// app/(parent)/profile/detail.styles.ts
// Shared styles for the 4 profile detail screens (personal, household, address, documents)
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, CARD_BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

export const ds = StyleSheet.create({
  page:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 32, gap: 14 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F1DDBE' },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  editBtn:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ICON_BG },

  // Centered hero icon
  iconHero: {
    alignSelf: 'center',
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: CARD_BG,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1, borderColor: DIVIDER,
  },

  card: {
    backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: DIVIDER,
    ...CARD_SHADOW,
  } as any,
  rowDiv: { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER, marginHorizontal: 16 },

  groupLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginTop: 2, marginBottom: -2 },

  // Field rows
  infoRow:      { paddingHorizontal: 16, paddingVertical: 13, gap: 4 },
  infoRowInline:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  infoLabel:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: MUTED, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValueBox: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    borderWidth: 1, borderColor: DIVIDER,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  infoValue:    { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK },

  // Action button
  primaryBtn: {
    backgroundColor: CARAMEL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    ...CARD_SHADOW,
  } as any,
  primaryBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#FFFFFF' },

  // Children Details rows
  childRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  childIcon:{ width: 38, height: 38, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  childInfo:{ flex: 1 },
  childName:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 1 },
  childSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
});
