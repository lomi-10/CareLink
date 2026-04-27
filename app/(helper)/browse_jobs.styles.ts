// app/(helper)/browse_jobs.styles.ts
import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  // ── roots ──
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: theme.color.canvasHelper },
  mobileRoot:  { flex: 1, backgroundColor: theme.color.canvasHelper },

  // ── desktop layout ──
  desktopMain: { flex: 1, overflow: 'hidden' },
  desktopHero: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 24,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: theme.color.ink, letterSpacing: -0.5 },
  heroSub:   { fontSize: 13, color: theme.color.muted, marginTop: 3 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.color.parentSoft, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: theme.color.parent + '33',
  },
  savedBadgeText: { fontSize: 13, fontWeight: '700', color: theme.color.parent },
  applicationsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: theme.color.helper,
    backgroundColor: theme.color.helperSoft,
  },
  applicationsBtnText: { fontSize: 14, fontWeight: '700', color: theme.color.helper },

  // ── mobile header ──
  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.surface, alignItems: 'center', justifyContent: 'center' },
  mobileTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle: { fontSize: 17, fontWeight: '800', color: theme.color.ink },
  mobileCountBadge: { backgroundColor: theme.color.helperSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: theme.color.helper + '33' },
  mobileCountText: { fontSize: 11, fontWeight: '800', color: theme.color.helper },
  applicationsIconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  savedDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: theme.color.parent, borderWidth: 1.5, borderColor: theme.color.surfaceElevated },

  // ── feed ──
  feed: { flex: 1 },

  searchStrip: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    backgroundColor: theme.color.surfaceElevated,
  },

  // ── results bar ──
  resultsBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: theme.color.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: theme.color.line,
  },
  resultsLeft: { flexDirection: 'row', alignItems: 'center' },
  resultsCount:    { fontSize: 13, color: theme.color.muted },
  resultsFiltered: { fontSize: 12, color: theme.color.subtle },
  clearFiltersBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearFiltersBtnText: { fontSize: 12, fontWeight: '700', color: theme.color.helper },

  // ── list ──
  listMobile:  { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 88 },
  listDesktop: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 60 },
  mobileCardWrap:  { marginBottom: 0 },
  desktopCardWrap: { flex: 1, maxWidth: '33.333%', paddingHorizontal: 8, marginBottom: 8 },
  colWrapper:      { marginBottom: 8 },

  // ── empty state ──
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48, marginTop: 20 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: theme.color.helperSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: theme.color.helper + '22' },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: theme.color.ink, marginBottom: 8, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: theme.color.muted, textAlign: 'center', lineHeight: 21, marginBottom: 24, maxWidth: 290 },
  emptyBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.color.helper, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, shadowColor: theme.color.helper, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  emptyBtnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});
