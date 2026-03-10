// hooks/useHelperProfile.ts
// Custom hook for fetching and managing helper profile data

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_URL from '../constants/api';

export interface HelperProfileData {
  user: {
    user_id: string;
    email: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
  };
  profile: {
    profile_id: string;
    profile_image?: string;
    gender?: string;
    date_of_birth?: string;
    age?: number;
    contact_number?: string;
    bio?: string;
    employment_type?: string;
    work_schedule?: string;
    years_experience?: number;
    expected_salary?: number;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    verification_status: string;
  };
  documents: Array<{
    document_id: string;
    document_type: string;
    file_url: string;
    file_path: string;
    status: string;
  }>;
}

export function useHelperProfile() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<HelperProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load profile from backend
  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        setError('You are not logged in. Please log in again.');
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 1500);
        return;
      }

      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);

      // Fetch profile from backend
      const url = `${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server Error! Status: ${response.status}`);
      }

      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText);
        if (data.success) {
          setProfileData(data);
        } else {
          throw new Error(data.message || 'Failed to load profile data.');
        }
      } catch (parseError) {
        console.error('Raw response:', responseText);
        throw new Error('Server sent invalid data format');
      }
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Unable to load profile');
    } finally {
      setLoading(false);
    }
  };

  // Refresh profile data
  const refresh = async () => {
    await loadProfile();
  };

  // Get full name
  const getFullName = () => {
    if (!profileData?.user) return '';
    const { first_name, middle_name, last_name } = profileData.user;
    return `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
  };

  // Get verification badge info
  const getVerificationBadge = () => {
    const status = profileData?.profile?.verification_status || 'Unverified';
    switch (status) {
      case 'Verified':
        return {
          icon: 'checkmark-circle',
          text: 'Verified Helper',
          color: '#34C759',
        };
      case 'Pending':
        return {
          icon: 'time',
          text: 'Pending Verification',
          color: '#FF9500',
        };
      case 'Rejected':
        return {
          icon: 'close-circle',
          text: 'Verification Failed',
          color: '#FF3B30',
        };
      default:
        return {
          icon: 'alert-circle',
          text: 'Not yet Verified',
          color: '#999',
        };
    }
  };

  // Get document by type
  const getDocument = (type: string) => {
    const doc = profileData?.documents?.find((d) => d.document_type === type);
    return {
      status: doc ? 'uploaded' : 'pending',
      url: doc?.file_url || null,
      file_path: doc?.file_path || '',
    };
  };

  useEffect(() => {
    loadProfile();
  }, []);

  return {
    profileData,
    loading,
    error,
    userId,
    refresh,
    getFullName,
    getVerificationBadge,
    getDocument,
  };
}
