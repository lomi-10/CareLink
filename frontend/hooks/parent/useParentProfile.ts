// hooks/useParentProfile.ts
// Custom hook for fetching and managing parent profile data

import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import API_URL from '../../constants/api';
import { theme } from '@/constants/theme';

export interface ParentProfileData {
  user: {
    user_id: number;
    email: string;
    username: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
  };
  profile: {
    profile_id: number;
    profile_image?: string;
    contact_number?: string;
    bio?: string;
    province?: string;
    municipality?: string;
    barangay?: string;
    address?: string;
    landmark?: string;
    verification_status: string;
  };
  household: {
    household_size?: number;
    /** house | apartment | condominium | townhouse | other */
    household_type?: string | null;
    has_children?: boolean;
    has_elderly?: boolean;
    has_pets?: boolean;
    pet_details?: string;
  };
  children: Array<{
    child_id: number;
    age: number;
    gender?: string;
    special_needs?: string;
  }>;
  children_count: number;
  elderly: Array<{
    elderly_id: number;
    age: number;
    gender?: string;
    condition?: string;
    care_level: string;
  }>;
  elderly_count: number;
  documents: Array<{
    document_id: number;
    document_type: string;
    file_url: string;
    file_path: string;
    status: string;
  }>;
  /** 0–100 from API */
  profile_completeness?: number;
}

export function useParentProfile() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ParentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadProfile = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
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

      const url = `${API_URL}/parent/get_profile.php?user_id=${parsed.user_id}&requester_id=${parsed.user_id}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server Error! Status: ${response.status}`);
      }

      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText);
        if (data.success) {
          setProfileData({
            ...data,
            profile_completeness:
              typeof data.profile_completeness === 'number'
                ? data.profile_completeness
                : 0,
          });
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
      if (!opts?.silent) setLoading(false);
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
        return {
          icon: 'shield-checkmark',
          text: 'PESO Verified',
          color: theme.color.parent,
          variant: 'peso_verified' as const,
        };
      case 'Pending':
        return {
          icon: 'time',
          text: 'Pending Verification',
          color: theme.color.warning,
          variant: 'default' as const,
        };
      case 'Rejected':
        return {
          icon: 'close-circle',
          text: 'Verification Failed',
          color: theme.color.danger,
          variant: 'default' as const,
        };
      default:
        return {
          icon: 'alert-circle',
          text: 'Not yet Verified',
          color: theme.color.subtle,
          variant: 'default' as const,
        };
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

  const didInitialLoad = useRef(false);
  useEffect(() => {
    loadProfile().finally(() => { didInitialLoad.current = true; });
  }, []);

  // Verification status changes from PESO's side while the parent is
  // elsewhere in the app — this used to only refresh on the very first load,
  // so "Pending Verification" stayed stale until logging out and back in. A
  // silent (no spinner) refetch on every return to a screen using this hook
  // keeps it current without the flicker of the full loading state.
  useFocusEffect(
    useCallback(() => {
      if (didInitialLoad.current) void loadProfile({ silent: true });
    }, []),
  );

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