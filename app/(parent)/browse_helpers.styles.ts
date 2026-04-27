// app/(parent)/browse_helpers.styles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Base Styles
  container: { flex: 1, backgroundColor: 'transparent' },
  mainContent: { flex: 1 },
  contentWrapper: { flex: 1 },

  // Desktop Header
  pageHeader: { 
    paddingHorizontal: 32, 
    paddingTop: 32, 
    paddingBottom: 16, 
    backgroundColor: 'transparent' 
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pageTitle: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: '#1A1C1E' 
  },

  // Mobile Header
  mobileHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  mobileTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1A1C1E' 
  },

  // Shared Styles
  menuButton: { padding: 8 },
  
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

  // Empty State
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
