// app/(parent)/jobs.tsx
// Refactored to use the modular ConfirmationModal & optimized for performance

import React, { useState } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  RefreshControl, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useParentJobs } from '@/hooks/useParentJobs';
import { useVerificationStatus } from '@/hooks/useVerificationStatus';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';

import { Sidebar, MobileMenu } from '@/components/parent/home';
import { JobCard, JobPostModal } from '@/components/parent/jobs';
import { PendingBanner } from '@/components/parent/verification/PendingBanner';
import { NotificationModal, LoadingSpinner, ConfirmationModal } from '@/components/common';
import { styles } from './jobs.styles';
import API_URL from '@/constants/api';

export default function MyJobs() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const { handleLogout } = useAuth();
  const { jobs, loading, refresh, stats } = useParentJobs();
  const { verification, isPending } = useVerificationStatus();

  const [editingJob, setEditingJob] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Modals State
  const [isPostModalVisible, setIsPostModalVisible] = useState(false);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });
  const [deleteModal, setDeleteModal] = useState({ visible: false, jobId: '', jobTitle: '' });

  // Logout States
  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [successLogoutVisible, setSuccessLogoutVisible] = useState(false);

  const filteredJobs = activeFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.status.toLowerCase() === activeFilter.toLowerCase());

  // Logout Handlers
  const initiateLogout = () => {
    setIsMobileMenuOpen(false); 
    setConfirmLogoutVisible(true); 
  };

  const executeLogout = () => {
    setConfirmLogoutVisible(false);
    setSuccessLogoutVisible(true);
  };

  const handlePostJob = () => {
    if (!verification.canPostJobs) {
      setNotification({
        visible: true,
        message: 'You need to be verified to post jobs. Please submit your documents.',
        type: 'error'
      });
      return;
    }
    setEditingJob(null);
    setIsPostModalVisible(true);
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job);
    setIsPostModalVisible(true);
  };

  const promptDeleteJob = (jobId: string, jobTitle: string) => {
    setDeleteModal({ visible: true, jobId, jobTitle });
  };

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
      } else {
        throw new Error(data.message);
      }
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
      } else { throw new Error(data.message); }
    } catch (error: any) {
      setNotification({ visible: true, message: error.message || 'Failed to update status', type: 'error' });
    }
  };

  if (loading) return <LoadingSpinner visible={true} message="Loading jobs..." />;

  // ==========================================
  // FIXED: Consolidated ALL modals into one clean function
  // ==========================================
  const renderModals = () => (
    <>
      <ConfirmationModal visible={confirmLogoutVisible} title="Log Out" message="Are you sure you want to log out of your account?" confirmText="Log Out" cancelText="Cancel" type="danger" onConfirm={executeLogout} onCancel={() => setConfirmLogoutVisible(false)} />
      <NotificationModal visible={successLogoutVisible} message="Logged Out Successfully!" type="success" autoClose={true} duration={1500} onClose={() => { setSuccessLogoutVisible(false); handleLogout(); }} />
      <NotificationModal visible={notification.visible} message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, visible: false })} autoClose={true} duration={1500} />
      <ConfirmationModal visible={deleteModal.visible} title="Delete Job?" message={`Are you sure you want to delete "${deleteModal.jobTitle}"? This cannot be undone.`} confirmText="Delete" cancelText="Cancel" type="danger" onConfirm={confirmDeleteJob} onCancel={() => setDeleteModal({ ...deleteModal, visible: false })} />
      <JobPostModal visible={isPostModalVisible} onClose={() => setIsPostModalVisible(false)} existingJobData={editingJob} onSaveSuccess={refresh} />
    </>
  );

  // ==========================================
  // FIXED: Changed to a standard variable instead of an inner function component
  // ==========================================
  const jobsContent = (
    <View style={styles.mainContent}>
      {isPending && <PendingBanner status="Pending" message={verification.message} />}

      <View style={[styles.statsContainer, isDesktop && styles.statsContainerDesktop]}>
        <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Jobs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>{stats.filled}</Text>
          <Text style={styles.statLabel}>Filled</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#ff9900ff' }]}>{stats.closed}</Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#ff4400ff' }]}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#000000ff' }]}>{stats.totalApplications}</Text>
          <Text style={styles.statLabel}>Applications</Text>
        </View>
      </View>

      <View style={[styles.filterContainer, isDesktop && styles.filterContainerDesktop]}>
        {['all', 'open', 'filled', 'closed', 'expired'].map((filter) => (
          <TouchableOpacity 
            key={filter} 
            style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]} 
            onPress={() => setActiveFilter(filter)} 
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filteredJobs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>{activeFilter === 'all' ? 'No jobs posted yet' : `No ${activeFilter} jobs`}</Text>
          {activeFilter === 'all' && verification.canPostJobs && (
            <TouchableOpacity style={styles.postJobButton} onPress={handlePostJob}>
              <Text style={styles.postJobButtonText}>Post a Job</Text>
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

  // DESKTOP LAYOUT
  if (isDesktop){
    return(
      <View style={[styles.container, { flexDirection: 'row' }]}>
        {/* Look how clean this is now! */}
        {renderModals()}

        <Sidebar onLogout={initiateLogout} />

        <View style={styles.desktopContentWrapper}>
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopPageTitle}>My Posted Jobs</Text>
            <TouchableOpacity style={[styles.desktopPostButton, !verification.canPostJobs && styles.postButtonDisabled]} onPress={handlePostJob}>
              <Ionicons name="add" size={20} color="#fff" /><Text style={styles.desktopPostButtonText}>Post New Job</Text>
            </TouchableOpacity>
          </View>
          
          {jobsContent}

        </View>
      </View>
    )
  }

  // MOBILE LAYOUT
  return (
    <SafeAreaView style={styles.container}>
      {/* Look how clean this is now! */}
      {renderModals()}

      <View style={styles.mobileHeader}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setIsMobileMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.mobileTitle}>My Posted Jobs</Text>
        <TouchableOpacity style={[styles.postButton, !verification.canPostJobs && styles.postButtonDisabled]} onPress={handlePostJob}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {jobsContent}
      
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        handleLogout={initiateLogout} 
      />
    </SafeAreaView>
  );
}