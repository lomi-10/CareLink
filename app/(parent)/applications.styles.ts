// app/(parent)/applications.styles.ts
import { Platform, StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1 },

  // ── Desktop ──
  desktopMain:   { flex: 1 },
  desktopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, paddingVertical: 24, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  pageTitle:     { fontSize: 26, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.5 },
  pageSubtitle:  { fontSize: 14, color: theme.color.muted, marginTop: 2 },
  viewJobsBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, shadowColor: theme.color.parent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  viewJobsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Mobile header ──
  mobileHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.color.surfaceElevated, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  menuBtn:            { padding: 6 },
  mobileHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle:        { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  pendingBadge:       { backgroundColor: theme.color.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  pendingBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '800' },
  jobsIconBtn:        { padding: 8, backgroundColor: theme.color.parentSoft, borderRadius: 10 },

  // ── Selector ──
  selectorSection: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4, gap: 12 },
  dropCard:  { backgroundColor: theme.color.surfaceElevated, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.color.line, ...theme.shadow.nav },
  dropLabel: { fontSize: 11, fontWeight: '800', color: theme.color.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  dropHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.color.surface, borderWidth: 1, borderColor: theme.color.line, padding: 13, borderRadius: 10 },
  dropHeadActive:   { borderColor: theme.color.parent, backgroundColor: theme.color.parentSoft },
  dropHeadDisabled: { opacity: 0.5 },
  dropHeadText:     { flex: 1, fontSize: 15, fontWeight: '600', color: theme.color.ink },
  dropHeadSub:      { fontSize: 12, color: theme.color.muted, marginTop: 2, fontWeight: '500' },
  dropList:  { marginTop: 8, backgroundColor: theme.color.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden' },
  dropItem:  { padding: 14, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  dropItemActive: { backgroundColor: theme.color.parentSoft },
  dropItemText:   { fontSize: 14, fontWeight: '600', color: theme.color.inkMuted },
  dropItemTextActive: { color: theme.color.parent, fontWeight: '700' },
  dropItemSub:    { fontSize: 12, color: theme.color.subtle, marginTop: 2 },

  // ── Stats ──
  statsScroll:    { paddingHorizontal: 16, paddingVertical: 14, gap: 10, flexDirection: 'row', alignItems: 'flex-start' },
  statTile:       { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, gap: 4, minWidth: 80, alignSelf: 'flex-start' },
  statIconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:      { fontSize: 20, fontWeight: '800' },
  statLabel:      { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: theme.color.muted },

  // ── All jobs toggle ──
  allJobBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: theme.color.line, backgroundColor: theme.color.surface },
  allJobBtnActive:  { backgroundColor: theme.color.parent, borderColor: theme.color.parent },
  allJobBtnText:    { fontSize: 13, fontWeight: '700', color: theme.color.muted },

  // ── Filters ──
  filterScroll:         { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.color.surfaceElevated, borderWidth: 1, borderColor: theme.color.line },
  filterChipActive:     { backgroundColor: theme.color.parent, borderColor: theme.color.parent },
  filterChipText:       { fontSize: 13, fontWeight: '600', color: theme.color.muted },
  filterChipTextActive: { color: '#fff' },

  // ── List ──
  listPad:        { padding: 16, paddingBottom: 40 },
  listPadDesktop: { paddingHorizontal: 32, paddingBottom: 60 },

  // ── Empty ──
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIconCircle:{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:     { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8, textAlign: 'center' },
  emptySub:       { fontSize: 14, color: theme.color.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  postJobBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.parent, paddingVertical: 13, paddingHorizontal: 24, borderRadius: 14 },
  postJobBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  groupModalOverlay: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.color.overlay,
    ...Platform.select({
      web: { justifyContent: 'center', padding: 20 },
      default: { justifyContent: 'flex-end' },
    }),
  },
  groupModalSheet: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: theme.color.surfaceElevated,
    maxHeight: '88%',
    ...theme.shadow.card,
    ...Platform.select({
      web: { borderRadius: 16 },
      default: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    }),
  },
  groupModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  groupModalTitle: { fontSize: 18, fontWeight: '800', color: theme.color.ink },
  groupModalSubtitle: { fontSize: 13, color: theme.color.muted, marginTop: 4 },
  groupModalScroll: { padding: 16, paddingBottom: 28 },
});
