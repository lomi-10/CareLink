// app/(helper)/profile/skills.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, CARD_BG } from './profile.theme';

export const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: PAGE_BG },
  scroll: { padding: 16, paddingBottom: 32, gap: 12 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BAR_BG },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  editBtn:  { paddingHorizontal: 12, paddingVertical: 6 },
  editText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: ORANGE },

  banner:       { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4, overflow: 'hidden' },
  bannerIcon:   { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerText:   { flex: 1 },
  bannerTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  bannerSub:    { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17 },
  bannerIllust: { position: 'absolute', right: 0, bottom: 0, width: 80, height: 80 },

  groupLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginTop: 4, marginBottom: 4 },

  // PillSection
  pillWrap:      { backgroundColor: CARD_BG, borderRadius: 18, padding: 16, marginBottom: 0,
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 12px rgba(139,94,60,0.07)' } as any }),
  },
  pillHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  pillTitle:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  pillBadge:     { backgroundColor: '#F5E6CC', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#7A4E2A' },
  pillEmpty:     { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#9A7B5A', fontStyle: 'italic' },
  pillsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:          { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText:      { fontFamily: FontFamily.fredokaRegular, fontSize: 13 },

  // Experience card
  expCard:  { backgroundColor: CARD_BG, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: { boxShadow: '0 3px 10px rgba(139,94,60,0.07)' } as any }),
  },
  expIcon:  { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  expValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 2 },
  expLabel: { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },
  expEdit:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },
});
