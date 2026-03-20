// app/(helper)/jobs.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// --- MOCK DATA FOR UI DEVELOPMENT ---
const MOCK_JOBS = [
  {
    id: '1',
    title: 'Need a reliable Yaya for 2 toddlers',
    parent_name: 'Mrs. Santos',
    location: 'Cebu City',
    distance: '2.5 km away',
    salary: '₱8,000 - ₱10,000 / month',
    schedule: 'Full-time • Live-in',
    posted_time: '2 hours ago',
    tags: ['Yaya', 'Toddlers', 'Cooking'],
    status: 'open', // 'open' | 'applied' | 'interviewing'
  },
  {
    id: '2',
    title: 'Part-time Cook & Househelp',
    parent_name: 'Mr. Dela Cruz',
    location: 'Mandaue City',
    distance: '5.1 km away',
    salary: '₱500 / day',
    schedule: 'Part-time • Weekends',
    posted_time: '5 hours ago',
    tags: ['Cook', 'Cleaning', 'Part-time'],
    status: 'open',
  },
  {
    id: '3',
    title: 'Experienced Gardener Needed',
    parent_name: 'Elena R.',
    location: 'Talisay City',
    distance: '8.0 km away',
    salary: '₱6,000 / month',
    schedule: 'Part-time • 3x a week',
    posted_time: '1 day ago',
    tags: ['Gardener', 'Outdoor'],
    status: 'applied', 
  },
];

export default function HelperJobsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'discover' | 'applied'>('discover');

  // Filter jobs based on the active tab
  const displayedJobs = MOCK_JOBS.filter((job) => {
    if (activeTab === 'discover') return job.status === 'open';
    return job.status !== 'open'; // Show applied/interviewing etc.
  });

  const handleJobPress = (jobId: string) => {
    // Navigate to job details screen (we will build this next!)
    // router.push({ pathname: '/(helper)/job_details', params: { id: jobId } });
    console.log('Tapped job:', jobId);
  };

  const renderJobCard = ({ item }: { item: typeof MOCK_JOBS[0] }) => (
    <TouchableOpacity 
      style={styles.jobCard} 
      activeOpacity={0.7}
      onPress={() => handleJobPress(item.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
        {activeTab === 'applied' && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Applied</Text>
          </View>
        )}
      </View>

      <Text style={styles.parentName}>{item.parent_name} • {item.posted_time}</Text>

      <View style={styles.detailsRow}>
        <Ionicons name="location-outline" size={16} color="#666" />
        <Text style={styles.detailsText}>{item.location} ({item.distance})</Text>
      </View>

      <View style={styles.detailsRow}>
        <Ionicons name="cash-outline" size={16} color="#28A745" />
        <Text style={[styles.detailsText, { color: '#28A745', fontWeight: '600' }]}>
          {item.salary}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <Ionicons name="time-outline" size={16} color="#666" />
        <Text style={styles.detailsText}>{item.schedule}</Text>
      </View>

      {/* Tags */}
      <View style={styles.tagsContainer}>
        {item.tags.map((tag, index) => (
          <View key={index} style={styles.tagBadge}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Board</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#1A1C1E" />
        </TouchableOpacity>
      </View>

      {/* Custom Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.activeTab]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.activeTabText]}>
            My Applications
          </Text>
        </TouchableOpacity>
      </View>

      {/* Job List */}
      <FlatList
        data={displayedJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No jobs found</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'discover' 
                ? 'Check back later for new opportunities.' 
                : "You haven't applied to any jobs yet."}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1C1E',
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  jobTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginRight: 12,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#28A745',
    fontSize: 12,
    fontWeight: '600',
  },
  parentName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    color: '#444',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tagBadge: {
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});