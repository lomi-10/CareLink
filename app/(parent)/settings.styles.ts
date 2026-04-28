import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
  desktopMain: { flex: 1, maxHeight: '100%' as unknown as number },
  desktopScroll: { padding: 20, paddingBottom: 40, maxWidth: 800, width: '100%', alignSelf: 'center' },
  desktopTopBar: { marginBottom: 20 },
  desktopPageTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  desktopPageSub: { fontSize: 14, marginTop: 4 },

  mobileRoot: { flex: 1, backgroundColor: 'transparent' },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  mobileHeaderTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  mobileBody: { flex: 1, paddingHorizontal: 16, paddingBottom: 88 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  sectionHint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },

  options: { gap: 10, marginTop: 4 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: 16, fontWeight: '700' },
  optionHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },

  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    width: '48%',
    minWidth: 150,
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  themeCardLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  themeCardHint: { fontSize: 12, lineHeight: 16 },

  logItem: { padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1 },
  logAction: { fontWeight: '600', fontSize: 14 },
  logTime: { fontSize: 12, marginTop: 4 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  center: { paddingVertical: 24, alignItems: 'center' },
});
