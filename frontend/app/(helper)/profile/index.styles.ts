// app/(helper)/profile/index.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { makeProfileTheme, type ProfileTheme } from './profile.theme';

export function createStyles(t: ProfileTheme = makeProfileTheme()) {
  const { PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, GREEN, CARD_BG } = t;
  return StyleSheet.create({
  page:          { flex: 1, backgroundColor: PAGE_BG },
  bar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BAR_BG },
  barBtn:        { padding: 8, position: 'relative' },
  barRight:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifBadge:    { position: 'absolute', top: 6, right: 6, backgroundColor: ORANGE, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText:{ fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 9 },
  barTitle:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  scroll:        { paddingBottom: 32 },
  scrollDesktop: { padding: 32, paddingBottom: 48, maxWidth: 860, alignSelf: 'center', width: '100%' },

  // Hero card
  hero:          { borderRadius: 22, marginHorizontal: 16, marginTop: 12, marginBottom: 16, overflow: 'hidden' },
  heroDesktop:   { marginHorizontal: 0, marginTop: 0 },
  editCardBtn:   { position: 'absolute', top: 14, right: 14, zIndex: 10, width: 34, height: 34, borderRadius: 10, backgroundColor: '#FDF0D0', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  heroTop:       { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, paddingRight: 56 },
  photoCol:      { alignItems: 'center' },
  photo:         { width: 84, height: 84, borderRadius: 42, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)' },
  photoFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  heroInfo:      { flex: 1 },
  heroName:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: '#FFFFFF', lineHeight: 27, marginBottom: 6 },
  pesoBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', marginBottom: 7 },
  pesoBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: '#fff', letterSpacing: 0.5 },
  heroRoles:     { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: 'rgba(255,255,255,0.82)', marginBottom: 3 },
  heroExp:       { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  heroDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 16 },

  // Strength strip (inside hero card)
  strengthStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'rgba(0,0,0,0.22)' },
  strengthText:  { flex: 1 },
  strengthTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF', marginBottom: 2 },
  strengthMsg:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 15 },
  viewPublicBtn:  { alignItems: 'center', gap: 3 },
  viewPublicText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: 'rgba(255,255,255,0.75)' },

  // Resume banner — frames the profile as the helper's resume
  resumeBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: '#FFF3E6', borderWidth: 1, borderColor: '#F6D9B8', borderRadius: 18, padding: 14 },
  resumeIcon:   { width: 42, height: 42, borderRadius: 13, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  resumeTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  resumeSub:    { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED, lineHeight: 15, marginTop: 2 },
  resumeCta:    { alignItems: 'center', gap: 2, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#F6D9B8' },
  resumeCtaText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: ORANGE },

  // Quick overview
  sectionLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginHorizontal: 16, marginBottom: 10, marginTop: 4 },
  overviewCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD_BG, borderRadius: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center',
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 12px rgba(139,94,60,0.07)' } as any }),
  },
  overviewDiv:  { width: StyleSheet.hairlineWidth, backgroundColor: '#EDE0D0', marginVertical: 6 },
  ovTile:       { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  ovIcon:       { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  ovValue:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, letterSpacing: -0.3 },
  ovLabel:      { fontFamily: FontFamily.fredokaRegular,  fontSize: 11, color: MUTED, textAlign: 'center' },

  // Section cards
  sectionsWrap:     { marginHorizontal: 16, backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 14px rgba(139,94,60,0.08)' } as any }),
  },
  sectionCard:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sectionDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: '#EDE0D0', marginHorizontal: 16 },
  sectionIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionInfo:      { flex: 1 },
  sectionCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  sectionCardSub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },
  sectionRight:     { alignItems: 'flex-end' },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  // Strength ring
  ringOuter: { width: 58, height: 58, borderRadius: 29, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  ringPct:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, letterSpacing: -0.3 },

  // Recent Viewers
  viewersRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginBottom: 10, marginTop: 4 },
  viewersLabel:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  viewersDayChip:   { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  viewersDayText:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#D97706' },
  viewersCard:      { marginHorizontal: 16, marginBottom: 16, backgroundColor: CARD_BG, borderRadius: 18, overflow: 'hidden',
    ...Platform.select({ ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10 }, android: { elevation: 2 }, default: { boxShadow: '0 4px 12px rgba(139,94,60,0.07)' } as any }),
  },
  viewerItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  viewerItemDiv:    { height: StyleSheet.hairlineWidth, backgroundColor: '#EDE0D0', marginHorizontal: 16 },
  viewerAvatar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE0D0' },
  viewerAvatarFb:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EDE0D0', alignItems: 'center', justifyContent: 'center' },
  viewerName:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  viewerTime:       { fontFamily: FontFamily.fredokaRegular,  fontSize: 11, color: MUTED, marginTop: 1 },
  viewersEmpty:     { paddingVertical: 20, alignItems: 'center', gap: 6 },
  viewersEmptyTxt:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED },
  });
}
