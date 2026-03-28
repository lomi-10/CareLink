// app/(helper)/my_applications.styles.ts

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  
  // Desktop Styles
  desktopContentWrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  desktopPageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  browseJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  browseJobsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  
  // Mobile Styles
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  browseIconButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statsBarDesktop: {
    marginHorizontal: 32,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  
  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  filterContainerDesktop: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  
  // List
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  listContainerDesktop: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 60,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});