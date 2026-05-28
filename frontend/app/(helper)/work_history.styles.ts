import { StyleSheet } from 'react-native';

import type { ThemeColor } from '@/constants/theme';

export function createHelperWorkHistoryStyles(c: ThemeColor) {
  return StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { gap: 12, paddingBottom: 16 },
    weekCard: {
      borderRadius: 14,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.line,
      padding: 14,
    },
    weekTitle: { fontSize: 16, fontWeight: '800', color: c.ink },
    weekSub: { fontSize: 13, color: c.muted, marginTop: 4, marginBottom: 12 },
    dots: { flexDirection: 'row', justifyContent: 'space-between' },
    dotCol: { alignItems: 'center', gap: 6 },
    dotLbl: { fontSize: 10, fontWeight: '700', color: c.muted },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.line,
    },
    dotOn: {
      backgroundColor: c.helper,
    },
  });
}
