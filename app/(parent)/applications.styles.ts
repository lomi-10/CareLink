// app/(parent)/applications.styles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Base Styles (Matched to profile.tsx)
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  mainContent: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60, flex: 1 },
  mobileScrollContent: { padding: 16, paddingBottom: 40, flex: 1 },
  
  // Empty State
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8F9FA' },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16, marginBottom: 24 },
  createProfileBtn: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  createProfileText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  // Desktop Header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 32, fontWeight: '700', color: '#1A1C1E' },
  editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, gap: 8 },
  editButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  
  // Mobile Header
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuButton: { padding: 8 },
  mobileTitle: { fontSize: 18, fontWeight: '700', color: '#1A1C1E' },

  // Filters specific to this page
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
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

  listContent: {
    paddingBottom: 40,
  },
});
