import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: theme.color.ink,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: theme.color.muted,
    marginTop: 4,
  },

  panel: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.line,
    overflow: 'hidden',
    flex: 1,
    minHeight: 280,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle: { fontSize: 16, fontWeight: '800', color: theme.color.ink },
  headerBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  markAllText: { fontSize: 13, fontWeight: '700' },

  listContent: { paddingBottom: 20 },
  sep: { height: 1, backgroundColor: theme.color.line, marginLeft: 72 },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemUnread: { backgroundColor: theme.color.pesoSoft + '44' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  itemBody: { flex: 1 },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.color.inkMuted,
    paddingRight: 8,
  },
  itemTitleUnread: { color: theme.color.ink, fontWeight: '800' },
  itemTime: { fontSize: 11, color: theme.color.subtle },
  itemMsg: { fontSize: 13, color: theme.color.muted, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: theme.color.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
});
