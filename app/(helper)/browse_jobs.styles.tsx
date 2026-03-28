// app/(helper)/browse_jobs.tsx
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainContent: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchContainerDesktop: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
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
  myApplicationsButton: {
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
  myApplicationsButtonText: {
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
  myApplicationsIconButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  
  // Shared Styles
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  listContainerDesktop: {
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 60,
  },
  columnWrapper: {
    //justifyContent: 'space-between',
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
    //flexDirection: 'row',
  },
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
  resetButton: {
    backgroundColor: '#007AFF',
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