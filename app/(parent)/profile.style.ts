// app/(parent)/profile.style.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F8F9FA' },
  emptyText: { fontSize: 16, color: '#666', marginTop: 16, marginBottom: 24 },
  createProfileBtn: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  createProfileText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mainContent: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 32, fontWeight: '700', color: '#1A1C1E' },
  editButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, gap: 8 },
  editButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  menuButton: { padding: 8 },
  mobileTitle: { fontSize: 18, fontWeight: '700', color: '#1A1C1E' },
  editIconButton: { padding: 8 },
  mobileScrollContent: { padding: 16, paddingBottom: 40 },
});