// app/(auth)/login.styles.ts
// m = mobile styles  |  d = desktop (web) styles
//
// Desktop is a split layout over a full-bleed background photo:
//   left  = brand (the ONE logo) + hero copy
//   right = form card (deliberately NO logo — the brand mark is already on the left)
// Mobile keeps the warm cream page with the logo above the card.

import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

// ─── Shared values ─────────────────────────────────────────────────────────────
const PAGE_BG     = '#FAE8D0';
const CARD_BG     = '#FFFFFF';
const CARD_BG_WEB = '#FDF9F3';   // faintly warm so it sits in the photo, not on it
const INPUT_BG    = '#FDF5E8';
const ICON_CIRCLE = '#F0DBBA';
const LABEL       = '#2A1608';
const MUTED       = '#9A7B5A';
const FORGOT      = '#E86019';
const SIGN_IN_BTN = '#1B2B4B';
const TRUST_COLOR = '#7A4E2A';
const BACK_TEXT   = '#5C3A1A';
const CREAM       = '#F6E7D2';

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
  brandRow: { alignItems: 'center', marginBottom: 4 },
  brandName: { fontSize: 26, letterSpacing: -0.3 },
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: '#2A1608' },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: '#E86019' },

  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 28,
    color: LABEL,
    textAlign: 'center',
    marginTop: 10,
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

  // create account (mobile has NO staff portal — staff are web-first)
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

  trustRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trustText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: TRUST_COLOR },
});

// ─── Desktop / Web ───────────────────────────────────────────────────────────

export const d = StyleSheet.create({

  page: { flex: 1, backgroundColor: '#1A0D04' },

  /** Full-bleed background photo (assets/images/login-bg-web.png). */
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },

  /** Split shell: brand left, card right. */
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 56,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },

  // ── Left: brand + hero copy ──
  leftPanel: { flex: 1, minWidth: 0, maxWidth: 520 },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 56 },
  brandName: { fontSize: 32, letterSpacing: -0.5 },
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: '#FFFFFF' },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: '#E86019' },
  brandTag: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.62)',
    marginTop: 2,
    lineHeight: 19,
    maxWidth: 200,
  },

  heroTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 44,
    lineHeight: 54,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  heroAccent: { color: '#E86019' },
  heroBody: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.66)',
    marginTop: 18,
    maxWidth: 420,
  },

  // ── Right: form card (no logo by design) ──
  card: {
    width: 456,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: CARD_BG_WEB,
    borderRadius: 26,
    padding: 34,
    ...Platform.select({
      default: { boxShadow: '0 24px 70px rgba(0,0,0,0.45)' } as any,
    }),
  },

  title: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 30,
    color: LABEL,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 13.5,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
  },

  fieldBlock:     { marginBottom: 16 },
  fieldLabel:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconCircle:     { width: 30, height: 30, borderRadius: 15, backgroundColor: ICON_CIRCLE, alignItems: 'center', justifyContent: 'center' },
  fieldLabelText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: LABEL },

  input: {
    fontFamily: FontFamily.fredokaRegular,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: '#EFDCC0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: LABEL,
    outlineStyle: 'none' as any,
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: '#EFDCC0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  pwInput: { fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 15, color: LABEL, padding: 0, outlineStyle: 'none' as any },

  forgotRow:  { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: FORGOT },

  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SIGN_IN_BTN,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 18,
  },
  signInTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: '#FFFFFF' },

  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#D4B896' },
  orText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#B8956A', letterSpacing: 1 },

  staffBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2CDAB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
  },
  staffIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: ICON_CIRCLE,
    alignItems: 'center', justifyContent: 'center',
  },
  staffTxt:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: LABEL },
  staffSub:  { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginTop: 1 },

  signupRow:  { flexDirection: 'row', justifyContent: 'center' },
  signupText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: MUTED },
  signupLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: FORGOT },

  backRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22, alignSelf: 'flex-start' },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: 'rgba(255,255,255,0.72)' },

  // ── Bottom trust bar ──
  trustBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: CREAM,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginHorizontal: 40,
    marginBottom: 26,
    width: '100%',
    maxWidth: 1180,
    ...Platform.select({
      default: { boxShadow: '0 10px 30px rgba(0,0,0,0.28)' } as any,
    }),
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1, justifyContent: 'center' },
  trustIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EBD5B4',
    alignItems: 'center', justifyContent: 'center',
  },
  trustTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: LABEL },
  trustSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: TRUST_COLOR, marginTop: 1 },
  trustDivider: { width: StyleSheet.hairlineWidth, height: 34, backgroundColor: '#D9BE96' },
});
