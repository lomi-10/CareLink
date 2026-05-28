// app/(parent)/browse_helpers.styles.ts
import { StyleSheet } from 'react-native';
import type { ThemeColor } from '@/constants/theme';

export function createParentBrowseHelpersStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    mainContent: { flex: 1 },
    contentWrapper: { flex: 1 },

    pageHeader: {
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 16,
      backgroundColor: 'transparent',
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    pageTitle: {
      fontSize: 32,
      fontWeight: '700',
      color: c.ink,
    },

    mobileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    mobileTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.ink,
    },

    menuButton: { padding: 8 },

    resultsBar: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: c.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    resultsText: {
      fontSize: 13,
      color: c.muted,
      fontWeight: '600',
    },
    listContainer: {
      padding: 12,
      paddingBottom: 88,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    mobileCardWrapper: {
      flex: 1,
      maxWidth: '50%',
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    desktopCardWrapper: {
      flex: 1,
      maxWidth: '33.333%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },

    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
      marginTop: 40,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '700',
      color: c.ink,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: c.muted,
      textAlign: 'center',
      marginBottom: 24,
    },
    resetButton: {
      backgroundColor: c.parent,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 12,
    },
    resetButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
