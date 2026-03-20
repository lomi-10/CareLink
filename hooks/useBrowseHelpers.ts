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

      // Fetch all helpers
      const response = await fetch(`${API_URL}/parent/browse.php`);
      const data = await response.json();

      if (data.success) {
        setHelpers(data.helpers);
        setFilteredHelpers(data.helpers);
      } else {
        throw new Error(data.message || 'Failed to load helpers');
      }
    } catch (err: any) {
      console.log('Backend not ready, using mock data...');
      
      // 🚀 MOCK DATA FOR UI DEVELOPMENT
      const mockHelpers: HelperProfile[] = [
        {
          user_id: "101",
          profile_id: "201",
          full_name: "Maria Santos",
          first_name: "Maria",
          last_name: "Santos",
          profile_image: "https://i.pravatar.cc/150?img=5",
          age: 28,
          gender: "Female",
          category_ids: ["1", "2"], // Assuming 1=Yaya, 2=Cook
          categories: ["Yaya", "Cook"],
          experience_years: 4,
          distance: 1.2,
          verification_status: "Verified",
          availability_status: "Available",
          rating_average: 4.8,
          rating_count: 12,
        },
        {
          user_id: "102",
          profile_id: "202",
          full_name: "Juan Dela Cruz",
          first_name: "Juan",
          last_name: "Dela Cruz",
          profile_image: "https://i.pravatar.cc/150?img=11",
          age: 35,
          gender: "Male",
          category_ids: ["4"], // Assuming 4=Gardener
          categories: ["Gardener", "Driver"],
          experience_years: 8,
          distance: 5.5,
          verification_status: "Verified",
          availability_status: "Available",
          rating_average: 4.9,
          rating_count: 34,
        },
        {
          user_id: "103",
          profile_id: "203",
          full_name: "Elena Reyes",
          first_name: "Elena",
          last_name: "Reyes",
          profile_image: "https://i.pravatar.cc/150?img=9",
          age: 22,
          gender: "Female",
          category_ids: ["1"], 
          categories: ["Yaya"],
          experience_years: 1,
          distance: 15.0,
          verification_status: "Pending",
          availability_status: "Not Available",
          rating_average: 3.5,
          rating_count: 2,
        },
        {
          user_id: "104",
          profile_id: "204",
          full_name: "Rosa Dimaculangan",
          first_name: "Rosa",
          last_name: "Dimaculangan",
          profile_image: "https://i.pravatar.cc/150?img=16",
          age: 42,
          gender: "Female",
          category_ids: ["3"], 
          categories: ["Househelp"],
          experience_years: 12,
          distance: 2.1,
          verification_status: "Verified",
          availability_status: "Available",
          rating_average: 5.0,
          rating_count: 89,
        }
      ];

      // Feed the mock data into your state
      setHelpers(mockHelpers);
      setFilteredHelpers(mockHelpers);
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
