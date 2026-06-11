// app/(parent)/profile/documents.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, CARD_BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, GREEN, SUCCESS_BG,
  WARNING_BG, DANGER, DANGER_BG, ICON_BG,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

export const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 32, gap: 12 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F1DDBE' },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  barShield:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  banner:       { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: DIVIDER },
  bannerIcon:   { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bannerText:   { flex: 1 },
  bannerTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 4 },
  bannerSub:    { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17 },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  emptySub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },

  // Document list
  docList: {
    backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: DIVIDER,
    ...CARD_SHADOW,
  } as any,
  docRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  docDivider: { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER, marginHorizontal: 14 },
  docIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docInfo:    { flex: 1 },
  docName:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  docDate:    { fontFamily: FontFamily.fredokaRegular,  fontSize: 11, color: MUTED },
  docRight:   { alignItems: 'flex-end', gap: 8 },

  verifiedBadge: { backgroundColor: SUCCESS_BG, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  verifiedText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },
  pendingBadge:  { backgroundColor: WARNING_BG },
  pendingText:   { color: '#D97706' },
  rejectedBadge: { backgroundColor: DANGER_BG },
  rejectedText:  { color: DANGER },

  docActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  reuploadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ICON_BG, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  reuploadText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },

  // Upload card
  uploadCard:    { backgroundColor: CARD_BG, borderRadius: 18, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: DIVIDER, borderStyle: 'dashed' },
  uploadTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  uploadSub:     { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },
  uploadBtn:     { backgroundColor: CARAMEL, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  uploadBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#FFFFFF' },
});
