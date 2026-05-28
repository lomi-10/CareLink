// hooks/useAuth.ts
// Custom hook for user authentication, data, and logout functionality

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export interface UserData {
  user_id: string;
  email: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  user_type: string;
  status: string;
  profile_completed?: boolean | number;
  profile_image?: string;
  full_name?: string;
}

export function useAuth() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data from AsyncStorage
  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem('user_data');
      if (data) {
        setUserData(JSON.parse(data));
      } else {
        // No user data - redirect to login
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Get full name
  const getFullName = () => {
    if (!userData) return '';
    const { first_name, middle_name, last_name } = userData;
    return `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name}`.trim();
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return {
    userData,
    loading,
    handleLogout,
    getFullName,
    refreshUserData: loadUserData,
  };
}
