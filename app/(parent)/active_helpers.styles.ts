import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.surface },
  rootRow: { flex: 1, flexDirection: 'row', backgroundColor: theme.color.surface },
  main: { flex: 1, maxWidth: 720, alignSelf: 'center', width: '100%' },
  desktopHead: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  pageTitle: { fontSize: 26, fontWeight: '900', color: theme.color.ink, letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: theme.color.muted, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 88 },
  lead: {
    fontSize: 14,
    color: theme.color.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  bold: { fontWeight: '700', color: theme.color.ink },
  empty: { fontSize: 15, color: theme.color.muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 16 },
});
