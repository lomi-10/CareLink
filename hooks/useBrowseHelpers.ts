// hooks/useBrowseHelpers.ts
// Custom hook for browsing and filtering helper profiles

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../constants/api';

export interface HelperProfile {
  user_id: string;
  profile_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  age?: number;
  gender?: string;
  
  // Work Info
  category_ids: string[]; // Array of category IDs they work in
  categories: string[]; // Category names (e.g., ["Yaya", "Cook"])
  experience_years?: number;
  employment_type?: string;
  work_schedule?: string;
  expected_salary?: number;
  
  // Location
  distance?: number; // Distance from parent in km
  municipality?: string;
  province?: string;
  
  // Status
  verification_status: string;
  availability_status: string;
  
  // Ratings
  rating_average?: number;
  rating_count?: number;
  
  // Bio
  bio?: string;
}

export interface BrowseFilters {
  category: string; // 'all' or category_id
  distance: number; // in km (5, 10, 20, 50, 'all')
  availability: string; // 'all', 'Available', 'Not Available'
  verification: string; // 'all', 'Verified', 'Pending'
  gender: string; // 'all', 'Male', 'Female'
  experience: string; // 'all', '0-1', '1-3', '3-5', '5+'
  sort: string; // 'nearest', 'highest_rated', 'most_experienced', 'newest'
}

const defaultFilters: BrowseFilters = {
  category: 'all',
  distance: 20,
  availability: 'all',
  verification: 'all',
  gender: 'all',
  experience: 'all',
  sort: 'nearest',
};

export function useBrowseHelpers() {
  const [helpers, setHelpers] = useState<HelperProfile[]>([]);
  const [filteredHelpers, setFilteredHelpers] = useState<HelperProfile[]>([]);
  const [filters, setFilters] = useState<BrowseFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parentLocation, setParentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Fetch helpers from API
  const fetchHelpers = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('Not logged in');
      }

      const user = JSON.parse(userData);

      // Get parent's location for distance calculation
      const profileResponse = await fetch(
        `${API_URL}/parent/get_profile.php?user_id=${user.user_id}`
      );
      const profileData = await profileResponse.json();

      if (profileData.success && profileData.profile) {
        // TODO: Get actual coordinates from municipality
        // For now, mock coordinates
        setParentLocation({ lat: 11.0064, lng: 124.6058 }); // Ormoc City
      }

      // Fetch all helpers
      const response = await fetch(`${API_URL}/helpers/browse.php`);
      const data = await response.json();

      if (data.success) {
        setHelpers(data.helpers);
        setFilteredHelpers(data.helpers);
      } else {
        throw new Error(data.message || 'Failed to load helpers');
      }
    } catch (err: any) {
      console.error('Error fetching helpers:', err);
      setError(err.message || 'Failed to load helpers');
      
      // Mock data for development
      setHelpers([]);
      setFilteredHelpers([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...helpers];

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter((h) =>
        h.category_ids.includes(filters.category)
      );
    }

    // Filter by distance
    if (filters.distance !== 9999 && parentLocation) {
      filtered = filtered.filter((h) => {
        if (!h.distance) return true; // Include if no distance data
        return h.distance <= filters.distance;
      });
    }

    // Filter by availability
    if (filters.availability !== 'all') {
      filtered = filtered.filter((h) => h.availability_status === filters.availability);
    }

    // Filter by verification
    if (filters.verification !== 'all') {
      filtered = filtered.filter((h) => h.verification_status === filters.verification);
    }

    // Filter by gender
    if (filters.gender !== 'all') {
      filtered = filtered.filter((h) => h.gender === filters.gender);
    }

    // Filter by experience
    if (filters.experience !== 'all') {
      filtered = filtered.filter((h) => {
        const years = h.experience_years || 0;
        switch (filters.experience) {
          case '0-1':
            return years <= 1;
          case '1-3':
            return years > 1 && years <= 3;
          case '3-5':
            return years > 3 && years <= 5;
          case '5+':
            return years > 5;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'nearest':
          return (a.distance || 999) - (b.distance || 999);
        case 'highest_rated':
          return (b.rating_average || 0) - (a.rating_average || 0);
        case 'most_experienced':
          return (b.experience_years || 0) - (a.experience_years || 0);
        case 'newest':
          // Assume newer profiles have higher profile_id
          return parseInt(b.profile_id) - parseInt(a.profile_id);
        default:
          return 0;
      }
    });

    setFilteredHelpers(filtered);
  };

  // Update filter
  const updateFilter = (key: keyof BrowseFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // Initial fetch
  useEffect(() => {
    fetchHelpers();
  }, []);

  // Apply filters when filters change
  useEffect(() => {
    applyFilters();
  }, [filters, helpers]);

  return {
    helpers: filteredHelpers,
    allHelpers: helpers,
    filters,
    loading,
    error,
    updateFilter,
    resetFilters,
    refresh: fetchHelpers,
    totalCount: helpers.length,
    filteredCount: filteredHelpers.length,
  };
}
