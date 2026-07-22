// app/(helper)/profile/public-preview.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { makeProfileTheme, type ProfileTheme } from './profile.theme';

const cardShadow = Platform.select({
  ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
  android: { elevation: 2 },
  default: { boxShadow: '0 6px 20px rgba(139,94,60,0.08)' } as any,
});

export function createStyles(t: ProfileTheme = makeProfileTheme()) {
  const { PAGE_BG, BAR_BG, DARK, MUTED, ORANGE, GREEN, CARD_BG, DIVIDER, ICON_BG } = t;
  return StyleSheet.create({
    page:   { flex: 1, backgroundColor: PAGE_BG },
    scroll: { padding: 16, paddingBottom: 40, gap: 14 },
    scrollDesktop: { padding: 32, paddingBottom: 64 },

    // Constrained, centered résumé column on desktop
    webWrap: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 18 },

    bar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: BAR_BG, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: DIVIDER },
    barBtn:   { padding: 8, marginRight: 4 },
    barTitle: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
    barSpacer:{ width: 40 },

    noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF6EE', borderWidth: 1, borderColor: '#F6DCC0', borderRadius: 14, padding: 13 },
    noticeText:   { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, lineHeight: 18 },

    // ── Hero band (gradient) ──
    heroGrad:      { borderRadius: 24, padding: 22, overflow: 'hidden' },
    heroInner:     { alignItems: 'center', gap: 16 },
    heroInnerDesktop: { flexDirection: 'row', alignItems: 'center', gap: 28, paddingHorizontal: 8 },
    heroAvatarWrap:{ padding: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
    heroPhoto:     { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: 'rgba(255,255,255,0.55)' },
    heroPhotoFb:   { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    heroText:      { flex: 1, alignItems: 'center', gap: 8, minWidth: 0 },
    heroName:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: '#FFFFFF', textAlign: 'center', lineHeight: 28 },
    heroNameDesktop: { fontSize: 30, lineHeight: 36, textAlign: 'left' },
    heroTitleLine: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: 'rgba(255,247,238,0.9)', letterSpacing: 0.2 },
    heroMetaRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
    heroChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
    heroChipVerified: { backgroundColor: 'rgba(5,150,105,0.35)' },
    heroChipText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: '#FFFFFF' },

    // ── Two-column body (desktop) ──
    row2:    { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
    sidebar: { flexBasis: 330, flexShrink: 0, gap: 18 },
    main:    { flex: 1, minWidth: 0, gap: 18 },

    // ── Section cards ──
    card:     { backgroundColor: CARD_BG, borderRadius: 18, borderWidth: 1, borderColor: DIVIDER, padding: 18, gap: 14, ...cardShadow },
    secHead:  { flexDirection: 'row', alignItems: 'center', gap: 9 },
    secIcon:  { width: 30, height: 30, borderRadius: 9, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
    cardTitle:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 15.5, color: DARK },
    bioText:  { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: MUTED, lineHeight: 21 },

    // Work details grid
    detailGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    detailBlock: { flexGrow: 1, flexBasis: 130, minWidth: 120 },
    detailLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
    detailValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: DARK },
    detailValueMissing: { color: ORANGE },  // bold accent nudge for unfinished fields

    // Chips
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag:     { backgroundColor: '#FDF2E4', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, borderWidth: 1, borderColor: '#F1D9BB' },
    tagText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: ORANGE },

    emptyNote: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, fontStyle: 'italic' },

    // ── Work-experience timeline ──
    tlRow:      { flexDirection: 'row', gap: 12 },
    tlGutter:   { width: 14, alignItems: 'center' },
    tlDot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: ORANGE, borderWidth: 2.5, borderColor: '#FDE7D3', marginTop: 3 },
    tlLine:     { flex: 1, width: 2, backgroundColor: DIVIDER, marginTop: 2 },
    tlBody:     { flex: 1, paddingBottom: 18 },
    tlHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    tlRole:     { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
    tlEmployer: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#7A4E2A', marginTop: 2 },
    tlDates:    { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: ORANGE, marginTop: 2 },
    tlDuties:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginTop: 6, lineHeight: 19 },
    refBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
    refText:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: '#0B7B5B' },

    // "Not completed yet" nudge — bold + accent to push the helper to finish
    nudgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#FEF3E9', borderWidth: 1, borderColor: '#F6D9B8', borderStyle: 'dashed', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10 },
    nudgeText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: ORANGE, lineHeight: 17 },
  });
}
