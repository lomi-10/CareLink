import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  /** transparent: canvas comes from `RoleScreenBackground`; StyleSheet must not snapshot old `theme.color`. */
  desktopRoot:  { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
  desktopMain:  { flex: 1 },
  desktopScroll:{ padding: 32, paddingBottom: 60, maxWidth: 860, alignSelf: 'center', width: '100%' },
  desktopTopBar:{ marginBottom: 24 },
  desktopPageTitle: { fontSize: 26, fontWeight: '900', color: theme.color.ink, letterSpacing: -0.5 },
  desktopPageSub:   { fontSize: 13, color: theme.color.muted, marginTop: 3 },

  mobileRoot:   { flex: 1, backgroundColor: 'transparent' },
  mobileBody:   { flex: 1, minHeight: 0 },
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  mobileHeaderTitle: { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  backBtn: { padding: 8 },

  panel: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.line,
    overflow: 'hidden',
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle:      { fontSize: 16, fontWeight: '800', color: theme.color.ink },
  headerBadge:     { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllText:     { fontSize: 13, fontWeight: '700' },

  listContent: { paddingBottom: 20 },
  sep:         { height: 1, backgroundColor: theme.color.line, marginLeft: 72 },

  item:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  itemUnread:  { backgroundColor: theme.color.parentSoft + '44' },
  iconWrap:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemBody:    { flex: 1 },
  itemTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle:   { flex: 1, fontSize: 14, fontWeight: '600', color: theme.color.inkMuted, paddingRight: 8 },
  itemTitleUnread: { color: theme.color.ink, fontWeight: '800' },
  itemTime:    { fontSize: 11, color: theme.color.subtle },
  itemMsg:     { fontSize: 13, color: theme.color.muted, lineHeight: 18 },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, marginTop: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8 },
  emptyBody:   { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 21 },
});
