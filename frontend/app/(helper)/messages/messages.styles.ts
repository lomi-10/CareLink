// app/(helper)/messages/messages.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

// ── Palette — warm helper theme (matches applications/browse) ────────────────
export const DARK     = '#2A1608';
export const MUTED    = '#7A5C3E';
export const SUBTLE   = '#B0A090';
export const ORANGE   = '#E86019';
export const GREEN    = '#059669';
export const BLUE     = '#2563EB';
export const DIVIDER  = '#EDE0D0';
export const ICON_BG  = '#F5E6CC';
export const PAGE_BG  = '#FBF5EC';
export const SURFACE  = '#FFFFFF';
export const SUCCESS_BG = '#ECFDF5';
export const WARNING_BG = '#FEF3C7';
export const DANGER    = '#DC2626';
export const DANGER_BG = '#FCE4E4';
export const OVERLAY  = 'rgba(42, 22, 8, 0.5)';
export const ACCENT   = ORANGE;

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  android: { elevation: 1 },
  default: { boxShadow: '0 2px 8px rgba(139,94,60,0.06)' } as any,
});

export function createHelperMessagesStyles() {
  return StyleSheet.create({
    desktopWrap: { flex: 1, flexDirection: 'row', backgroundColor: PAGE_BG },
    desktopMain: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

    convPanel: {
      width: 320,
      backgroundColor: SURFACE,
      borderRightWidth: 1,
      borderRightColor: DIVIDER,
    },
    convPanelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    convPanelTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, flex: 1 },
    convPanelCount: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 12,
      color: ORANGE,
      backgroundColor: ICON_BG,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 999,
    },

    convSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 14,
      marginVertical: 12,
      backgroundColor: PAGE_BG,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    convSearchInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, padding: 0 },

    convItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    convItemActive: { backgroundColor: ICON_BG },
    convAvaWrap: { position: 'relative' },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: ORANGE,
      borderRadius: 8,
      minWidth: 17,
      height: 17,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: SURFACE,
    },
    badgeTxt: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 10 },
    convRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    convName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, flex: 1, marginRight: 6 },
    convTime: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: SUBTLE },
    convJob: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: ORANGE, marginBottom: 2 },
    convPreview: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
    convPreviewPendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    convPreviewPending:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE, fontStyle: 'italic' },

    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginTop: 14, marginBottom: 6 },
    emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 20 },

    chatPanelWrap: { flex: 1, backgroundColor: PAGE_BG },
    noChatWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    noChatIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: ICON_BG,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    noChatTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: DARK, marginBottom: 8 },
    noChatSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, maxWidth: 300 },

    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: SURFACE,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: DIVIDER,
    },
    menuBtn: { padding: 8 },
    mobileTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
    notifBtn: { padding: 8, position: 'relative' },
    notifBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: ORANGE, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    notifBadgeText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 9 },

    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: SURFACE,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
      ...Platform.select({ web: { boxShadow: '0 1px 4px rgba(139,94,60,0.06)' } }),
    },
    chatBack: { marginRight: 8, padding: 4 },
    chatHeaderName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
    chatHeaderSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
    callBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: ICON_BG,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 6,
      borderWidth: 1,
      borderColor: DIVIDER,
    },

    // Tab bar (Messages / Contract / Interview)
    chatTabBar: {
      flexDirection: 'row',
      backgroundColor: SURFACE,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
      gap: 6,
    },
    chatTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: ICON_BG,
      position: 'relative',
    },
    chatTabBtnActive: { backgroundColor: ORANGE },
    chatTabBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
    chatTabBtnTextActive: { color: '#fff' },
    chatTabDot: { position: 'absolute', top: 6, right: 10, width: 8, height: 8, borderRadius: 4 },
    chatTabDotAmber: { backgroundColor: '#F59E0B' },
    chatTabDotBlue: { backgroundColor: '#3B82F6' },

    // Contract / Interview tab shared
    contractTabBody: { flex: 1, padding: 14 },
    contractHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    contractHeaderTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },

    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusPillTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
    statusPillAmber: { backgroundColor: WARNING_BG },
    statusPillGreen: { backgroundColor: SUCCESS_BG },
    statusPillRed: { backgroundColor: DANGER_BG },
    statusPillBlue: { backgroundColor: '#DBEAFE' },
    statusPillGray: { backgroundColor: ICON_BG },

    contractSummaryCard: {
      backgroundColor: SURFACE,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: DIVIDER,
      padding: 14,
      marginBottom: 14,
      ...CARD_SHADOW,
    } as any,
    contractRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
      gap: 10,
    },
    contractRowLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, flexShrink: 0 },
    contractRowValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, flex: 1, textAlign: 'right' },

    contractSignStatus: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 14, textAlign: 'center' },
    contractActionBtnsCol: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start' },

    // Empty states (no contract / no interview)
    contractEmptyState: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
    contractEmptyIconWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: ICON_BG,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    contractEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginBottom: 6 },
    contractEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
    contractEmptyBtns: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },

    contractOutlineBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: ORANGE,
      backgroundColor: SURFACE,
    },
    contractOutlineBtnTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },
    contractDangerOutlineBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: DANGER,
      backgroundColor: SURFACE,
    },
    contractDangerOutlineBtnTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DANGER },
    contractDeclineBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: DANGER_BG,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    contractDeclineBannerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DANGER },
    contractDeclineBannerText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 17 },
    contractPrimaryBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: GREEN,
      minWidth: 88,
      alignItems: 'center',
    },
    contractPrimaryBtnDisabled: { opacity: 0.45 },
    contractPrimaryBtnTxt: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 13 },
    contractPdfModal: { flex: 1, backgroundColor: SURFACE },
    contractPdfHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    contractPdfTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
    contractPdfClose: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: ORANGE },

    chatLoadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE_BG },

    dateDividerWrap: { alignItems: 'center', marginVertical: 10 },
    dateDivider: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 11,
      color: MUTED,
      backgroundColor: ICON_BG,
      paddingHorizontal: 11,
      paddingVertical: 4,
      borderRadius: 999,
    },

    chatEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    chatEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginTop: 14 },
    chatEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginTop: 6 },

    bubbleWrap: { marginBottom: 4, maxWidth: '75%' },
    bubbleWrapRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    bubbleWrapLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    // flexShrink:1 + minWidth:0 are load-bearing: the bubble sits in a flexDirection:'row'
    // wrapper and RN defaults flexShrink to 0 (CSS defaults to 1), so without these a long
    // message renders at its full intrinsic width and overflows the 75% cap instead of wrapping.
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, flexShrink: 1, minWidth: 0 },
    bubbleMine: { backgroundColor: ORANGE, borderBottomRightRadius: 4 },
    bubbleTheirs: {
      backgroundColor: SURFACE,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: DIVIDER,
      ...CARD_SHADOW,
    },
    bubbleText: { fontFamily: FontFamily.fredokaRegular, fontSize: 15, color: DARK, lineHeight: 21 },
    bubbleTextMine: { color: '#fff' },
    editedLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: 'rgba(42,22,8,0.4)', marginTop: 2 },
    editedLabelMine: { color: 'rgba(255,255,255,0.65)' },
    bubbleMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: SUBTLE, marginTop: 3 },
    bubbleMetaRight: { alignSelf: 'flex-end' },
    bubbleMetaLeft: { alignSelf: 'flex-start' },

    imgBubble: { width: 200, height: 160, borderRadius: 14, backgroundColor: DIVIDER },

    videoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: SURFACE,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1.5,
      borderColor: ORANGE,
      maxWidth: 260,
      gap: 10,
    },
    videoCardMine: { backgroundColor: ORANGE, borderColor: 'rgba(255,255,255,0.35)' },
    videoCardIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: ORANGE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
    videoCardSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 1 },

    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: SURFACE,
      borderTopWidth: 1,
      borderTopColor: DIVIDER,
      gap: 8,
    },
    inputIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: PAGE_BG,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    input: {
      flex: 1,
      backgroundColor: PAGE_BG,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 15,
      color: DARK,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: ORANGE,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendBtnDisabled: { opacity: 0.35 },
    editBubbleBtn: { padding: 4, marginBottom: 2 },

    editModalOverlay: {
      flex: 1,
      backgroundColor: OVERLAY,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    editModalBox: {
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 440,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    editModalTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginBottom: 12 },
    editModalInput: {
      backgroundColor: PAGE_BG,
      borderRadius: 10,
      padding: 12,
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 15,
      color: DARK,
      minHeight: 80,
      maxHeight: 180,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    editModalBtns: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
    editModalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
    editModalCancelTxt: { fontFamily: FontFamily.fredokaSemiBold, color: MUTED, fontSize: 14 },
    editModalSave: { backgroundColor: ORANGE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    editModalSaveTxt: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 14 },

    imgViewerBg: { flex: 1, backgroundColor: 'rgba(42,22,8,0.92)', justifyContent: 'center', alignItems: 'center' },
    imgViewerImg: { width: '90%', height: '80%' },
  });
}
