// hooks/parent/useParentRecommendations.ts
// Hook for personalized helper recommendations — NO MOCK DATA
// PHP: parent/recommended_helpers.php (weighted-match algorithm mirroring helper/recommendations.php)

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface RecommendedHelper {
  user_id:              string;
  profile_id:           string;
  full_name:            string;
  first_name:           string;
  last_name:            string;
  profile_image?:       string;
  bio?:                 string;
  experience_years:     number;
  employment_type?:     string;
  work_schedule?:       string;
  expected_salary:      number;
  salary_period?:       string;
  barangay?:            string;
  municipality?:        string;
  province?:            string;
  distance:             number | null;
  distance_exact:       boolean;
  category_ids:         number[];
  categories:           string[];
  jobs?:                string[];
  skills?:              string[];
  verification_status?: string;
  is_verified:          boolean;
  rating_average:       number;
  rating_count:         number;
  match_score:          number;
  match_reasons:        string[];
}

export function useParentRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendedHelper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');
      const user = JSON.parse(userData);

      const response = await fetch(`${API_URL}/parent/recommended_helpers.php?parent_id=${user.user_id}&limit=10&requester_id=${user.user_id}`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
      } else {
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('Error fetching helper recommendations:', err);
      setError(err.message);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refresh: fetchRecommendations,
    totalCount: recommendations.length,
  };
}
