// app/(auth)/signup.styles.ts
// Structural / layout styles for the signup screen.
// Dynamic colours (card bg, input bg, etc.) are applied inline via the role theme from authThemes.ts.

import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

export const s = StyleSheet.create({

  // ── Page header (dark background area) ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn:    { padding: 8, borderRadius: 8 },
  headerLogo: { flex: 1, alignItems: 'center' },

  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 4,
  },
  eyebrow: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
    color: '#E96613',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 26,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
  },

  // ── Form card ───────────────────────────────────────────────────────────────
  card: {
    borderRadius: 24,
    padding: 20,
  },

  // ── Role pill ───────────────────────────────────────────────────────────────
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 18,
  },
  pillText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
  },

  // ── Picker fallback ─────────────────────────────────────────────────────────
  pickerWrap: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },

  // ── Form fields ─────────────────────────────────────────────────────────────
  nameRow: {
    flexDirection: 'row',
  },
  label: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    fontFamily: FontFamily.fredokaRegular,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 15,
  },

  // ── Password row ────────────────────────────────────────────────────────────
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    gap: 8,
  },
  pwInput: {
    fontFamily: FontFamily.fredokaRegular,
    flex: 1,
    fontSize: 15,
    padding: 0,
  },

  // ── Password requirements box ───────────────────────────────────────────────
  pwReqs: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    gap: 3,
  },
  pwReqsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  pwReqsTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
  },
  pwReqItem: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    lineHeight: 18,
    paddingLeft: 4,
  },

  // ── Submit button ────────────────────────────────────────────────────────────
  btn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  btnText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 16,
  },

  // ── Privacy consent ─────────────────────────────────────────────────────────
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  consentText: {
    flex: 1,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footerTxt: {
    fontFamily: FontFamily.fredokaRegular,
    textAlign: 'center',
    fontSize: 13,
  },

  // ── Mobile shell ────────────────────────────────────────────────────────────
  mobileScroll:   { flexGrow: 1, paddingBottom: 32 },
  mobileCardWrap: { paddingHorizontal: 16 },

  // ── Desktop shell ────────────────────────────────────────────────────────────
  webScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  webContainer: {
    width: '100%',
    maxWidth: 480,
  },
});
