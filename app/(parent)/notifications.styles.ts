import { StyleSheet } from 'react-native';
import type { ThemeColor } from '@/constants/theme';

export function createParentNotificationsStyles(c: ThemeColor) {
  return StyleSheet.create({
    desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
    desktopMain: { flex: 1 },
    desktopScroll: { padding: 32, paddingBottom: 60, maxWidth: 860, alignSelf: 'center', width: '100%' },
    desktopTopBar: { marginBottom: 24 },
    desktopPageTitle: { fontSize: 26, fontWeight: '900', color: c.ink, letterSpacing: -0.5 },
    desktopPageSub: { fontSize: 13, color: c.muted, marginTop: 3 },

    mobileRoot: { flex: 1, backgroundColor: 'transparent' },
    mobileBody: { flex: 1, minHeight: 0 },
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 10,
      backgroundColor: c.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    mobileHeaderTitle: { fontSize: 18, fontWeight: '800', color: c.ink },
    backBtn: { padding: 8 },

    panel: {
      backgroundColor: c.surfaceElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.line,
      overflow: 'hidden',
      flex: 1,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    panelTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
    headerBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    markAllText: { fontSize: 13, fontWeight: '700' },

    listContent: { paddingBottom: 20 },
    sep: { height: 1, backgroundColor: c.line, marginLeft: 72 },

    item: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    itemUnread: { backgroundColor: c.parentSoft + '44' },
    iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    itemBody: { flex: 1 },
    itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: c.inkMuted, paddingRight: 8 },
    itemTitleUnread: { color: c.ink, fontWeight: '800' },
    itemTime: { fontSize: 11, color: c.subtle },
    itemMsg: { fontSize: 13, color: c.muted, lineHeight: 18 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
    emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: c.ink, marginBottom: 8 },
    emptyBody: { fontSize: 14, color: c.muted, textAlign: 'center', lineHeight: 21 },
  });
}
