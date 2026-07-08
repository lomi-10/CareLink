// app/(parent)/profile/document-detail.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { BG, CARD_BG, DARK, MUTED, CARAMEL } from '@/components/parent/home/parentWarmTheme';

export const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: BG },
  scroll: { padding: 16, paddingBottom: 40, gap: 14 },

  bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F1DDBE' },
  barBtn:   { padding: 8, marginRight: 4 },
  barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  barSpacer:{ width: 40 },

  // Status banner
  bannerVerified: { backgroundColor: '#D1FAE5', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerPending:  { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerRejected: { backgroundColor: '#FEE2E2', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 2 },
  bannerSub:      { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, lineHeight: 18 },

  // Document info card
  docCard: { backgroundColor: CARD_BG, borderRadius: 18, padding: 16,
    ...Platform.select({ ios: { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 }, android: { elevation: 3 }, default: { boxShadow: '0 4px 16px rgba(139,90,43,0.08)' } as any }),
  },
  docRow:     { flexDirection: 'row', gap: 14 },
  docThumb:   { width: 110, height: 140, borderRadius: 12, backgroundColor: '#F0E4D4', overflow: 'hidden' },
  docThumbImg:{ width: 110, height: 140 },
  docThumbFallback: { width: 110, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sideBadge:  { position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  sideBadgeText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 10 },
  flipBadge:  { position: 'absolute', bottom: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  sideToggle: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sideToggleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: '#EFE0CB', backgroundColor: '#FBF3E6' },
  sideToggleBtnActive: { backgroundColor: CARAMEL, borderColor: CARAMEL },
  sideToggleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
  sideToggleTextActive: { color: '#fff' },
  docDetails: { flex: 1, gap: 10 },
  docName:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginBottom: 4 },
  detailLabel:{ fontFamily: FontFamily.fredokaRegular,  fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  datesRow:   { flexDirection: 'row', gap: 16 },
  dateBlock:  { flex: 1 },

  // Verification details card
  verifyCard:   { backgroundColor: CARD_BG, borderRadius: 18, padding: 16,
    ...Platform.select({ ios: { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 12px rgba(139,90,43,0.07)' } as any }),
  },
  verifyCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 12 },
  verifyRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifyCheck:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  verifyText:      { flex: 1 },
  verifyBy:        { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  verifyDate:      { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },
  verifyBadge:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // Status progress — vertical timeline (robust on RN Yoga; horizontal flex rows
  // with `flex: 0` on the last item collapse to zero width on mobile)
  statusSection:    { gap: 12 },
  statusTitle:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  trackWrap:        { gap: 0 },
  trackRow:         { flexDirection: 'row', gap: 14 },
  trackRail:        { width: 32, alignItems: 'center' },
  progressCircle:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trackLine:        { width: 3, flex: 1, minHeight: 28, borderRadius: 2, marginVertical: 2 },
  trackTextWrap:    { flex: 1, paddingBottom: 22 },
  trackLabel:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  trackLabelDone:   { color: DARK },
  trackDesc:        { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },
  rejectedTrack:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FCA5A5' },
  rejectedTrackText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#B91C1C', lineHeight: 17 },

  // Action buttons
  actionsRow:   { flexDirection: 'row', gap: 12 },
  downloadBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F3E3CF', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#E0CBAE' },
  downloadText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  deleteBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF5F5', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#FCA5A5' },
  deleteText:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#DC2626' },
});
