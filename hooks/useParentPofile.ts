// hooks/useParentProfile.ts
// Custom hook for fetching and managing parent profile data

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_URL from '../constants/api';

export interface ParentProfileData {
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
    contact_number?: string;
    bio?: string;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    landmark?: string;
    verification_status: string;
  };
  household: {
    household_size?: number;
    has_pets?: boolean;
    pets_description?: string;
    special_needs_care?: boolean;
    special_needs_details?: string;
  };
  children: Array<{
    child_id: string;
    name: string;
    age: number;
    gender: string;
    special_needs?: string;
  }>;
  children_count: number;
  documents: Array<{
    document_id: string;
    document_type: string;
    file_url: string;
    file_path: string;
    status: string;
  }>;
}

export function useParentProfile() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ParentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

      const url = `${API_URL}/parent/get_profile.php?user_id=${parsed.user_id}`;
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

  const refresh = async () => {
    await loadProfile();
  };

  const getFullName = () => {
    if (!profileData?.user) return '';
    const { first_name, middle_name, last_name } = profileData.user;
    return `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
  };

  const getVerificationBadge = () => {
    const status = profileData?.profile?.verification_status || 'Unverified';
    switch (status) {
      case 'Verified':
        return { icon: 'checkmark-circle', text: 'Verified Parent', color: '#34C759' };
      case 'Pending':
        return { icon: 'time', text: 'Pending Verification', color: '#FF9500' };
      case 'Rejected':
        return { icon: 'close-circle', text: 'Verification Failed', color: '#FF3B30' };
      default:
        return { icon: 'alert-circle', text: 'Not yet Verified', color: '#999' };
    }
  };

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
