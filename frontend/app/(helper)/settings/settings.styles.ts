import { StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { makeHelperWarm, type HelperWarm } from '@/components/helper/home/helperWarmTheme';

export function createHelperSettingsStyles(w: HelperWarm = makeHelperWarm()) {
  const { DARK, MUTED, PAGE_BG } = w;
  return StyleSheet.create({
    desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: PAGE_BG },
    desktopMain: { flex: 1 },
    desktopScroll: {
      paddingHorizontal: 24,
      paddingBottom: 48,
      maxWidth: 760,
      width: '100%',
      alignSelf: 'center',
    },
    desktopTopBar: { marginBottom: 8, paddingTop: 8 },
    desktopPageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: DARK, letterSpacing: -0.3 },
    desktopPageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, marginTop: 4 },

    safe: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18 },
    scroll: { paddingHorizontal: 20, paddingBottom: 32 },
    sectionLabel: {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    sectionSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, lineHeight: 20, marginBottom: 16, opacity: 0.9 },
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
    optionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
    optionHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, marginTop: 2, lineHeight: 16 },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 8,
    },
    linkText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 16 },
    themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    themeCard: {
      width: '48%',
      minWidth: 150,
      flexGrow: 1,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    themeCardLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, marginBottom: 4 },
    themeCardHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, lineHeight: 16 },
  });
}
