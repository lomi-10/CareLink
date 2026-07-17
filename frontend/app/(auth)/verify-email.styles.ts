// app/(auth)/verify-email.styles.ts — shared by verify-email and forgot-password.

import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

const PAGE_BG  = '#FAE8D0';
const CARD_BG  = '#FFFFFF';
const INPUT_BG = '#FDF5E8';
const LABEL    = '#2A1608';
const MUTED    = '#9A7B5A';
const ACCENT   = '#E86019';
const BTN      = '#1B2B4B';

export const v = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },

  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  scrollDesktop: { padding: 40 },

  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 5 },
      default: { boxShadow: '0 8px 32px rgba(139,94,60,0.12)' } as any,
    }),
  },
  cardDesktop: { padding: 36 },

  logoWrap: { marginBottom: 4 },

  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 26,
    color: LABEL,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 24,
  },
  emailText: { fontFamily: FontFamily.fredokaSemiBold, color: LABEL },

  // 6-digit boxes
  codeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  codeBox: {
    width: 48,
    height: 58,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: '#EFDCC0',
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 24,
    color: LABEL,
    outlineStyle: 'none' as any,
  },
  codeBoxFilled: { borderColor: ACCENT, backgroundColor: '#FFF9F2' },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BTN,
    borderRadius: 14,
    paddingVertical: 15,
    width: '100%',
    transitionDuration: '150ms' as any,
    transitionProperty: 'all' as any,
  },
  btnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: '#FFFFFF' },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  resendLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: MUTED },
  resendLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: ACCENT },

  hint: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: '#B0906C',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 14,
    maxWidth: 320,
  },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#5C3A1A' },

  // ── forgot-password extras ──
  fieldLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13.5,
    color: LABEL,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    fontFamily: FontFamily.fredokaRegular,
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: '#EFDCC0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: LABEL,
    marginBottom: 16,
    outlineStyle: 'none' as any,
  },
  pwRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1.5,
    borderColor: '#EFDCC0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
    marginBottom: 16,
  },
  pwInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 15, color: LABEL, padding: 0, outlineStyle: 'none' as any },

  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginBottom: 5 },
  ruleText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED },
  ruleOk: { color: '#059669' },
  rulesWrap: { alignSelf: 'flex-start', marginBottom: 18, marginTop: 2 },
});
