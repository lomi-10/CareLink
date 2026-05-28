import { Platform, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export function createHireJobPickerStyles(accentColor: string) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: isWeb ? 'center' : 'flex-end',
      alignItems: isWeb ? 'center' : 'stretch',
      padding: isWeb ? 20 : 0,
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: isWeb ? 16 : 16,
      width: isWeb ? 480 : '100%',
      maxWidth: isWeb ? 480 : '100%',
      alignSelf: isWeb ? 'center' : 'stretch',
      maxHeight: isWeb ? '90%' : '85%',
      overflow: 'hidden',
    },
    title: { fontSize: 17, fontWeight: '700', color: theme.color.ink, marginBottom: 8 },
    sub: { fontSize: 14, color: theme.color.muted, lineHeight: 20, marginBottom: 12 },
    list: { maxHeight: 320, marginBottom: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: theme.color.line,
      marginBottom: 8,
    },
    rowSelected: { borderColor: accentColor, backgroundColor: theme.color.parentSoft },
    jobTitle: { fontSize: 15, fontWeight: '600', color: theme.color.ink },
    meta: { fontSize: 12, color: theme.color.muted, marginTop: 4 },
    btns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4, paddingHorizontal: 4, paddingBottom: 4 },
    cancel: { paddingVertical: 10, paddingHorizontal: 14 },
    cancelTxt: { fontSize: 15, fontWeight: '600', color: theme.color.muted },
    confirm: {
      backgroundColor: theme.color.success,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
    },
    confirmDisabled: { opacity: 0.4 },
    confirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    bodyPad: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  });
}
