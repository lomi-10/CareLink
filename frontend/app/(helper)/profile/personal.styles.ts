// app/(helper)/profile/personal.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, CARD_BG, DIVIDER, ICON_BG } from './profile.theme';

export const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: PAGE_BG },
  scroll: { padding: 16, paddingBottom: 32, gap: 12 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BAR_BG },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  editBtn:  { paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: ORANGE },

  banner:       { backgroundColor: '#FEF6EE', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  bannerIcon:   { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerText:   { flex: 1 },
  bannerTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  bannerSub:    { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17 },
  bannerIllust: { position: 'absolute', right: 0, bottom: 0, width: 80, height: 80, opacity: 0.8 },

  card:    { backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 12px rgba(139,94,60,0.08)' } as any }),
  },
  rowDiv:  { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER, marginHorizontal: 16 },

  groupLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginTop: 4, marginBottom: 4 },

  // InfoRow
  infoRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoIconWrap:{ width: 36, height: 36, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  infoLabel:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, flex: 1 },
  infoValue:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 14, color: MUTED, textAlign: 'right', maxWidth: '45%' },

  privacyCard:  { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 1 }, default: {} }),
  },
  privacyIcon:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  privacyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 3 },
  privacySub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17, flex: 1 },
});
