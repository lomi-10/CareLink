import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  flex: { flex: 1 },
});

/**
 * Centred content columns for the Super Admin screens.
 *
 * WHY: these screens were written mobile-first (SafeAreaView + full-width inputs)
 * and never given a desktop layout, so every one of them rendered edge-to-edge on
 * a wide monitor — a "First Name" field roughly 1800px wide, six stat cards
 * stretched across the viewport, and tab buttons flung to opposite edges. Nothing
 * capped the content width; there was not a single maxWidth in the folder.
 *
 * Line length is what makes a layout feel composed: text stops being comfortable
 * past roughly 75 characters, and an input wider than its longest expected value
 * reads as broken. These three widths cover every admin screen:
 *
 *   wide   — data-dense screens (dashboard grid, audit/user tables)
 *   normal — reading/list screens (complaints)
 *   form   — input columns (create account); deliberately narrow
 *
 * Each is width:100% first, so on a phone they still fill the screen and only
 * begin capping once there is room to spare.
 */
export const layout = StyleSheet.create({
  wide: {
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  normal: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  /** Header bars stay full-bleed, but their inner content still lines up. */
  headerInner: {
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
});
