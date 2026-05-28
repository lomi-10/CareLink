// app/(parent)/home.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';

/** Parent home screen — all semantic colors from portal theme. */
export function createParentHomeStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    mainContent: {
      flex: 1,
    },
    scrollContent: {
      padding: 32,
      paddingBottom: 60,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 20,
      marginBottom: 40,
    },
    quickActionsDesktop: {
      flexDirection: 'row',
      gap: 20,
      marginBottom: 40,
    },
    quickActionDesktopCard: {
      flex: 1,
      backgroundColor: c.surfaceElevated,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.line,
      ...theme.shadow.card,
    },
    quickActionDesktopIcon: {
      width: 64,
      height: 64,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    quickActionDesktopTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.ink,
      marginBottom: 4,
    },
    quickActionDesktopDesc: {
      fontSize: 13,
      color: c.muted,
      textAlign: 'center',
    },
    mobileScrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    mobileStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 24,
    },
    mobileStatCell: {
      width: '47%',
      minWidth: 140,
      flexGrow: 1,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 32,
    },

    desktopTopBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 24,
    },
    desktopPageTitle: { fontSize: 26, fontWeight: '900', color: c.ink, letterSpacing: -0.5 },
    desktopPageSub:   { fontSize: 13, color: c.muted, marginTop: 3 },

    desktopNotifBtn: {
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      borderWidth: 1, borderColor: c.line,
    },
    desktopNotifBtnActive: {
      backgroundColor: c.parentSoft,
      borderColor: c.parent + '40',
    },
    notifBadge: {
      position: 'absolute', top: 6, right: 6,
      borderRadius: 8, minWidth: 16, height: 16,
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    },
    notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

    qaDesktop: { flex: 1 },

    hireBanner: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.parentSoft,
      borderRadius: 14, padding: 16,
      marginTop: 8,
      borderWidth: 1, borderColor: c.parent + '30',
    },
    hireBannerLeft:   { flex: 1 },
    hireBannerTitle:  { fontSize: 14, fontWeight: '800', color: c.parent, marginBottom: 3 },
    hireBannerSub:    { fontSize: 12, color: c.inkMuted },
    hireBannerBtn:    { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
    hireBannerBtnText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
  });
}
