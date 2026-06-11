// app/(parent)/jobs/work.styles.ts
// Warm-themed styles for the merged "Work Management" screen
// (replaces the old My Job Board + Applications screens).
import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, CARD_BG, BROWN, CARAMEL, GOLD, DARK, MUTED, SUBTLE,
  DIVIDER, ICON_BG, SURFACE, GREEN, SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG,
} from '@/components/parent/home/parentWarmTheme';

const CARD_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  android: { elevation: 2 },
  default: { boxShadow: '0 4px 14px rgba(139,90,43,0.08)' } as any,
});

const SOFT_SHADOW = Platform.select({
  ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 1 },
  default: { boxShadow: '0 2px 10px rgba(139,90,43,0.07)' } as any,
});

export const w = StyleSheet.create({
  page:   { flex: 1, backgroundColor: BG },
  root:   { flex: 1, backgroundColor: BG },

  // ── Mobile top bar ──
  bar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F1DDBE' },
  barBtn:   { padding: 8 },
  barTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },

  scroll:        { paddingBottom: 110 },
  scrollDesktop: { paddingBottom: 48 },

  // ── Header (desktop hero / mobile inline) ──
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
               paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 22, color: DARK, marginBottom: 3 },
  headerSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, maxWidth: 360 },
  postBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: CARAMEL,
    alignItems: 'center', justifyContent: 'center',
    ...SOFT_SHADOW,
  } as any,
  postBtnDisabled: { opacity: 0.45 },

  // ── Stat tiles row ──
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 14, marginBottom: 18 },
  statTile: {
    flex: 1, minWidth: 0,
    backgroundColor: CARD_BG, borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 12,
    gap: 3, borderWidth: 1, borderColor: DIVIDER,
    ...SOFT_SHADOW,
  } as any,
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK, letterSpacing: -0.3 },
  statLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },
  statSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 10, color: MUTED },

  // ── Tab switch (segmented control) ──
  tabSwitchWrap: { paddingHorizontal: 20, marginBottom: 16 },
  tabSwitch: {
    flexDirection: 'row', backgroundColor: ICON_BG, borderRadius: 14, padding: 4, gap: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabBtnActive: {
    backgroundColor: SURFACE,
    ...SOFT_SHADOW,
  } as any,
  tabBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
  tabBtnTextActive: { color: BROWN },

  // ── Pending verification banner spacing ──
  bannerWrap: { marginHorizontal: 20, marginBottom: 12 },

  // ════════════════════════════════════════════════════════════════════════
  // JOBS POSTED TAB
  // ════════════════════════════════════════════════════════════════════════

  splitRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 20 },
  jobListCol:   { width: 300 },
  jobListColMobile: { width: '100%', paddingHorizontal: 20 },
  detailCol:    { flex: 1, minWidth: 0 },

  jobListHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  jobListTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  jobListCount: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN, backgroundColor: ICON_BG,
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  jobListItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD_BG, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: DIVIDER,
  },
  jobListItemActive: { borderColor: CARAMEL, backgroundColor: SURFACE, ...SOFT_SHADOW } as any,
  jobThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  jobItemBody: { flex: 1, minWidth: 0, gap: 3 },
  jobItemTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },
  jobItemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  jobItemSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: BROWN },
  jobItemApplicants: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999 },
  statusPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10 },

  // ── Detail panel ──
  detailCard: {
    backgroundColor: CARD_BG, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: DIVIDER, ...CARD_SHADOW,
  } as any,
  detailEmptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  detailEmptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  detailEmptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 260 },

  detailTopRow: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  detailThumb: { width: 72, height: 72, borderRadius: 18, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  detailHeaderInfo: { flex: 1, minWidth: 0, gap: 5 },
  detailTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  detailMetaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  detailSalary: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: BROWN, marginTop: 2 },

  miniStatsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  miniStatTile: {
    flex: 1, alignItems: 'center', gap: 2,
    backgroundColor: SURFACE, borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: DIVIDER,
  },
  miniStatValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK },
  miniStatLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 9.5, color: MUTED },

  detailActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: CARAMEL, borderRadius: 12, paddingVertical: 11,
    backgroundColor: SURFACE,
  },
  outlineBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },
  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: CARAMEL, borderRadius: 12, paddingVertical: 11,
  },
  primaryBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF' },

  viewDetailsLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, marginBottom: 6 },
  viewDetailsLinkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: BROWN, textDecorationLine: 'underline' },

  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER, marginVertical: 14 },

  recentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  recentTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  recentCountPill: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN, backgroundColor: SUCCESS_BG,
                     paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  applicantRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  applicantAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: ICON_BG },
  applicantAvatarFallback: { width: 42, height: 42, borderRadius: 21, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  applicantInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  applicantBody: { flex: 1, minWidth: 0, gap: 1 },
  applicantName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK },
  applicantMeta: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED },
  applicantReasonText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, fontStyle: 'italic' },
  matchBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ICON_BG, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  matchBadgeTop: { backgroundColor: BROWN },
  matchBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: BROWN },
  matchBadgeTextTop: { color: '#FFFFFF' },

  viewAllLink: { alignSelf: 'flex-start', marginTop: 10 },
  viewAllLinkText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: BROWN },

  recentEmptyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED, paddingVertical: 12, textAlign: 'center' },

  // ════════════════════════════════════════════════════════════════════════
  // APPLICANTS TAB
  // ════════════════════════════════════════════════════════════════════════

  applicantsHeader: { paddingHorizontal: 20, marginBottom: 12, gap: 10 },
  scopeRow: { flexDirection: 'row', gap: 8 },
  scopeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER,
  },
  scopeChipActive: { backgroundColor: CARAMEL, borderColor: CARAMEL },
  scopeChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED },
  scopeChipTextActive: { color: '#FFFFFF' },

  jobPickerRow: { marginTop: 2 },
  jobPickerChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, maxWidth: 200,
  },
  jobPickerChipActive: { backgroundColor: ICON_BG, borderColor: CARAMEL },
  jobPickerChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED },
  jobPickerChipTextActive: { color: BROWN },

  filterScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER,
  },
  filterChipActive: { backgroundColor: BROWN, borderColor: BROWN },
  filterChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED },
  filterChipTextActive: { color: '#FFFFFF' },

  listPad: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  listPadDesktop: { paddingHorizontal: 0 },

  // ── Empty states ──
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 32, gap: 10 },
  emptyIconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 300, lineHeight: 19 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CARAMEL, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11, marginTop: 6,
  },
  emptyBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF' },

  // Mobile drill-down
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 10 },
  backRowText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },

  // ════════════════════════════════════════════════════════════════════════
  // APPLICANT CARD (left list, Applicants tab)
  // ════════════════════════════════════════════════════════════════════════

  appCard: {
    backgroundColor: CARD_BG, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: DIVIDER, gap: 10,
    ...SOFT_SHADOW,
  } as any,
  appCardActive: { borderColor: CARAMEL, backgroundColor: SURFACE },

  appCardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appCardAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: ICON_BG },
  appCardAvatarFallback: { width: 46, height: 46, borderRadius: 23, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  appCardInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: BROWN },
  appCardInfo: { flex: 1, minWidth: 0, gap: 1 },
  appCardName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: DARK },
  appCardApplied: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED },
  appCardMatchBadge: {
    backgroundColor: SUCCESS_BG, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  appCardMatchText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: GREEN },

  appCardStageChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3.5,
    marginTop: 8,
  },
  appCardStageChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },

  appCardMidRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appCardRatingText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: DARK },
  appCardDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: SUBTLE },
  appCardRoleText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  appCardReasonRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appCardReasonText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: MUTED, fontStyle: 'italic' },

  appCardBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  miniBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1,
  },
  miniBadgeGreen: { backgroundColor: SUCCESS_BG, borderColor: '#A7F3D0' },
  miniBadgeBlue:  { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' },
  miniBadgeMatch: { backgroundColor: ICON_BG, borderColor: ICON_BG },
  miniBadgeText:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5 },

  // ════════════════════════════════════════════════════════════════════════
  // INLINE APPLICANT PROFILE PANEL (right column / mobile drill-down)
  // ════════════════════════════════════════════════════════════════════════

  profileHero: { alignItems: 'center', paddingVertical: 8, paddingBottom: 16, gap: 10 },
  profileAvatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: ICON_BG, borderWidth: 3, borderColor: SURFACE },
  profileAvatarFallback: { width: 96, height: 96, borderRadius: 48, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: SURFACE },
  profileInitials: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 30, color: BROWN },
  profileName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: DARK },
  profileBadgesRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', justifyContent: 'center' },

  infoTilesRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  infoTile: {
    flex: 1, alignItems: 'center', gap: 3,
    backgroundColor: SURFACE, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4,
    borderWidth: 1, borderColor: DIVIDER,
  },
  infoTileValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  infoTileLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 9.5, color: MUTED },

  profileTabsRow: {
    flexDirection: 'row', backgroundColor: ICON_BG, borderRadius: 12, padding: 4, gap: 4, marginBottom: 16,
  },
  profileTabBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  profileTabBtnActive: { backgroundColor: SURFACE, ...SOFT_SHADOW } as any,
  profileTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: MUTED },
  profileTabTextActive: { color: BROWN },

  profileSection: { marginBottom: 18 },
  profileSectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: DARK, marginBottom: 10 },

  bioBox: {
    backgroundColor: SURFACE, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: DIVIDER,
  },
  bioText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: MUTED, lineHeight: 21 },

  matchReasonsBox: {
    backgroundColor: SURFACE, borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: DIVIDER,
  },
  matchReasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  matchReasonText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, flex: 1, lineHeight: 19 },

  detailsList: {
    backgroundColor: SURFACE, borderRadius: 14,
    borderWidth: 1, borderColor: DIVIDER, overflow: 'hidden',
  },
  detailItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  detailItemLast: { borderBottomWidth: 0 },
  detailLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: MUTED },
  detailValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: DARK },
  detailValueRight: { flex: 1, textAlign: 'right', marginLeft: 16 },

  skillGroup: { marginBottom: 14 },
  skillGroupLabel: {
    fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: ICON_BG, borderWidth: 1, borderColor: DIVIDER,
  },
  skillChipBlue:  { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' },
  skillChipGreen: { backgroundColor: SUCCESS_BG, borderColor: '#A7F3D0' },
  skillChipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: BROWN },

  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: SURFACE, borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: DIVIDER,
  },
  docIconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  docTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  docStatus: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 1 },

  profileStageLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 10 },
  profileActionsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  profileActionOutline: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: CARAMEL, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: SURFACE, flexGrow: 1,
  },
  profileActionOutlineText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },
  profileActionPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: BROWN, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, flexGrow: 1,
  },
  profileActionPrimaryText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#FFFFFF' },
});

export {
  BG, CARD_BG, BROWN, CARAMEL, GOLD, DARK, MUTED, SUBTLE,
  DIVIDER, ICON_BG, SURFACE, GREEN, SUCCESS_BG, WARNING_BG, DANGER, DANGER_BG,
};
