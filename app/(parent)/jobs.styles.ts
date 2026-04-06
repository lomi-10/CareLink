// app/(parent)/jobs.styles.ts

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Modern soft gray background
  },
  
  // --- MOBILE HEADER ---
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    zIndex: 10,
  },
  menuButton: { padding: 4 },
  mobileTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  postButton: {
    backgroundColor: '#007AFF', width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  postButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },

  // --- DESKTOP HEADER ---
  desktopContentWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  desktopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  desktopPageTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  desktopPostButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF',
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, gap: 8,
  },
  desktopPostButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // --- MAIN CONTENT AREA (THE MAGIC FIX) ---
  mainContent: {
    flex: 1,
  },
  mainContentDesktop: {
    // This constrains EVERYTHING (stats, filters, and feed) to perfectly align centrally
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 24, // Gives breathing room below the white header
  },

  // --- STATS CARDS ---
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsContainerDesktop: {
    paddingHorizontal: 0, 
    paddingVertical: 0,
    marginBottom: 24, // Space between stats and filters
    flexWrap: 'nowrap', // Forces them onto one line on desktop
    justifyContent: 'space-between',
    backgroundColor: 'transparent', // Removes the white bar stretching
    borderBottomWidth: 0,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 140, // Keeps them from getting squished on mobile wrapping
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  statCardDesktop: {
    minWidth: 0, // Removes minimum width so all 5 cards can perfectly squeeze into one row
  },
  statIconWrapper: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  statTextWrapper: { flex: 1 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  // --- FILTERS (PILLS) ---
  filterWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterWrapperDesktop: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    marginBottom: 16, // Space before the job list
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterScrollContentDesktop: {
    paddingHorizontal: 0, // Snaps flush to the left of the feed
    paddingVertical: 0,
  },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent',
  },
  filterPillActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  filterPillText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  filterPillTextActive: { color: '#1D4ED8' },

  // --- LIST CONTENT ---
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  listContentDesktop: {
    padding: 0, // Padding removed since mainContentDesktop handles it now
    paddingBottom: 40,
  },

  // --- EMPTY STATE ---
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 16, marginBottom: 24, fontWeight: '500' },
  emptyStateButton: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyStateButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});