// hooks/useMyApplications.ts
// Custom hook for managing job applications

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface Application {
  application_id: string;
  job_post_id: string;
  helper_id: string;
  
  // Application Details
  cover_letter: string;
  status: 'Pending' | 'Reviewed' | 'Shortlisted' | 'Interview Scheduled' | 'Accepted' | 'Rejected' | 'Withdrawn';
  parent_notes?: string;
  
  // Timestamps
  applied_at: string;
  reviewed_at?: string;
  updated_at?: string;
  
  // Job Details
  job_title: string;
  job_description: string;
  employment_type: string;
  work_schedule: string;
  salary_offered: number;
  salary_period: string;
  municipality: string;
  province: string;
  
  // Parent Info
  parent_id: string;
  parent_name: string;
  parent_verified: boolean;
  parent_rating?: number;
  
  // Job Status
  job_status: string; // 'Open', 'Filled', 'Closed', 'Expired'
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
      console.log('Backend not ready, using mock data...');
      
      // 🚀 MOCK DATA FOR UI DEVELOPMENT
      const mockApplications: Application[] = [
        {
          application_id: "1",
          job_post_id: "1",
          helper_id: "1",
          cover_letter: "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Live-in Yaya position. With over 3 years of experience in childcare, I am confident in my ability to provide excellent care for your 2-year-old child.\n\nBest regards,\nMaria Santos",
          status: "Shortlisted",
          applied_at: "2 days ago",
          reviewed_at: "1 day ago",
          job_title: "Live-in Yaya Needed",
          job_description: "We are a young family looking for a caring yaya...",
          employment_type: "Live-in",
          work_schedule: "Full-time",
          salary_offered: 8000,
          salary_period: "Monthly",
          municipality: "Ormoc City",
          province: "Leyte",
          parent_id: "2",
          parent_name: "Cruz Family",
          parent_verified: true,
          parent_rating: 4.8,
          job_status: "Open",
        },
        {
          application_id: "2",
          job_post_id: "2",
          helper_id: "1",
          cover_letter: "Hello,\n\nI am interested in the part-time cook position. I have experience cooking Filipino and Western dishes and am available Monday, Wednesday, and Friday as requested.",
          status: "Pending",
          applied_at: "5 hours ago",
          job_title: "Part-time Cook Needed",
          job_description: "Looking for a skilled cook...",
          employment_type: "Live-out",
          work_schedule: "Part-time",
          salary_offered: 400,
          salary_period: "Daily",
          municipality: "Ormoc City",
          province: "Leyte",
          parent_id: "3",
          parent_name: "Santos Family",
          parent_verified: true,
          job_status: "Open",
        },
        {
          application_id: "3",
          job_post_id: "5",
          helper_id: "1",
          cover_letter: "Good day!\n\nI am applying for the general househelp position. I have experience with cleaning, laundry, and light cooking.",
          status: "Rejected",
          parent_notes: "Thank you for applying. We've decided to move forward with another candidate whose experience better matches our needs.",
          applied_at: "1 week ago",
          reviewed_at: "5 days ago",
          job_title: "General Househelp",
          job_description: "Seeking reliable househelp...",
          employment_type: "Live-in",
          work_schedule: "Full-time",
          salary_offered: 7000,
          salary_period: "Monthly",
          municipality: "Tacloban City",
          province: "Leyte",
          parent_id: "4",
          parent_name: "Garcia Family",
          parent_verified: false,
          job_status: "Filled",
        },
      ];

      setApplications(mockApplications);
      setFilteredApplications(mockApplications);
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
      rejected: applications.filter((app) => app.status === 'Rejected').length,
      withdrawn: applications.filter((app) => app.status === 'Withdrawn').length,
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
        // Update local state
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
      console.log('Backend error:', err.message);
      // For development: simulate success
      setApplications((prev) =>
        prev.map((app) =>
          app.application_id === applicationId
            ? { ...app, status: 'Withdrawn' as const }
            : app
        )
      );
      return { success: true };
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