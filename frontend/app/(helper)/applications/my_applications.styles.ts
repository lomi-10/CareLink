// app/(helper)/applications/my_applications.styles.ts
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';
const PAGE_BG = '#FBF5EC';

// Signature accepts optional arg so index.tsx callers need no change
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createHelperMyApplicationsStyles(_c?: any) {
  return StyleSheet.create({
    root:    { flex: 1, backgroundColor: PAGE_BG },
    content: { flex: 1 },

    // ── Desktop ─────────────────────────────────────────────────────────────────
    desktopMain: { flex: 1, backgroundColor: PAGE_BG },
    desktopHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 32,
      paddingVertical: 24,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    pageTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: DARK },
    pageSubtitle: { fontFamily: FontFamily.fredokaRegular,  fontSize: 14, color: MUTED, marginTop: 2 },
    browseJobsBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: ICON_BG,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    browseJobsBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },

    // ── Mobile header ────────────────────────────────────────────────────────────
    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: '#fff',
      borderBottomWidth: 1,
      borderBottomColor: DIVIDER,
    },
    menuBtn:            { padding: 6 },
    mobileHeaderCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    mobileTitle:        { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
    pendingBadge:       { backgroundColor: ORANGE, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    pendingBadgeText:   { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 11 },
    searchIconBtn:      { padding: 8, backgroundColor: ICON_BG, borderRadius: 10, position: 'relative' },
    notifBadge:         { position: 'absolute', top: 4, right: 4, backgroundColor: ORANGE, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
    notifBadgeText:     { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 9 },

    // ── Search bar ───────────────────────────────────────────────────────────────
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginTop: 14,
      backgroundColor: '#fff',
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    searchInput: {
      flex: 1,
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 14,
      color: DARK,
      padding: 0,
    },

    // ── Stats dark-brown card ────────────────────────────────────────────────────
    statsCard: {
      marginHorizontal: 16,
      marginTop: 14,
      backgroundColor: DARK,
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-evenly',
      ...Platform.select({
        ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14 },
        android: { elevation: 8 },
        default: { boxShadow: '0 6px 20px rgba(0,0,0,0.28)' } as any,
      }),
    },
    statItem:    { flex: 1, alignItems: 'center', gap: 3 },
    statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.12)' },
    statValue:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: '#fff' },
    statLabel:   {
      fontFamily: FontFamily.fredokaRegular,
      fontSize: 10,
      color: 'rgba(255,255,255,0.55)',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    // Legacy scroll stats (unused but kept so callers don't break)
    statsScroll:    { paddingHorizontal: 16, paddingVertical: 16, gap: 10, flexDirection: 'row' },
    statTile:       { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, gap: 4, minWidth: 80 },
    statIconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

    // ── Featured active application card ─────────────────────────────────────────
    featuredSection: { marginHorizontal: 16, marginTop: 18 },
    featuredLabel:   {
      fontFamily: FontFamily.fredokaSemiBold,
      fontSize: 12,
      color: MUTED,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 10,
    },
    featuredCard: {
      backgroundColor: DARK,
      borderRadius: 20,
      padding: 18,
      ...Platform.select({
        ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 12 },
        android: { elevation: 6 },
        default: { boxShadow: '0 4px 16px rgba(0,0,0,0.22)' } as any,
      }),
    },
    featuredTop:        { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 14 },
    featuredAvatar:     { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    featuredAvatarText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: '#fff' },
    featuredInfo:       { flex: 1, minWidth: 0 },
    featuredJobTitle:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff', marginBottom: 4 },
    featuredEmployer:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
    featuredBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.14)',
      flexShrink: 0,
    },
    featuredBadgeText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: '#fff' },
    featuredMeta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featuredMetaItem:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
    featuredMetaText:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: 'rgba(255,255,255,0.55)' },

    // ── Section header ───────────────────────────────────────────────────────────
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 16,
      marginTop: 22,
      marginBottom: 10,
    },
    sectionHeaderText:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
    sectionHeaderCount:     { backgroundColor: ICON_BG, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    sectionHeaderCountText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED },

    // ── Filter chips ─────────────────────────────────────────────────────────────
    filterScroll: { paddingHorizontal: 16, paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: DIVIDER,
    },
    filterChipActive:     { backgroundColor: DARK, borderColor: DARK },
    filterChipText:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
    filterChipTextActive: { color: '#fff' },

    // ── Results bar ──────────────────────────────────────────────────────────────
    resultsBar:  { paddingHorizontal: 16, paddingVertical: 6 },
    resultsText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },

    // ── List ─────────────────────────────────────────────────────────────────────
    listPad:        { paddingHorizontal: 16, paddingBottom: 88, paddingTop: 4 },
    listPadDesktop: { paddingHorizontal: 32, paddingTop: 8, paddingBottom: 60 },

    // ── Empty state ──────────────────────────────────────────────────────────────
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: ICON_BG,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 8, textAlign: 'center' },
    emptySub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    browseBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: DARK,
      paddingVertical: 13,
      paddingHorizontal: 24,
      borderRadius: 14,
    },
    browseBtnText: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 15 },
  });
}
