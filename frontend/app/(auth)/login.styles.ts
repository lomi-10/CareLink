// app/(auth)/login.styles.ts
// m = mobile styles  |  d = desktop (web) styles
// Image placeholder positions are at the bottom — uncomment & tune once you add assets.

import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

// ─── Shared values ─────────────────────────────────────────────────────────────
const PAGE_BG     = '#FAE8D0';
const CARD_BG     = '#FFFFFF';
const INPUT_BG    = '#FDF5E8';
const ICON_CIRCLE = '#F0DBBA';
const LABEL       = '#2A1608';
const MUTED       = '#9A7B5A';
const FORGOT      = '#E86019';
const SIGN_IN_BTN = '#1B2B4B';
const TRUST_COLOR = '#7A4E2A';
const BACK_TEXT   = '#5C3A1A';

// ─── Mobile ───────────────────────────────────────────────────────────────────

export const m = StyleSheet.create({

  page: { flex: 1, backgroundColor: PAGE_BG },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // brand
  brandRow: { alignItems: 'center', marginBottom: 12, gap: 6 },
  brandName: { fontSize: 26, letterSpacing: -0.3 },
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: '#2A1608' },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: '#E86019' },

  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 28,
    color: LABEL,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    maxWidth: 320,
  },

  // card
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 22,
    ...Platform.select({
      ios:     { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 5 },
      default: { boxShadow: '0 8px 32px rgba(139,94,60,0.12)' } as any,
    }),
    marginBottom: 20,
  },

  // field
  fieldBlock:     { marginBottom: 14 },
  fieldLabel:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconCircle:     { width: 32, height: 32, borderRadius: 16, backgroundColor: ICON_CIRCLE, alignItems: 'center', justifyContent: 'center' },
  fieldLabelText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: LABEL },

  input: {
    fontFamily: FontFamily.fredokaRegular,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 15,
    color: LABEL,
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    gap: 8,
  },
  pwInput: { fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 15, color: LABEL, padding: 0 },

  // forgot
  forgotRow:  { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: FORGOT },

  // sign in
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SIGN_IN_BTN,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 18,
  },
  signInTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: '#FFFFFF' },

  // OR
  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#D4B896' },
  orText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#B8956A', letterSpacing: 1 },

  // sign up
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#C4A882',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  signUpTxt: { fontFamily: FontFamily.fredokaSemiBold, flex: 1, fontSize: 15, color: LABEL, textAlign: 'center' },

  // back + trust
  backRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BACK_TEXT },

  trustRow:  { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  trustText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: TRUST_COLOR },

  // ── Image placeholder positions ─────────────────────────────────────────────
  // Absolute-positioned decorative elements layered BEHIND the SafeAreaView.
  // Adjust sizes/offsets once you add your actual asset files.

  plantLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 160,
    height: 280,
  },
  roomRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 220,
    height: 340,
  },
  heartAccent: {
    position: 'absolute',
    left: 20,
    top: '38%',
    width: 36,
    height: 36,
  },
  houseAccent: {
    position: 'absolute',
    right: 20,
    top: '56%',
    width: 44,
    height: 44,
  },
});

// ─── Desktop / Web ───────────────────────────────────────────────────────────

export const d = StyleSheet.create({

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  container: { width: '100%', maxWidth: 440 },

  brandRow:  { alignItems: 'center', marginBottom: 14, gap: 8 },
  brandName: { fontSize: 28 },
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: '#FFFFFF' },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: '#E86019' },

  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 30,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    ...Platform.select({
      default: { boxShadow: '0 16px 48px rgba(0,0,0,0.35)' } as any,
    }),
  },

  fieldBlock:     { marginBottom: 16 },
  fieldLabel:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconCircle:     { width: 30, height: 30, borderRadius: 15, backgroundColor: ICON_CIRCLE, alignItems: 'center', justifyContent: 'center' },
  fieldLabelText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: LABEL },

  input: {
    fontFamily: FontFamily.fredokaRegular,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: LABEL,
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pwInput: { fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 15, color: LABEL, padding: 0 },

  forgotRow:  { alignItems: 'flex-end', marginBottom: 20 },
  forgotText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: FORGOT },

  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SIGN_IN_BTN,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 16,
  },
  signInTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: '#FFFFFF' },

  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#D4B896' },
  orText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#B8956A', letterSpacing: 1 },

  staffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#C4A882',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 20,
  },
  staffTxt: { fontFamily: FontFamily.fredokaSemiBold, flex: 1, fontSize: 14, color: LABEL, textAlign: 'center' },

  signupRow:  { flexDirection: 'row', justifyContent: 'center' },
  signupText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },
  signupLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: FORGOT },

  backRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // ── Web image placeholder positions ──────────────────────────────────────────
  // Decorative elements behind the card on the web version.

  webBgIllustration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webDecorLeft: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 300,
    height: 460,
  },
  webDecorRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 260,
    height: 400,
  },
});
