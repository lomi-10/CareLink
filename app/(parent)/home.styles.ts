// app/(parent)/home.styles.ts
import { StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "transparent",
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    color: '#1A1C1E',
    marginBottom: 4,
  },
  quickActionDesktopDesc: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: theme.color.parentSoft,
    borderColor: theme.color.parent + '40',
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
    backgroundColor: theme.color.parentSoft,
    borderRadius: 14, padding: 16,
    marginTop: 8,
    borderWidth: 1, borderColor: theme.color.parent + '30',
  },
  hireBannerLeft:   { flex: 1 },
  hireBannerTitle:  { fontSize: 14, fontWeight: '800', color: theme.color.parent, marginBottom: 3 },
  hireBannerSub:    { fontSize: 12, color: theme.color.inkMuted },
  hireBannerBtn:    { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  hireBannerBtnText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
});