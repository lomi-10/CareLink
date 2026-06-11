// app/(helper)/profile/public-preview.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, GREEN, CARD_BG, DIVIDER, ICON_BG } from './profile.theme';

export const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: PAGE_BG },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BAR_BG },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  barSpacer:{ width: 40 },

  noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF6EE', borderRadius: 14, padding: 12 },
  noticeText:   { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, lineHeight: 17 },

  // Hero card
  hero:       { backgroundColor: CARD_BG, borderRadius: 20, padding: 18, alignItems: 'center', gap: 10,
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 }, default: { boxShadow: '0 4px 16px rgba(139,94,60,0.08)' } as any }),
  },
  photo:         { width: 96, height: 96, borderRadius: 48 },
  photoFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  heroName:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK, textAlign: 'center' },
  heroLoc:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocText:{ fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },

  pesoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  pesoBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: GREEN },

  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  ratingSub:  { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  // Section cards
  card:      { backgroundColor: CARD_BG, borderRadius: 18, padding: 16, gap: 12,
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 12px rgba(139,94,60,0.07)' } as any }),
  },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  bioText:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, lineHeight: 20 },

  detailGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  detailBlock: { width: '47%' },
  detailLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:     { backgroundColor: ICON_BG, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#D4B896' },
  tagText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: ORANGE },

  emptyNote: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, fontStyle: 'italic' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER },
});
