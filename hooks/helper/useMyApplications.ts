// hooks/useMyApplications.ts
// Custom hook for managing job applications

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

export interface Application {
  application_id: string;
  job_post_id: string;
  helper_id: string;
  
  // Application Details
  cover_letter: string;
  status:
    | 'Pending'
    | 'Reviewed'
    | 'Shortlisted'
    | 'Interview Scheduled'
    | 'Accepted'
    | 'Rejected'
    | 'Withdrawn'
    | 'contract_pending'
    | 'hired'
    | 'auto_rejected';
  parent_notes?: string;
  message_from_parent?: string; // Added to fix TS error
  
  // Timestamps
  applied_at: string;
  reviewed_at?: string;
  updated_at?: string;
  employer_signed_at?: string | null;
  helper_signed_at?: string | null;
  contract_generated_at?: string | null;
  
  // Job Details
  job_title: string;
  job_description: string;
  employment_type: string;
  work_schedule: string;
  salary_offered: number;
  salary_period: string;
  municipality: string;
  province: string;
  location?: string; // Added to fix TS error
  
  // Parent Info
  parent_id: string;
  parent_name: string;
  parent_verified: boolean;
  parent_rating?: number;
  
  // Job Status
  job_status: string; // 'Open', 'Filled', 'Closed', 'Expired'

  // Category / Job type info
  category_name?: string;
  job_names?: string[];
}

export interface ApplicationStats {
  total: number;
  pending: number;
  reviewed: number;
  shortlisted: number;
  interview_scheduled: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  contract_pending: number;
  hired: number;
}

export function useMyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch applications from API
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      if(USE_MOCK){
        console.log(" DEMO MODE ON: LOADING UI MOCK DATA...");

        //const { MOCK_APPLICATIONS } = require('../constants/mockData');
        
        //setApplications(MOCK_APPLICATIONS);
        //setFilteredApplications(MOCK_APPLICATIONS);
        setApplications([]);
        setFilteredApplications([]);
        setLoading(false);
        return;
      }

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/helper/my_applications.php?helper_id=${user.user_id}`);
      const data = await response.json();

      if (data.success) {
        setApplications(data.applications);
        setFilteredApplications(data.applications);
      } else {
        throw new Error(data.message || 'Failed to load applications');
      }
    } catch (err: any) {
      console.log('Error Fetching Applications:', err);
      setError(err.message)

      setApplications([]);
      setFilteredApplications([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply status filter
  const applyFilter = () => {
    if (statusFilter === 'all') {
      setFilteredApplications(applications);
    } else if (statusFilter === 'active') {
      // Active = Pending, Reviewed, Shortlisted, Interview Scheduled
      setFilteredApplications(
        applications.filter((app) => 
          ['Pending', 'Reviewed', 'Shortlisted', 'Interview Scheduled'].includes(app.status)
        )
      );
    } else if (statusFilter === 'Rejected') {
      setFilteredApplications(
        applications.filter((app) => app.status === 'Rejected' || app.status === 'auto_rejected'),
      );
    } else {
      setFilteredApplications(
        applications.filter((app) => app.status === statusFilter)
      );
    }
  };

  // Calculate stats
  const getStats = (): ApplicationStats => {
    return {
      total: applications.length,
      pending: applications.filter((app) => app.status === 'Pending').length,
      reviewed: applications.filter((app) => app.status === 'Reviewed').length,
      shortlisted: applications.filter((app) => app.status === 'Shortlisted').length,
      interview_scheduled: applications.filter((app) => app.status === 'Interview Scheduled').length,
      accepted: applications.filter((app) => app.status === 'Accepted').length,
      rejected: applications.filter((app) => app.status === 'Rejected' || app.status === 'auto_rejected').length,
      auto_rejected: applications.filter((app) => app.status === 'auto_rejected').length,
      withdrawn: applications.filter((app) => app.status === 'Withdrawn').length,
      contract_pending: applications.filter((app) => app.status === 'contract_pending').length,
      hired: applications.filter((app) => app.status === 'hired').length,
    };
  };

  // Withdraw application
  const withdrawApplication = async (applicationId: string) => {
    try {
      const response = await fetch(`${API_URL}/helper/withdraw_application.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId }),
      });

      const data = await response.json();

      if (data.success) {
        setApplications((prev) =>
          prev.map((app) =>
            app.application_id === applicationId
              ? { ...app, status: 'Withdrawn' as const }
              : app
          )
        );
        return { success: true };
      } else {
        throw new Error(data.message || 'Failed to withdraw application');
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to withdraw application');
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, []);

  // Apply filter when filter changes
  useEffect(() => {
    applyFilter();
  }, [statusFilter, applications]);

  return {
    applications: filteredApplications,
    allApplications: applications,
    stats: getStats(),
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refresh: fetchApplications,
    withdrawApplication,
  };
}