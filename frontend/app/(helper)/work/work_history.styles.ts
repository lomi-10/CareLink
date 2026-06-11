import { StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { DARK, MUTED, ORANGE, DIVIDER, SURFACE } from '@/components/helper/home/helperWarmTheme';

export function createHelperWorkHistoryStyles() {
  return StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { gap: 12, paddingBottom: 16 },
    weekCard: {
      borderRadius: 14,
      backgroundColor: SURFACE,
      borderWidth: 1,
      borderColor: DIVIDER,
      padding: 14,
    },
    weekTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
    weekSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 12 },
    dots: { flexDirection: 'row', justifyContent: 'space-between' },
    dotCol: { alignItems: 'center', gap: 6 },
    dotLbl: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: MUTED },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: DIVIDER,
    },
    dotOn: {
      backgroundColor: ORANGE,
    },
  });
}
