// hooks/useHelperProfile.ts
// Custom hook for fetching, managing, and mapping helper profile data

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import API_URL from '../../constants/api';
import { theme } from '@/constants/theme';

// 1. FIXED INTERFACE: Added all missing DB columns and mapped arrays
export interface HelperProfileData {
  user: {
    user_id: string;
    email: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    username?: string;
  };
  profile: {
    profile_id: string;
    profile_image?: string;
    gender?: string;
    birth_date?: string; 
    date_of_birth?: string; // Mapped for UI
    age?: number;           // Calculated for UI
    civil_status?: string;
    religion?: string;
    education_level?: string;
    contact_number?: string;
    bio?: string;
    employment_type?: string;
    work_schedule?: string;
    years_experience?: number;
    expected_salary?: number;
    salary_period?: string;
    street?: string;
    barangay?: string;
    city?: string; // Note: Your PHP uses 'municipality', we map it below
    province?: string;
    verification_status: string;
  };
  // Translated arrays for the UI
  mappedSpecialties: {
    jobs: string[];
    skills: string[];
    languages: string[];
  };
  documents: Array<{
    document_id: string;
    document_type: string;
    file_url: string;
    file_path: string;
    status: string;
  }>;
  /** 0–100 from API */
  profile_completeness?: number;
}

export function useHelperProfile() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<HelperProfileData | null>(null);
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

      const url = `${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server Error! Status: ${response.status}`);
      }

      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText);
        
        if (data.success) {
          // 2. DATA TRANSFORMATION PIPELINE
          
          // Calculate Age from birth_date
          let calculatedAge = 0;
          if (data.profile?.birth_date) {
            const birthDate = new Date(data.profile.birth_date);
            const today = new Date();
            calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
              calculatedAge--;
            }
          }

          // Map IDs to Names for UI Display
          const mappedJobs = data.selected_jobs?.map((id: number) => {
            const match = data.available_jobs?.find((j: any) => j.job_id === id);
            return match ? match.job_title : '';
          }).filter(Boolean) || [];

          const mappedSkills = data.selected_skills?.map((id: number) => {
            const match = data.available_skills?.find((s: any) => s.skill_id === id);
            return match ? match.skill_name : '';
          }).filter(Boolean) || [];

          const mappedLanguages = data.selected_languages?.map((id: number) => {
            const match = data.available_languages?.find((l: any) => l.language_id === id);
            return match ? match.language_name : '';
          }).filter(Boolean) || [];

          // Format the final object to match exactly what the UI expects
          const formattedData: HelperProfileData = {
            user: data.user,
            profile: {
              ...data.profile,
              date_of_birth: data.profile?.birth_date,
              age: calculatedAge,
              city: data.profile?.municipality, // Map PHP municipality to UI city
            },
            mappedSpecialties: {
              jobs: mappedJobs,
              skills: mappedSkills,
              languages: mappedLanguages
            },
            documents: data.documents || [],
            profile_completeness:
              typeof data.profile_completeness === 'number'
                ? data.profile_completeness
                : 0,
          };

          setProfileData(formattedData);
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
        return {
          icon: 'shield-checkmark',
          text: 'PESO Verified',
          color: theme.color.helper,
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