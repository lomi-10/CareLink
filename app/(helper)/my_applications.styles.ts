// app/(helper)/my_applications.styles.ts
import { StyleSheet } from 'react-native';

import type { ThemeColor } from '@/constants/theme';

export function createHelperMyApplicationsStyles(c: ThemeColor) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.canvasHelper },
    content: { flex: 1 },

    desktopMain: { flex: 1, backgroundColor: c.canvasHelper },
    desktopHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 32,
      paddingVertical: 24,
      backgroundColor: c.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    pageTitle: { fontSize: 26, fontWeight: '800', color: c.ink, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 14, color: c.muted, marginTop: 2 },
    browseJobsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.helperSoft,
      borderWidth: 1,
      borderColor: c.helper + '30',
    },
    browseJobsBtnText: { fontSize: 14, fontWeight: '700', color: c.helper },

    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: c.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    menuBtn: { padding: 6 },
    mobileHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mobileTitle: { fontSize: 18, fontWeight: '800', color: c.ink, letterSpacing: -0.3 },
    pendingBadge: { backgroundColor: c.warning, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    pendingBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    searchIconBtn: { padding: 8, backgroundColor: c.helperSoft, borderRadius: 10 },

    statsScroll: { paddingHorizontal: 16, paddingVertical: 16, gap: 10, flexDirection: 'row', alignItems: 'flex-start' },
    statTile: {
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 16,
      gap: 4,
      minWidth: 80,
      alignSelf: 'flex-start',
    },
    statIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: c.muted },

    filterScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.line,
    },
    filterChipActive: { backgroundColor: c.helper, borderColor: c.helper },
    filterChipText: { fontSize: 13, fontWeight: '600', color: c.muted },
    filterChipTextActive: { color: '#fff' },

    resultsBar: { paddingHorizontal: 16, paddingVertical: 8 },
    resultsText: { fontSize: 13, color: c.muted, fontWeight: '500' },

    listPad: { padding: 16, paddingBottom: 88 },
    listPadDesktop: { paddingHorizontal: 32, paddingTop: 8, paddingBottom: 60 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.helperSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: c.ink, marginBottom: 8, textAlign: 'center' },
    emptySub: { fontSize: 14, color: c.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    browseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.helper,
      paddingVertical: 13,
      paddingHorizontal: 24,
      borderRadius: 14,
      shadowColor: c.helper,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
