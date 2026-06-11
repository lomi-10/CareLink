// app/(parent)/notifications/notifications.styles.ts — flat warm palette
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED, SUBTLE, DIVIDER, ICON_BG, SURFACE,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 1 },
  default: { boxShadow: '0 2px 8px rgba(139,90,43,0.06)' } as any,
});

export const ns = StyleSheet.create({
  // ── Desktop layout ────────────────────────────────────────────────────────
  desktopRoot:      { flex: 1, flexDirection: 'row', backgroundColor: BG },
  desktopMain:      { flex: 1, backgroundColor: BG },
  desktopScroll:    { padding: 32, paddingBottom: 60, maxWidth: 860, alignSelf: 'center', width: '100%' },
  desktopTopBar:    { marginBottom: 24 },
  desktopPageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: DARK },
  desktopPageSub:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 13, color: MUTED, marginTop: 3 },

  // ── Mobile layout ─────────────────────────────────────────────────────────
  mobileRoot:  { flex: 1, backgroundColor: BG },
  mobileBody:  { flex: 1, minHeight: 0 },
  mobileHeader:{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: DIVIDER,
    ...CARD_SHADOW,
  },
  mobileHeaderTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  backBtn: { padding: 8 },

  // ── Panel ─────────────────────────────────────────────────────────────────
  panel: {
    backgroundColor: SURFACE, borderRadius: 16,
    borderWidth: 1, borderColor: DIVIDER, overflow: 'hidden', flex: 1,
    ...CARD_SHADOW,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  panelHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  headerBadge:   { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: BROWN },
  headerBadgeText:{ fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 11 },
  markAllText:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: CARAMEL },

  listContent:   { paddingBottom: 20 },
  sep:           { height: 1, backgroundColor: DIVIDER, marginLeft: 72 },

  // ── Notification item ─────────────────────────────────────────────────────
  item:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  itemUnread: { backgroundColor: ICON_BG + '88' },
  iconWrap:   { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemBody:   { flex: 1 },
  itemTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  itemTitle:       { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, paddingRight: 8 },
  itemTitleUnread: { fontFamily: FontFamily.fredokaSemiBold, color: DARK },
  itemTime:  { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: SUBTLE },
  itemMsg:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, backgroundColor: BROWN },

  // ── States ────────────────────────────────────────────────────────────────
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 60 },
  empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 18, backgroundColor: ICON_BG },
  emptyTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 8 },
  emptyBody:   { fontFamily: FontFamily.fredokaRegular,  fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 21 },
});
