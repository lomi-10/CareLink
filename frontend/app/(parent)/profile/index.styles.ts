// app/(parent)/profile/index.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, CARD_BG, BROWN, CARAMEL, GOLD,
  DARK, MUTED, DIVIDER, ICON_BG, SURFACE,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

export const s = StyleSheet.create({
  page:          { flex: 1, backgroundColor: BG },
  bar:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F1DDBE' },
  barBtn:        { padding: 8 },
  barTitle:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  scroll:        { paddingBottom: 32 },
  scrollDesktop: { padding: 32, paddingBottom: 48, maxWidth: 860, alignSelf: 'center', width: '100%' },

  // ── Hero card — solid warm gradient background (LinearGradient applies the fill) ──
  hero: {
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 18,
    padding: 20,
    overflow: 'hidden',
    ...CARD_SHADOW,
  } as any,
  heroDesktop: { marginHorizontal: 0, marginTop: 0 },
  editProfileBtn: {
    position: 'absolute', top: 16, right: 16,
    zIndex: 10,
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1.5, borderColor: CARAMEL,
  },

  // Decorative layered circles (low-opacity, behind content) — keeps the gradient
  // card from reading flat/plain, mirrors the "layered bg decoration" used elsewhere
  heroDecorA: {
    position: 'absolute', top: -36, right: -30,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  heroDecorB: {
    position: 'absolute', bottom: -50, left: -40,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(139,90,43,0.07)',
  },

  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  photoWrap: { position: 'relative' },
  photo:         { width: 78, height: 78, borderRadius: 39, borderWidth: 3, borderColor: SURFACE },
  photoFallback: { width: 78, height: 78, borderRadius: 39, backgroundColor: SURFACE, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: SURFACE },
  badgeOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 27, height: 27, borderRadius: 14,
    backgroundColor: BROWN,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: SURFACE,
  },
  heroInfo: { flex: 1, gap: 8 },
  heroName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK },
  pesoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: SURFACE,
    borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  pesoPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN, letterSpacing: 0.4 },

  // Strength block
  strengthBlock: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(139,90,43,0.20)' },
  strengthInfo: { flex: 1 },
  strengthLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN, letterSpacing: 0.6, marginBottom: 4, textTransform: 'uppercase' },
  strengthMsgRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  strengthMsg: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#6B4423', flexShrink: 1, lineHeight: 16 },

  // Strength ring
  ringOuter: { width: 64, height: 64, borderRadius: 32, borderWidth: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: SURFACE },
  ringPct:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, letterSpacing: -0.3 },

  // ── Section labels ──
  sectionLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginHorizontal: 16, marginBottom: 10, marginTop: 4 },

  // ── Quick Overview tiles ──
  overviewRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 22 },
  ovTile: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  ovIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  ovValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, letterSpacing: -0.3 },
  ovLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: BROWN, textAlign: 'center' },
  ovSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 9, color: MUTED },

  // ── Household Summary ──
  householdCard: {
    marginHorizontal: 16,
    marginBottom: 22,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: DIVIDER,
    ...CARD_SHADOW,
  } as any,
  householdRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  hhItem:   { alignItems: 'center', gap: 5, flex: 1 },
  hhIcon:   { width: 42, height: 42, borderRadius: 21, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  hhValue:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  hhLabel:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9.5, color: BROWN, textAlign: 'center' },
  householdBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ICON_BG,
    borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  householdBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  // ── Profile Sections list ──
  sectionsWrap: {
    marginHorizontal: 16,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DIVIDER,
    ...CARD_SHADOW,
  } as any,
  sectionCard:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  sectionDivider:   { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER, marginHorizontal: 16 },
  sectionIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionInfo:      { flex: 1 },
  sectionCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  sectionCardSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#6B4423' },
  sectionRight:     { alignItems: 'flex-end', gap: 6 },
  statusBadge:      { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
});
