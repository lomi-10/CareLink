// hooks/useRecommendations.ts
// Hook for personalized job recommendations - NO MOCK DATA

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';
import { JobPost } from './useBrowseJobs';

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch personalized recommendations
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      // Call API
      const response = await fetch(`${API_URL}/helper/recommendations.php?helper_id=${user.user_id}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setRecommendations(data.recommendations || []);
      } else {
        // No recommendations - empty state
        setRecommendations([]);
      }
    } catch (err: any) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
      // On error, show empty
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // Mark recommendation as not interested
  const markNotInterested = async (jobId: string) => {
    try {
      // Remove from recommendations
      setRecommendations(prev => prev.filter(job => job.job_post_id !== jobId));

      // Call API to improve future recommendations
      await fetch(`${API_URL}/helper/not_interested.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId })
      });
      
    } catch (err) {
      console.error('Error marking not interested:', err);
    }
  };

  // Request more similar recommendations
  const getMoreLikeThis = async (jobId: string) => {
    try {
      const response = await fetch(`${API_URL}/helper/more_like_this.php?job_id=${jobId}`);
      const data = await response.json();
      
      if (data.success && data.recommendations) {
        // Add new recommendations
        setRecommendations(prev => [...data.recommendations, ...prev].slice(0, 10));
      }
    } catch (err) {
      console.error('Error getting similar recommendations:', err);
    }
  };

  // Refresh recommendations
  const refreshRecommendations = async () => {
    await fetchRecommendations();
  };

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
  }, []);

  return {
    recommendations,
    loading,
    error,
    markNotInterested,
    getMoreLikeThis,
    refresh: refreshRecommendations,
    totalCount: recommendations.length,
  };
}