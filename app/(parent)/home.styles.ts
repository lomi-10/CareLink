// app/(parent)/home.styles.ts
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafaff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 32,
    paddingBottom: 60,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  quickActionsDesktop: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  quickActionDesktopCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionDesktopIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  quickActionDesktopTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  quickActionDesktopDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  mobileScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  mobileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
});