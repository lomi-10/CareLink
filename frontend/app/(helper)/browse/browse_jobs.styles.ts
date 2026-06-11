// app/(helper)/browse/browse_jobs.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, CARD_BG, DIVIDER, ICON_BG,
} from './browseJobs.theme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 3 },
  default: { boxShadow: '0 4px 14px rgba(139,94,60,0.08)' } as any,
});

export function createHelperBrowseJobsStyles() {
  return StyleSheet.create({

    // ── Screen shells ──────────────────────────────────────────────────────────
    desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: PAGE_BG },
    mobileRoot:  { flex: 1, backgroundColor: PAGE_BG },

    desktopMain: { flex: 1, overflow: 'hidden' },
    desktopHero: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 24,
      backgroundColor: BAR_BG,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: DIVIDER,
    },
    heroTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: DARK, letterSpacing: -0.3 },
    heroSub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginTop: 3 },
    heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    savedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#EFF6FF',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#2563EB33',
    },
    savedBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#2563EB' },

    applicationsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: ORANGE + '66',
      backgroundColor: '#FFF3EC',
    },
    applicationsBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: ORANGE },

    // ── Mobile top bar ─────────────────────────────────────────────────────────
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: BAR_BG,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: DIVIDER,
    },
    menuBtn: { padding: 8 },
    mobileTitleWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mobileTitle:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
    mobileCountBadge: {
      backgroundColor: '#FFF3EC',
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: ORANGE + '44',
    },
    mobileCountText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: ORANGE },

    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    applicationsIconBtn: { padding: 8, position: 'relative' },
    notifBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: ORANGE, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    notifBadgeText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 9 },
    savedDot: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#2563EB',
      borderWidth: 1.5,
      borderColor: BAR_BG,
    },

    // ── Feed ───────────────────────────────────────────────────────────────────
    feed: { flex: 1 },

    searchStrip: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: BAR_BG,
    },

    resultsBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: BAR_BG,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: DIVIDER,
    },
    resultsLeft:         { flexDirection: 'row', alignItems: 'center' },
    resultsCount:        { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
    resultsFiltered:     { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
    clearFiltersBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clearFiltersBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: ORANGE },

    // ── Recommended section ────────────────────────────────────────────────────
    recommendedSection: {
      paddingTop: 20,
      paddingBottom: 4,
    },
    recommendedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      marginBottom: 14,
    },
    recommendedTitle: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 18,
      color: DARK,
    },
    recommendedScroll: {
      paddingLeft: 16,
      paddingRight: 8,
      paddingBottom: 12,
      gap: 12,
    },

    // ── Families section header ────────────────────────────────────────────────
    familiesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 10,
    },
    familiesHeaderText: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 18,
      color: DARK,
    },

    // ── Lists ─────────────────────────────────────────────────────────────────
    listMobile:       { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 96 },
    listDesktop:      { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 60 },
    mobileCardWrap:   { marginBottom: 0 },
    desktopParentWrap:{ flex: 1, maxWidth: '50%', paddingHorizontal: 8, marginBottom: 4 },
    colWrapper:       { marginBottom: 8 },

    // ── Empty state ────────────────────────────────────────────────────────────
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 20 },
    emptyIconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: ICON_BG,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 8, textAlign: 'center' },
    emptyBody: {
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 14,
      color: MUTED,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
      maxWidth: 290,
    },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: DARK,
      paddingHorizontal: 24,
      paddingVertical: 13,
      borderRadius: 12,
      ...CARD_SHADOW,
    },
    emptyBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 14 },
  });
}
