// app/(helper)/home/home.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { DARK, MUTED, ORANGE, ICON_BG, DIVIDER, SURFACE, PAGE_BG } from '@/components/helper/home/helperWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,94,60,0.07)' } as any,
});

export function createHelperHomeStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: PAGE_BG },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE_BG },
    mainContent: { flex: 1 },
    scrollContent: { padding: 32, paddingBottom: 60 },
    statsGrid: { flexDirection: 'row', gap: 20, marginBottom: 40 },
    mobileScrollContent: { padding: 16, paddingBottom: 40 },
    mobileStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },

    desktopTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    desktopPageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: DARK, letterSpacing: -0.5 },
    desktopPageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginTop: 3 },

    desktopNotifBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: SURFACE,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    desktopNotifBtnActive: {
      backgroundColor: ICON_BG,
      borderColor: ORANGE + '40',
    },
    notifBadge: {
      position: 'absolute',
      top: 6,
      right: 6,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    notifBadgeText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 9 },

    qaDesktop: {
      flex: 1,
      minWidth: 140,
      backgroundColor: SURFACE,
      borderRadius: 16,
      padding: 20,
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: DIVIDER,
      ...CARD_SHADOW,
    },
    qaDesktopIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    qaDesktopTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 4 },
    qaDesktopDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, lineHeight: 17 },

    recruitBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: ICON_BG,
      borderRadius: 14,
      padding: 16,
      marginTop: 8,
      borderWidth: 1,
      borderColor: ORANGE + '30',
    },
    recruitBannerLeft: { flex: 1 },
    recruitBannerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: ORANGE, marginBottom: 3 },
    recruitBannerSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
    recruitBannerBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
    recruitBannerBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 13 },

    endedCard: {
      marginBottom: 16,
      padding: 14,
      borderRadius: 14,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    endedTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 4 },
    endedBody: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, lineHeight: 20 },
    endedRateBtn: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: ICON_BG,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    endedRateBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: ORANGE },
  });
}
