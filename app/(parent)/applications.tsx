// app/(parent)/applications.tsx
// UPDATED - Uses ConfirmationModal and smart empty states

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Hooks
import { useJobApplications } from '@/hooks/useJobApplications';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { ApplicationCard } from '@/components/parent/jobs/ApplicationCard';
import {LoadingSpinner, NotificationModal} from '@/components/common/';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import API_URL from '@/constants/api';

export default function JobApplications() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDesktop } = useResponsive();

  const jobId = (params.job_id as string) || '';

  const { 
    applications, 
    loading, 
    error, 
    hasPostedJobs, 
    checkingJobs, 
    refresh, 
    stats 
  } = useJobApplications(jobId);

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [notification, setNotification] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error',
  });

  // Confirmation modal states
  const [rejectModal, setRejectModal] = useState({
    visible: false,
    applicationId: '',
  });

  const [shortlistModal, setShortlistModal] = useState({
    visible: false,
    applicationId: '',
  });

  const filteredApplications =
    activeFilter === 'all'
      ? applications
      : applications.filter(
          (app) => app.status.toLowerCase() === activeFilter.toLowerCase()
        );

  const handleViewProfile = (applicationId: string, helperId: string) => {
    router.push({
      pathname: '/(parent)/applicant_profile',
      params: {
        application_id: applicationId,
        helper_id: helperId,
        job_id: jobId,
      },
    });
  };

  const handleShortlistConfirm = async () => {
    const applicationId = shortlistModal.applicationId;
    setShortlistModal({ visible: false, applicationId: '' });

    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: 'Shortlisted',
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Applicant shortlisted successfully',
          type: 'success',
        });
        refresh();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to shortlist applicant',
        type: 'error',
      });
    }
  };

  const handleShortlist = (applicationId: string) => {
    setShortlistModal({ visible: true, applicationId });
  };

  const handleRejectConfirm = async () => {
    const applicationId = rejectModal.applicationId;
    setRejectModal({ visible: false, applicationId: '' });

    try {
      const response = await fetch(
        `${API_URL}/parent/update_application_status.php`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_id: applicationId,
            status: 'Rejected',
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setNotification({
          visible: true,
          message: 'Applicant rejected',
          type: 'success',
        });
        refresh();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        message: error.message || 'Failed to reject applicant',
        type: 'error',
      });
    }
  };

  const handleReject = (applicationId: string) => {
    setRejectModal({ visible: true, applicationId });
  };

  // Show error ONLY if there's an actual API error (not missing job_id)
  if (error && !loading && error !== 'No job ID provided') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={80} color="#FF3B30" />
          <Text style={styles.errorText}>Failed to Load</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show loading spinner
  if (loading || checkingJobs) {
    return <LoadingSpinner visible={true} message="Loading applications..." />;
  }

  // SMART EMPTY STATE: Check if parent has posted jobs
  if (!loading && applications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Applications</Text>
            <Text style={styles.headerSubtitle}>0 applicants</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyState}>
          {!hasPostedJobs ? (
            // NO JOBS POSTED YET
            <>
              <Ionicons name="briefcase-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>No applications yet</Text>
              <Text style={styles.emptySubtext}>
                Post a job first to start receiving applications from helpers
              </Text>
              <TouchableOpacity
                style={styles.postJobButton}
                onPress={() => router.push('/(parent)/post_job')}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.postJobButtonText}>Post a Job</Text>
              </TouchableOpacity>
            </>
          ) : (
            // HAS JOBS BUT NO APPLICATIONS
            <>
              <Ionicons name="people-outline" size={80} color="#ccc" />
              <Text style={styles.emptyText}>No applications yet</Text>
              <Text style={styles.emptySubtext}>
                Applications will appear here when helpers apply to your job
              </Text>
            </>
          )}
        </View>
      </View>
    );
  }

  // Main content with applications
  return (
    <View style={styles.container}>
      <NotificationModal
        visible={notification.visible}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, visible: false })}
      />

      {/* Shortlist Confirmation Modal */}
      <ConfirmationModal
        visible={shortlistModal.visible}
        title="Shortlist Applicant"
        message="Add this applicant to your shortlist?"
        confirmText="Shortlist"
        type="success"
        onConfirm={handleShortlistConfirm}
        onCancel={() => setShortlistModal({ visible: false, applicationId: '' })}
      />

      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        visible={rejectModal.visible}
        title="Reject Applicant"
        message="Are you sure you want to reject this applicant? This action cannot be undone."
        confirmText="Reject"
        type="danger"
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectModal({ visible: false, applicationId: '' })}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Applications</Text>
          <Text style={styles.headerSubtitle}>
            {stats.total} {stats.total === 1 ? 'applicant' : 'applicants'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF9500' }]}>
            {stats.pending}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#007AFF' }]}>
            {stats.shortlisted}
          </Text>
          <Text style={styles.statLabel}>Shortlisted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#34C759' }]}>
            {stats.accepted}
          </Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FF3B30' }]}>
            {stats.rejected}
          </Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'shortlisted', 'rejected'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>
            No {activeFilter !== 'all' ? activeFilter : ''} applications
          </Text>
          <Text style={styles.emptySubtext}>
            Try changing the filter
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.application_id}
          renderItem={({ item }) => (
            <ApplicationCard
              application={item}
              onViewProfile={() =>
                handleViewProfile(item.application_id, item.helper_id)
              }
              onShortlist={() => handleShortlist(item.application_id)}
              onReject={() => handleReject(item.application_id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
    padding: 16,
    paddingBottom: 40,
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
  postJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  postJobButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
