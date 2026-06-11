// app/(helper)/profile/documents.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, GREEN, CARD_BG } from './profile.theme';

export const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: PAGE_BG },
  scroll: { padding: 16, paddingBottom: 32, gap: 12 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BAR_BG },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  barShield:{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  banner:       { backgroundColor: '#FEF6EE', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 12, overflow: 'hidden' },
  bannerIcon:   { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bannerText:   { flex: 1 },
  bannerTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 4 },
  bannerSub:    { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17 },
  bannerIllust: { position: 'absolute', right: 0, bottom: 0, width: 80, height: 80 },

  // Tab toggle
  tabRow:        { flexDirection: 'row', backgroundColor: '#F0E8DC', borderRadius: 14, padding: 4 },
  tab:           { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  tabActive:     { backgroundColor: DARK },
  tabText:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
  tabTextActive: { color: '#FFFFFF' },

  // Empty state
  emptyWrap:  { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  emptySub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },

  // Document list
  docList:    { backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 }, default: { boxShadow: '0 4px 14px rgba(139,94,60,0.08)' } as any }),
  },
  docRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  docDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#EDE0D0', marginHorizontal: 14 },
  docIcon:    { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  docInfo:    { flex: 1 },
  docName:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  docDate:    { fontFamily: FontFamily.fredokaRegular,  fontSize: 11, color: MUTED },
  docRight:   { alignItems: 'flex-end', gap: 8 },

  verifiedBadge: { backgroundColor: '#D1FAE5', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  verifiedText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },
  pendingBadge:  { backgroundColor: '#FEF3C7' },
  pendingText:   { color: '#D97706' },
  rejectedBadge: { backgroundColor: '#FEE2E2' },
  rejectedText:  { color: '#DC2626' },

  docActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },

  reuploadBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEE2D5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  reuploadText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: ORANGE },

  // Upload card
  uploadCard:    { backgroundColor: CARD_BG, borderRadius: 18, padding: 24, alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#EDE0D0', borderStyle: 'dashed' },
  uploadTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  uploadSub:     { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },
  uploadBtn:     { backgroundColor: DARK, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  uploadBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#FFFFFF' },

  // Verification History tab
  historyWrap:      { backgroundColor: CARD_BG, borderRadius: 18, padding: 32, alignItems: 'center', gap: 8 },
  historyTitle:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  historySub:       { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  historyStats:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 8 },
  historyStatsText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: GREEN },
});
