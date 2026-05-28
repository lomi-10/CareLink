import { Platform, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export const hireContractTermsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: isWeb ? 'center' : 'flex-end',
    alignItems: isWeb ? 'center' : 'stretch',
    padding: isWeb ? 20 : 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: isWeb ? 480 : '100%',
    maxWidth: isWeb ? 480 : '100%',
    alignSelf: isWeb ? 'center' : 'stretch',
    maxHeight: isWeb ? '90%' : '85%',
    overflow: 'hidden',
  },
  bodyPad: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: theme.color.ink, marginBottom: 8 },
  sub: { fontSize: 14, color: theme.color.muted, lineHeight: 20, marginBottom: 12 },
  list: { maxHeight: 360, marginBottom: 12, paddingHorizontal: 18 },
  label: { fontSize: 13, fontWeight: '700', color: theme.color.ink, marginTop: 10, marginBottom: 4 },
  hint: { fontSize: 11, color: theme.color.muted, marginBottom: 6, lineHeight: 15 },
  input: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: theme.color.ink,
    backgroundColor: '#fff',
  },
  notes: {
    borderWidth: 1,
    borderColor: theme.color.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.color.ink,
    backgroundColor: '#fff',
    minHeight: 88,
    maxHeight: 160,
  },
  btns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4, paddingHorizontal: 18, paddingBottom: 18 },
  cancel: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelTxt: { fontSize: 15, fontWeight: '600', color: theme.color.muted },
  confirm: {
    backgroundColor: theme.color.success,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
