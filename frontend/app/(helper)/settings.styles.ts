import { StyleSheet } from 'react-native';
import type { ThemeColor } from '@/constants/theme';

export function createHelperSettingsStyles(c: ThemeColor) {
  return StyleSheet.create({
    desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
    desktopMain: { flex: 1 },
    desktopScroll: {
      paddingHorizontal: 24,
      paddingBottom: 48,
      maxWidth: 760,
      width: '100%',
      alignSelf: 'center',
    },
    desktopTopBar: { marginBottom: 8, paddingTop: 8 },
    desktopPageTitle: { fontSize: 24, fontWeight: '800', color: c.ink, letterSpacing: -0.3 },
    desktopPageSub: { fontSize: 14, color: c.muted, marginTop: 4 },

    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800' },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    sectionSub: { fontSize: 14, lineHeight: 20, marginBottom: 16, opacity: 0.9 },
    options: { gap: 10 },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 14,
      borderRadius: 14,
    },
    optionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTitle: { fontSize: 16, fontWeight: '700' },
    optionHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 8,
    },
    linkText: { flex: 1, fontSize: 16, fontWeight: '600' },
    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    themeCard: {
      width: '48%',
      minWidth: 150,
      flexGrow: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    themeCardLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
    themeCardHint: { fontSize: 12, lineHeight: 16 },
  });
}
