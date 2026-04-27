// app/(parent)/jobs.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeColor } from '@/constants/theme';

export function createParentJobsStyles(c: ThemeColor) {
  return StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
  mobileRoot:  { flex: 1, backgroundColor: 'transparent' },

  desktopMain: { flex: 1, overflow: 'hidden' },
  desktopHero: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 24,
    backgroundColor: c.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: c.line,
  },
  heroTitle: { fontSize: 26, fontWeight: '800', color: c.ink, letterSpacing: -0.5 },
  heroSub:   { fontSize: 13, color: c.muted, marginTop: 3 },
  desktopBody: { flex: 1 },

  postBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.parent, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, shadowColor: c.parent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  postBtnDisabled: { backgroundColor: c.subtle, shadowOpacity: 0 },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  mobileHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: c.surfaceElevated,
    borderBottomWidth: 1, borderBottomColor: c.line,
  },
  menuBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  mobileTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mobileTitle: { fontSize: 17, fontWeight: '800', color: c.ink },
  mobilePendingDot: { backgroundColor: c.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
  mobilePendingDotText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  mobileFab: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.parent, alignItems: 'center', justifyContent: 'center', shadowColor: c.parent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  mobileFabDisabled: { backgroundColor: c.subtle, shadowOpacity: 0 },

  board: { flex: 1 },

  statsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  statTile: {
    alignSelf: 'flex-start',
    alignItems: 'center', gap: 4,
    padding: 14, borderRadius: 16,
    minWidth: 90,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNum:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLbl:  { fontSize: 10, fontWeight: '700', color: c.muted, textTransform: 'uppercase', letterSpacing: 0.3 },

  toolbar: {
    backgroundColor: c.surfaceElevated,
    paddingTop: 10,
    borderBottomWidth: 1, borderBottomColor: c.line,
    gap: 0,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: c.surface,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: c.line,
  },
  searchInput: { flex: 1, fontSize: 14, color: c.ink },
  filterRow:   { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', gap: 8 },
  filterChip:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: c.surface,
    borderWidth: 1.5, borderColor: c.line,
  },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  filterBadge:    { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: 'center' },
  filterBadgeText:{ fontSize: 10, fontWeight: '800' },

  resultsBar: { paddingHorizontal: 16, paddingVertical: 8 },
  resultsText: { fontSize: 12, color: c.muted },

  list: { padding: 16, paddingBottom: 48 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: c.parentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle:{ fontSize: 18, fontWeight: '800', color: c.ink, marginBottom: 8, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: c.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: 280 },
  emptyBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.parent, paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12, shadowColor: c.parent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
