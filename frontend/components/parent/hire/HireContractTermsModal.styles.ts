import { Platform, StyleSheet } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  CREAM, BROWN, CARAMEL, DARK, MUTED, SUBTLE,
  DIVIDER, ICON_BG, SURFACE, GREEN, SUCCESS_BG, WARNING_BG, OVERLAY,
} from '@/components/parent/home/parentWarmTheme';

const isWeb = Platform.OS === 'web';

export const hireContractTermsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: isWeb ? 'center' : 'flex-end',
    alignItems: isWeb ? 'center' : 'stretch',
    padding: isWeb ? 20 : 0,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: isWeb ? 16 : 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxWidth: isWeb ? 520 : '100%',
    alignSelf: isWeb ? 'center' : 'stretch',
    maxHeight: '92%',
    // On native, a `flex: 1` child (KeyboardAvoidingView) inside a container that only
    // has `maxHeight` (no `height`) can collapse to 0px — Yoga can't resolve the flex
    // basis without a definite parent height. Web/CSS flexbox doesn't have this issue.
    height: isWeb ? undefined : '92%',
    overflow: 'hidden',
  },
  bodyPad: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK, marginBottom: 6 },
  sub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 4 },
  subBold: { fontFamily: FontFamily.fredokaSemiBold, color: DARK },
  list: { paddingHorizontal: 18, marginBottom: 8 },
  sectionTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: DARK,
    marginTop: 18,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
    paddingBottom: 4,
  },
  label: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginTop: 10, marginBottom: 4 },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 6, lineHeight: 15 },
  input: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 15,
    color: DARK,
    backgroundColor: SURFACE,
  },
  notes: {
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14,
    color: DARK,
    backgroundColor: SURFACE,
    minHeight: 80,
    maxHeight: 140,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyBox: {
    backgroundColor: ICON_BG,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderRightWidth: 0,
  },
  currencyText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 15,
    color: DARK,
  },
  salaryInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: SURFACE,
  },
  chipActive: {
    borderColor: GREEN,
    backgroundColor: SUCCESS_BG,
  },
  chipText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: MUTED,
  },
  chipTextActive: {
    color: GREEN,
  },
  dayChip: {
    width: 42,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    backgroundColor: SURFACE,
    alignItems: 'center',
  },
  dayChipActive: {
    borderColor: GREEN,
    backgroundColor: SUCCESS_BG,
  },
  dayChipText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
    color: MUTED,
  },
  dayChipTextActive: {
    color: GREEN,
  },

  // ── Pre-fill banner & full/part-time pill ──
  preFillBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: ICON_BG,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  preFillBannerText: {
    flex: 1,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: BROWN,
    lineHeight: 16,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  pillBlue: { backgroundColor: '#DBEAFE' },
  pillGreen: { backgroundColor: SUCCESS_BG },
  pillText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
    color: DARK,
  },

  // ── Contract type cards ──
  typeCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  typeCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 12,
    padding: 12,
    backgroundColor: SURFACE,
  },
  typeCardActive: {
    borderColor: GREEN,
    backgroundColor: SUCCESS_BG,
  },
  typeCardIcon: { marginBottom: 6 },
  typeCardTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    color: DARK,
    marginBottom: 2,
  },
  typeCardSub: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 11,
    color: MUTED,
  },

  // ── Duration selector ──
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-start',
  },
  durationInput: {
    width: 64,
    textAlign: 'center',
  },
  unitChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  unitChip: {
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: SURFACE,
  },
  unitChipActive: {
    borderColor: GREEN,
    backgroundColor: SUCCESS_BG,
  },

  // ── End date box ──
  endDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ICON_BG,
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 10,
    padding: 12,
  },
  endDateBoxEmpty: {
    backgroundColor: CREAM,
    borderStyle: 'dashed',
  },
  endDateText: {
    flex: 1,
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    color: DARK,
  },
  endDateTextMuted: {
    flex: 1,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: SUBTLE,
    lineHeight: 16,
  },

  // ── Warning / info banners ──
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: WARNING_BG,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  warningBannerText: {
    flex: 1,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: DARK,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: ICON_BG,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  infoBoxText: {
    flex: 1,
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },

  // ── Payment schedule segmented control ──
  segmentedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  segment: {
    flex: 1,
    minWidth: 100,
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: SURFACE,
  },
  segmentActive: {
    borderColor: CARAMEL,
    backgroundColor: ICON_BG,
  },
  segmentText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: BROWN,
  },

  // ── Work hours time pickers ──
  timeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  timeFieldWrap: {
    flex: 1,
    minWidth: 130,
  },
  timeFieldLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 12,
    color: MUTED,
    marginBottom: 4,
  },
  hoursComputedText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: GREEN,
    marginTop: 4,
  },
  hoursCaptionText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 11,
    color: SUBTLE,
    fontStyle: 'italic',
    marginTop: 2,
  },

  // ── Flexible hours toggle ──
  flexibleToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  flexibleToggleLabel: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: DARK,
  },

  // ── Additional Terms collapsible header ──
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: CREAM,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DIVIDER,
  },
  collapsibleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  collapsibleTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: DARK,
  },
  collapsibleSub: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  collapsibleBadge: {
    backgroundColor: CARAMEL,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  collapsibleBadgeText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: SURFACE,
  },

  btns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4, paddingHorizontal: 18, paddingBottom: 18 },
  cancel: { paddingVertical: 10, paddingHorizontal: 14 },
  cancelTxt: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: MUTED },
  confirm: {
    backgroundColor: CARAMEL,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  confirmTxt: { fontFamily: FontFamily.fredokaSemiBold, color: SURFACE, fontSize: 15 },
});
