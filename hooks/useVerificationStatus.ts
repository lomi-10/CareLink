// hooks/useVerificationStatus.ts
// Custom hook for checking parent verification status and restrictions

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface VerificationStatus {
  status: 'Verified' | 'Pending' | 'Rejected' | 'Unverified';
  canPostJobs: boolean;
  canBrowseHelpers: boolean;
  canApplyActions: boolean; // Can invite, message, hire
  canManageJobs: boolean;
  message: string;
}

export function useVerificationStatus() {
  const [verification, setVerification] = useState<VerificationStatus>({
    status: 'Pending',
    canPostJobs: false,
    canBrowseHelpers: false,
    canApplyActions: false,
    canManageJobs: false,
    message: 'Checking verification status...',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      setLoading(true);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      // Fetch parent profile to get verification_status
      const response = await fetch(
        `${API_URL}/parent/get_profile.php?user_id=${user.user_id}`
      );
      const data = await response.json();

      if (data.success && data.profile) {
        const status = data.profile.verification_status || 'Unverified';

        let permissions: VerificationStatus;

        switch (status) {
          case 'Verified':
            permissions = {
              status: 'Verified',
              canPostJobs: true,
              canBrowseHelpers: true,
              canApplyActions: true,
              canManageJobs: true,
              message: 'Your account is verified',
            };
            break;

          case 'Pending':
            permissions = {
              status: 'Pending',
              canPostJobs: false,
              canBrowseHelpers: true, // Can preview
              canApplyActions: false, // Cannot invite/message
              canManageJobs: false,
              message:
                'Your account is pending verification. You can browse helpers but cannot post jobs or send invitations until verified.',
            };
            break;

          case 'Rejected':
            permissions = {
              status: 'Rejected',
              canPostJobs: false,
              canBrowseHelpers: true, // Can still view
              canApplyActions: false,
              canManageJobs: false,
              message:
                'Your verification was rejected. Please contact PESO for more information.',
            };
            break;

          default:
            permissions = {
              status: 'Unverified',
              canPostJobs: false,
              canBrowseHelpers: true,
              canApplyActions: false,
              canManageJobs: false,
              message:
                'Please complete your profile and submit documents for verification.',
            };
        }

        setVerification(permissions);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    checkVerificationStatus();
  };

  return {
    verification,
    loading,
    refresh,
    isPending: verification.status === 'Pending',
    isVerified: verification.status === 'Verified',
    isRejected: verification.status === 'Rejected',
  };
}
