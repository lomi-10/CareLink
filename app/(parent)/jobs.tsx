// app/(parent)/jobs.tsx

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  SafeAreaView, ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useParentJobs } from '@/hooks/parent';
import { useAuth, useResponsive } from '@/hooks/shared';
import { useUserVerification } from '@/hooks/peso';

import { ConfirmationModal, LoadingSpinner, NotificationModal } from '@/components/shared';
import { MobileMenu, Sidebar } from '@/components/parent/home';
import { JobCard, JobPostModal } from '@/components/parent/jobs';
import { JobDetailsModal } from '@/components/parent/jobs/JobDetailsModal'; // Add this import
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import API_URL from '@/constants/api';
import { styles } from './jobs.styles';

export default function MyJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { jobs, loading, refresh, stats } = useParentJobs();
  const { verification } = useUserVerification();
  const isPending = verification.status === 'Pending';

  const [editingJob, setEditingJob] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewingJob, setViewingJob] = useState<any>(null); // State for the Read-Only Details Modal
  
  // Modals State
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [deleteModal, setDeleteModal] = useState({ visible: false, jobId: '', jobTitle: '' });

  // Logout States
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  const filteredJobs = jobs.filter(job => {
    const matchesFilter = activeFilter === 'all' || job.status.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (job.category_name && job.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const initiateLogout = () => { setIsMobileMenuOpen(false); setConfirmLogoutVisible(true); };
  const executeLogout = () => { setConfirmLogoutVisible(false); setSuccessLogoutVisible(true); };

  const handlePostJob = () => {
    if (!verification.canPostJobs) {
      setNotification({ visible: true, message: 'You need to be verified to post jobs. Please submit your documents.', type: 'error' });
      return;
    }
    setEditingJob(null);
    setIsPostModalVisible(true);
  };

  const handleEditJob = (job: any) => { 
    setEditingJob(job); setIsPostModalVisible(true); 
  };
  const promptDeleteJob = (jobId: string, jobTitle: string) => { setDeleteModal({ visible: true, jobId, jobTitle }); };

  const confirmDeleteJob = async () => {
    try {
      setDeleteModal({ ...deleteModal, visible: false }); 
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/parent/delete_job.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: deleteModal.jobId, parent_id: user.user_id }),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ visible: true, message: 'Job deleted successfully', type: 'success' });
        refresh();
      } else throw new Error(data.message);
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Failed to delete job', type: 'error' });
    }
  };

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/parent/update_job_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_post_id: jobId, status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ visible: true, message: `Job marked as ${newStatus}`, type: 'success' });
        refresh();
      } else throw new Error(data.message);
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Failed to update status', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner visible={true} message="Loading jobs..." />;

  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} autoClose={true} duration={1500} />
      <ConfirmationModal visible={deleteModal.visible} title="Delete Job?" message={`Are you sure you want to delete "${deleteModal.jobTitle}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" type="danger" onConfirm={confirmDeleteJob} onCancel={() => setDeleteModal({ ...deleteModal, visible: false })} />
      <JobPostModal visible={isPostModalVisible} onClose={() => setIsPostModalVisible(false)} existingJobData={editingJob} onSaveSuccess={refresh} />
      <JobDetailsModal 
        visible={!!viewingJob} 
        job={viewingJob} 
        onClose={() => setViewingJob(null)} 
      />
    </>
  );

  const jobsContent = (
    <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
      {isPending && <PendingBanner status="Pending" message={verification.message} />}

      <View style={[styles.statsContainer, isDesktop && styles.statsContainerDesktop]}>
        <View style={[styles.statCard, isDesktop && styles.statCardDesktop]}>
          <View style={[styles.statIconWrapper, { backgroundColor: '#F3F4F6' }]}><Ionicons name="briefcase" size={18} color="#4B5563" /></View>
          <View style={styles.statTextWrapper}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
          </View>
        </View>
        <View style={[styles.statCard, isDesktop && styles.statCardDesktop]}>
          <View style={[styles.statIconWrapper, { backgroundColor: '#ECFDF5' }]}><Ionicons name="radio-button-on" size={18} color="#10B981" /></View>
          <View style={styles.statTextWrapper}>
            <Text style={styles.statValue}>{stats.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
        </View>
        <View style={[styles.statCard, isDesktop && styles.statCardDesktop]}>
          <View style={[styles.statIconWrapper, { backgroundColor: '#EFF6FF' }]}><Ionicons name="checkmark-circle" size={18} color="#3B82F6" /></View>
          <View style={styles.statTextWrapper}>
            <Text style={styles.statValue}>{stats.filled}</Text>
            <Text style={styles.statLabel}>Filled</Text>
          </View>
        </View>
        <View style={[styles.statCard, isDesktop && styles.statCardDesktop]}>
          <View style={[styles.statIconWrapper, { backgroundColor: '#FEF2F2' }]}><Ionicons name="close-circle" size={18} color="#EF4444" /></View>
          <View style={styles.statTextWrapper}>
            <Text style={styles.statValue}>{stats.closed}</Text>
            <Text style={styles.statLabel}>Closed</Text>
          </View>
        </View>
        <View style={[styles.statCard, isDesktop && styles.statCardDesktop]}>
          <View style={[styles.statIconWrapper, { backgroundColor: '#FFFBEB' }]}><Ionicons name="people" size={18} color="#F59E0B" /></View>
          <View style={styles.statTextWrapper}>
            <Text style={styles.statValue}>{stats.totalApplications}</Text>
            <Text style={styles.statLabel}>Applicants</Text>
          </View>
        </View>
      </View>

      <View style={[styles.filterWrapper, isDesktop && styles.filterWrapperDesktop]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterScrollContent, isDesktop && styles.filterScrollContentDesktop]}>
          {['all', 'open', 'filled', 'closed', 'expired'].map((filter) => (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]} 
              onPress={() => setActiveFilter(filter)} 
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, activeFilter === filter && styles.filterPillTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.searchContainer, isDesktop && styles.searchContainerDesktop]}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by job title or category..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {filteredJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>{activeFilter === 'all' ? 'No jobs posted yet' : `No ${activeFilter} jobs found`}</Text>
          {activeFilter === 'all' && verification.canPostJobs && (
            <TouchableOpacity style={styles.emptyStateButton} onPress={handlePostJob}>
              <Text style={styles.emptyStateButtonText}>Post Your First Job</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item.job_post_id}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              onViewDetails={() => setViewingJob(item)} // Updates the state, popping the modal!
              onViewApplications={() => router.push({ pathname: '/(parent)/applications', params: { job_id: item.job_post_id } })}
              onEdit={() => handleEditJob(item)}
              onDelete={() => promptDeleteJob(item.job_post_id, item.title)}
              onUpdateStatus={(status) => handleUpdateStatus(item.job_post_id, status)}
            />
          )}
          contentContainerStyle={[styles.listContent, isDesktop && styles.listContentDesktop]}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        />
      )}
    </View>
  );

  if (isDesktop){
    return(
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {renderModals()}
        <Sidebar onLogout={initiateLogout} />
        <View style={styles.desktopContentWrapper}>
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>My Posted Jobs</Text>
            <TouchableOpacity style={[styles.desktopPostButton, !verification.canPostJobs && styles.postButtonDisabled]} onPress={handlePostJob}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.desktopPostButtonText}>Post New Job</Text>
            </TouchableOpacity>
          </View>
          {jobsContent}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderModals()}
      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>My Posted Jobs</Text>
        <TouchableOpacity style={[styles.postButton, !verification.canPostJobs && styles.postButtonDisabled]} onPress={handlePostJob}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {jobsContent}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} handleLogout={initiateLogout} />
    </SafeAreaView>
  );
}