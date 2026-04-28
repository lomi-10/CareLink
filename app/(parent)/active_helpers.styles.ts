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
  });
}
