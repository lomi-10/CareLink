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
  hint: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 5,
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

});

// ─── Desktop / Web ───────────────────────────────────────────────────────────
// Split layout over the same full-bleed photo login.tsx uses (login-bg-web.png):
//   left  = brand + hero copy (the ONE logo, same as login)
//   right = a wide, two-column form card — pairing fields (name/name,
//           email/mobile, password/confirm) turns a long single-column
//           mobile form into something that reads as a real web form
//           instead of a phone screen stretched wide.
// Card/input colours still come from the role theme (authThemes.ts) inline —
// only structure lives here, so parent/helper keep their identity.

const ICON_CIRCLE_LIGHT = 'rgba(255,255,255,0.14)';

export const d = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1A0D04' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },

  shell: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 56,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },

  leftPanel: { flex: 1, minWidth: 0, maxWidth: 460, paddingTop: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 48 },
  brandName: { fontSize: 32, letterSpacing: -0.5 },
  brandCare: { fontFamily: FontFamily.fredokaSemiBold, color: '#FFFFFF' },
  brandLink: { fontFamily: FontFamily.fredokaSemiBold, color: '#E86019' },
  brandTag: {
    fontFamily: FontFamily.fredokaRegular, fontSize: 13.5,
    color: 'rgba(255,255,255,0.62)', marginTop: 2, lineHeight: 19, maxWidth: 200,
  },

  heroTitle: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 40, lineHeight: 49,
    color: '#FFFFFF', letterSpacing: -1,
  },
  heroAccent: { color: '#E86019' },
  heroBody: {
    fontFamily: FontFamily.fredokaRegular, fontSize: 15, lineHeight: 24,
    color: 'rgba(255,255,255,0.66)', marginTop: 18, maxWidth: 400,
  },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 32, alignSelf: 'flex-start' },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: 'rgba(255,255,255,0.72)' },

  // ── Right: form card ──
  card: {
    width: 620,
    flexGrow: 0,
    flexShrink: 0,
    borderRadius: 26,
    paddingHorizontal: 34,
    paddingVertical: 28,
    ...Platform.select({ default: { boxShadow: '0 24px 70px rgba(0,0,0,0.45)' } as any }),
  },

  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 25, marginBottom: 3, letterSpacing: -0.4 },
  subtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, marginBottom: 16 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 18,
  },
  pillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Two-column field grid — each row is either one 2-col pair or one full row.
  gridRow: { flexDirection: 'row', gap: 14 },
  col: { flex: 1, minWidth: 0 },

  fieldLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, marginBottom: 7 },
  input: {
    fontFamily: FontFamily.fredokaRegular, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5,
    outlineStyle: 'none' as any,
  },
  pwRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, gap: 8,
  },
  pwInput: { fontFamily: FontFamily.fredokaRegular, flex: 1, fontSize: 14.5, padding: 0, outlineStyle: 'none' as any },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, marginTop: -10, marginBottom: 14 },

  // Compact inline password-requirement chips (replaces the tall mobile block).
  // Deliberately small: five chips have to sit on one or two tidy rows inside a
  // 620px card, and at the previous size the fifth orphaned onto its own line.
  pwReqsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 16, marginTop: 2 },
  pwReqChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4,
  },
  pwReqChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },

  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 20, marginTop: 4 },
  consentText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, lineHeight: 18 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 16, marginBottom: 16,
  },
  submitText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },

  footerRow: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5 },
  footerLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },

  iconCircleLight: { width: 30, height: 30, borderRadius: 15, backgroundColor: ICON_CIRCLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
});
