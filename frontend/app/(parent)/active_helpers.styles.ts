import { StyleSheet } from 'react-native';
import type { ThemeColor } from '@/constants/theme';

export function createParentActiveHelpersStyles(c: ThemeColor) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    rootRow: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
    main: { flex: 1, maxWidth: 720, alignSelf: 'center', width: '100%' },
    desktopHead: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 8,
    },
    pageTitle: { fontSize: 26, fontWeight: '900', color: c.ink, letterSpacing: -0.5 },
    pageSub: { fontSize: 13, color: c.muted, marginTop: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 88 },
    lead: {
      fontSize: 14,
      color: c.muted,
      lineHeight: 22,
      marginBottom: 16,
    },
    bold: { fontWeight: '700', color: c.ink },
    empty: { fontSize: 15, color: c.muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: c.ink,
      marginTop: 28,
      marginBottom: 10,
    },
    sectionSub: { fontSize: 13, color: c.muted, marginBottom: 14, lineHeight: 20 },
    pastCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
      marginBottom: 12,
      backgroundColor: c.surfaceElevated,
    },
    pastHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    pastName: { fontSize: 16, fontWeight: '800', color: c.ink, flex: 1 },
    pastMeta: { fontSize: 13, color: c.muted, marginTop: 6, lineHeight: 18 },
    rateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: c.parentSoft,
      borderWidth: 1,
      borderColor: c.line,
    },
    rateBtnText: { fontSize: 13, fontWeight: '800', color: c.parent },
    pastEmpty: { fontSize: 14, color: c.muted, marginTop: 8, lineHeight: 20 },
  });
}
