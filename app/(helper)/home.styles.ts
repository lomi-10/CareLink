// app/(helper)/home.styles.ts
import { StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "transparent" },
  mainContent: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60 },
  statsGrid: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  mobileScrollContent: { padding: 16, paddingBottom: 40 },
  mobileStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },

  desktopTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24,
  },
  desktopPageTitle: { fontSize: 26, fontWeight: '900', color: theme.color.ink, letterSpacing: -0.5 },
  desktopPageSub:   { fontSize: 13, color: theme.color.muted, marginTop: 3 },

  desktopNotifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: theme.color.surface,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    borderWidth: 1, borderColor: theme.color.line,
  },
  desktopNotifBtnActive: {
    backgroundColor: theme.color.helperSoft,
    borderColor: theme.color.helper + '40',
  },
  notifBadge: {
    position: 'absolute', top: 6, right: 6,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  qaDesktop: {
    flex: 1, minWidth: 140,
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16, padding: 20,
    alignItems: 'flex-start',
    borderWidth: 1, borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  qaDesktopIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  qaDesktopTitle:{ fontSize: 15, fontWeight: '800', color: theme.color.ink, marginBottom: 4 },
  qaDesktopDesc: { fontSize: 12, color: theme.color.muted, lineHeight: 17 },

  recruitBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.color.helperSoft,
    borderRadius: 14, padding: 16,
    marginTop: 8,
    borderWidth: 1, borderColor: theme.color.helper + '30',
  },
  recruitBannerLeft: { flex: 1 },
  recruitBannerTitle: { fontSize: 14, fontWeight: '800', color: theme.color.helper, marginBottom: 3 },
  recruitBannerSub:   { fontSize: 12, color: theme.color.inkMuted },
  recruitBannerBtn:   { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  recruitBannerBtnText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
});