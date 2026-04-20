import { StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { gap: 12, paddingBottom: 16 },
  weekCard: {
    borderRadius: 14,
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.color.line,
    padding: 14,
  },
  weekTitle: { fontSize: 16, fontWeight: '800', color: theme.color.ink },
  weekSub: { fontSize: 13, color: theme.color.muted, marginTop: 4, marginBottom: 12 },
  dots: { flexDirection: 'row', justifyContent: 'space-between' },
  dotCol: { alignItems: 'center', gap: 6 },
  dotLbl: { fontSize: 10, fontWeight: '700', color: theme.color.muted },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.color.line,
  },
  dotOn: {
    backgroundColor: theme.color.helper,
  },
});
