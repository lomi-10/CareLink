import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  DARK, MUTED, SUBTLE, ORANGE, GREEN, DIVIDER, ICON_BG, SURFACE, OVERLAY,
  SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG, INFO_BG,
} from '@/components/helper/home/helperWarmTheme';

const WARNING = '#D97706';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 16px rgba(139,94,60,0.08)' } as any,
});

const HERO_SHADOW = Platform.select({
  ios:     { shadowColor: '#1E0A04', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 16 },
  android: { elevation: 6 },
  default: { boxShadow: '0 8px 24px rgba(30,10,4,0.25)' } as any,
});

export function createHelperWorkScheduleStyles() {
  return StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },

    // ── Leave Balance hero ─────────────────────────────────────────────────
    hero: { borderRadius: 22, padding: 18, marginBottom: 16, ...HERO_SHADOW },
    heroSection: {},
    heroDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginVertical: 14 },
    heroHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    heroIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroLabel: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 12,
      color: SUBTLE,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroBigValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: '#fff' },
    heroSubtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: SUBTLE, marginTop: 4, lineHeight: 18 },
    heroInfoTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff', marginBottom: 4 },
    heroInfoText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: SUBTLE, lineHeight: 18 },
    heroCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#fff',
      paddingVertical: 13,
      borderRadius: 12,
    },
    heroCtaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: ORANGE },

    // ── Preview banner (before employment start) ───────────────────────────
    previewBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: INFO_BG,
      borderRadius: 16,
      padding: 14,
      marginBottom: 14,
      ...CARD_SHADOW,
    },
    previewBannerIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: SURFACE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewBannerText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, lineHeight: 18 },

    // ── Generic white card ────────────────────────────────────────────────
    card: { backgroundColor: SURFACE, borderRadius: 18, padding: 16, marginBottom: 14, ...CARD_SHADOW },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    cardHeaderIconWrap: { width: 30, height: 30, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
    cardHeaderTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
    todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: ICON_BG },
    todayBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: ORANGE },

    // ── Month nav ────────────────────────────────────────────────────────
    weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    navBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
    navBtnDisabled: { opacity: 0.35 },
    weekLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },

    // ── Calendar legend ──────────────────────────────────────────────────
    calLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14, justifyContent: 'center' },
    calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    calLegendDot: { width: 10, height: 10, borderRadius: 5 },
    calLegendText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

    // ── Leave Requests / Upcoming rows ──────────────────────────────────────
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    listRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
    rowIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rowTextCol: { flex: 1, gap: 2 },
    rowTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
    rowSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
    upcomingList: { gap: 10 },
    upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    pillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
    emptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 8 },

    // ── Attendance summary (this week) ──────────────────────────────────────
    weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dayCol: { alignItems: 'center', gap: 6 },
    dayLbl: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED },
    weekDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    weekDotPresent: { backgroundColor: GREEN },
    weekDotScheduled: { backgroundColor: 'transparent', borderWidth: 2, borderColor: SUBTLE },
    weekDotMissed: { backgroundColor: DANGER },
    daysWorkedText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 2 },
    encourageText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 14 },
    weekLegendRow: { flexDirection: 'row', gap: 16 },
    weekLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    weekLegendText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

    // ── History link ─────────────────────────────────────────────────────
    historyLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
    historyLinkText: { fontFamily: FontFamily.fredokaSemiBold, color: ORANGE, fontSize: 14 },

    // ── Leave-request modal ──────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: OVERLAY,
      ...Platform.select({
        web: { justifyContent: 'center', padding: 20 },
        default: { justifyContent: 'flex-end' },
      }),
    },
    modalCard: {
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      backgroundColor: SURFACE,
      padding: 24,
      paddingBottom: 36,
      ...CARD_SHADOW,
      ...Platform.select({
        web: { borderRadius: 20, maxHeight: '90%' as const },
        default: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
      }),
    },
    modalTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK, marginBottom: 16 },
    modalLabel: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 13,
      color: MUTED,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    datePickRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: DIVIDER,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    datePickText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
    reasonInput: {
      borderWidth: 1,
      borderColor: DIVIDER,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      fontFamily: FontFamily.fredokaRegular,
      color: DARK,
      minHeight: 88,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
    modalCancelText: { fontFamily: FontFamily.fredokaSemiBold, color: MUTED },
    modalSubmit: {
      backgroundColor: ORANGE,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
      minWidth: 120,
      alignItems: 'center',
    },
    modalSubmitDisabled: { opacity: 0.6 },
    modalSubmitText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 16 },
    pickerWrap: {
      borderWidth: 1,
      borderColor: DIVIDER,
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    },
    picker: { width: '100%' },
    previewBox: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: ICON_BG,
    },
    previewLine: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
    previewWarn: {
      marginTop: 8,
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 13,
      color: WARNING,
      lineHeight: 18,
    },

    // ── Selected-date modal ──────────────────────────────────────────────
    detailOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: OVERLAY,
      padding: 20,
    },
    detailCard: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      borderRadius: 22,
      overflow: 'hidden',
      ...HERO_SHADOW,
    },
    detailHero: { padding: 20 },
    detailHeroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
    detailWeekday: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailDateText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: '#fff', marginTop: 2 },
    detailCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.10)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailStatusPill: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: 'rgba(255,255,255,0.10)',
      marginBottom: 16,
    },
    detailStatusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
    detailInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    detailInfoCol: { flexBasis: '45%', gap: 2 },
    detailInfoLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.5 },
    detailInfoValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
    detailNote: {
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 13,
      color: SUBTLE,
      lineHeight: 18,
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },
    detailCheckBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 14,
      borderRadius: 14,
      marginTop: 18,
    },
    detailCheckBtnIn: { backgroundColor: ORANGE },
    detailCheckBtnOut: { backgroundColor: GREEN },
    detailCheckBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.10)' },
    detailCheckBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
  });
}

export type HelperWorkScheduleStyles = ReturnType<typeof createHelperWorkScheduleStyles>;
