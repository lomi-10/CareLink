// hooks/useBrowseHelpers.ts
// Custom hook for browsing and filtering helper profiles

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';

export interface HelperProfile {
  user_id: string;
  profile_id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  profile_image?: string;
  age?: number;
  gender?: string;
  
  // Contact
  email?: string;
  phone?: string;
  
  // Work Info
  category_ids: string[]; 
  categories: string[]; 
  jobs?: string[];     // NEW: Specific Roles
  skills?: string[];   // NEW: Specific Abilities
  experience_years?: number;
  employment_type?: string;
  work_schedule?: string;
  expected_salary?: number;
  
  // Background
  education_level?: string;
  religion?: string;
  civil_status?: string;
  
  // Documents
  police_clearance?: string;
  nbi_clearance?: string;
  medical_certificate?: string;
  tesda_nc2?: string;
  
  // Location
  distance?: number; 
  barangay?: string;
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
  category: string; 
  distance: number; 
  availability: string; 
  verification: string; 
  gender: string; 
  experience: string; 
  sort: string; 
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
  const [parentLocation, setParentLocation] = useState<{ lat: number; lng: number; } | null>(null);

  const fetchHelpers = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');

      const response = await fetch(`${API_URL}/parent/browse.php`);
      const data = await response.json();

      if (data.success) {
        setHelpers(data.helpers);
        setFilteredHelpers(data.helpers);
      } else {
        throw new Error(data.message || 'Failed to load helpers');
      }
    } catch (err: any) {
      console.log('Backend not ready, using empty data...');
      setHelpers([]);
      setFilteredHelpers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...helpers];

    if (filters.category !== 'all') {
      filtered = filtered.filter((h) => h.category_ids?.includes(filters.category));
    }
    if (filters.distance !== 9999 && parentLocation) {
      filtered = filtered.filter((h) => !h.distance || h.distance <= filters.distance);
    }
    if (filters.availability !== 'all') {
      filtered = filtered.filter((h) => h.availability_status === filters.availability);
    }
    if (filters.verification !== 'all') {
      filtered = filtered.filter((h) => h.verification_status === filters.verification);
    }
    if (filters.gender !== 'all') {
      filtered = filtered.filter((h) => h.gender === filters.gender);
    }
    if (filters.experience !== 'all') {
      filtered = filtered.filter((h) => {
        const years = h.experience_years || 0;
        switch (filters.experience) {
          case '0-1': return years <= 1;
          case '1-3': return years > 1 && years <= 3;
          case '3-5': return years > 3 && years <= 5;
          case '5+': return years > 5;
          default: return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'nearest': return (a.distance || 999) - (b.distance || 999);
        case 'highest_rated': return (b.rating_average || 0) - (a.rating_average || 0);
        case 'most_experienced': return (b.experience_years || 0) - (a.experience_years || 0);
        case 'newest': return parseInt(b.profile_id) - parseInt(a.profile_id);
        default: return 0;
      }
    });

    setFilteredHelpers(filtered);
  };

  const updateFilter = (key: keyof BrowseFilters, value: any) => setFilters((prev) => ({ ...prev, [key]: value }));
  const resetFilters = () => setFilters(defaultFilters);

  useEffect(() => { fetchHelpers(); }, []);
  useEffect(() => { applyFilters(); }, [filters, helpers]);

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