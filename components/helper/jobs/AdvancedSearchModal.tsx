// components/helper/jobs/AdvancedSearchModal.tsx
// Advanced search modal with comprehensive filters

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import type { JobFilters } from '@/hooks/helper';
import type { Category } from '@/hooks/shared';

interface AdvancedSearchModalProps {
  visible: boolean;
  filters: JobFilters;
  onApply: (filters: JobFilters) => void;
  onClose: () => void;
  categories: Category[];
}

export function AdvancedSearchModal({
  visible,
  filters,
  onApply,
  onClose,
  categories,
}: AdvancedSearchModalProps) {
  const [localFilters, setLocalFilters] = useState<JobFilters>(filters);
  const [matchCount, setMatchCount] = useState(0); // Would be calculated from API

  const updateFilter = (key: keyof JobFilters, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
    // In production, call API to get live count
    // setMatchCount(...)
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: JobFilters = {
      category: 'all',
      distance: 20,
      employment_type: 'all',
      work_schedule: 'all',
      salary_min: 0,
      salary_max: 50000,
      sort: 'recommended',
      search_query: '',
      verified_only: false,
      posted_within: 'all',
    };
    setLocalFilters(defaultFilters);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, styles.responsiveModal]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Advanced Search</Text>
              <Text style={styles.headerSubtitle}>Refine your job search</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Category</Text>
              <View style={styles.categoryGrid}>
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    localFilters.category === 'all' && styles.categoryChipActive
                  ]}
                  onPress={() => updateFilter('category', 'all')}
                >
                  <Text style={[
                    styles.categoryChipText,
                    localFilters.category === 'all' && styles.categoryChipTextActive
                  ]}>All Categories</Text>
                </TouchableOpacity>
                
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.category_id}
                    style={[
                      styles.categoryChip,
                      localFilters.category === cat.category_id.toString() && styles.categoryChipActive
                    ]}
                    onPress={() => updateFilter('category', cat.category_id.toString())}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      localFilters.category === cat.category_id.toString() && styles.categoryChipTextActive
                    ]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Maximum Distance</Text>
                <Text style={styles.badgeText}>
                  {localFilters.distance === 9999 ? 'Anywhere' : `${localFilters.distance} km`}
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={50}
                step={5}
                value={localFilters.distance === 9999 ? 50 : localFilters.distance}
                onValueChange={(value) => updateFilter('distance', value)}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#007AFF"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>5 km</Text>
                <Text style={styles.sliderLabel}>50+ km</Text>
              </View>
            </View>

            {/* Salary Range */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Monthly Salary Range</Text>
                <Text style={styles.badgeText}>
                  ₱{localFilters.salary_min.toLocaleString()} - ₱{localFilters.salary_max.toLocaleString()}
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50000}
                step={1000}
                value={localFilters.salary_min}
                onValueChange={(value) => updateFilter('salary_min', value)}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#007AFF"
              />
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50000}
                step={1000}
                value={localFilters.salary_max}
                onValueChange={(value) => updateFilter('salary_max', value)}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#007AFF"
              />
            </View>

            {/* Employment Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employment Type</Text>
              <View style={styles.optionsRow}>
                {['all', 'Live-in', 'Live-out'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      localFilters.employment_type === type && styles.optionButtonActive
                    ]}
                    onPress={() => updateFilter('employment_type', type)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      localFilters.employment_type === type && styles.optionButtonTextActive
                    ]}>{type === 'all' ? 'All Types' : type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Work Schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Work Schedule</Text>
              <View style={styles.optionsRow}>
                {['all', 'Full-time', 'Part-time'].map(schedule => (
                  <TouchableOpacity
                    key={schedule}
                    style={[
                      styles.optionButton,
                      localFilters.work_schedule === schedule && styles.optionButtonActive
                    ]}
                    onPress={() => updateFilter('work_schedule', schedule)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      localFilters.work_schedule === schedule && styles.optionButtonTextActive
                    ]}>{schedule === 'all' ? 'All Schedules' : schedule}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Benefits Required */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Must Include Benefits</Text>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#4B5563" />
                  <Text style={styles.switchLabel}>SSS Contribution</Text>
                </View>
                <Switch
                  value={localFilters.requires_sss || false}
                  onValueChange={(value) => updateFilter('requires_sss', value)}
                  trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Ionicons name="medkit-outline" size={20} color="#4B5563" />
                  <Text style={styles.switchLabel}>PhilHealth</Text>
                </View>
                <Switch
                  value={localFilters.requires_philhealth || false}
                  onValueChange={(value) => updateFilter('requires_philhealth', value)}
                  trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Ionicons name="home-outline" size={20} color="#4B5563" />
                  <Text style={styles.switchLabel}>Pag-IBIG</Text>
                </View>
                <Switch
                  value={localFilters.requires_pagibig || false}
                  onValueChange={(value) => updateFilter('requires_pagibig', value)}
                  trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 600,
    overflow: 'hidden',
  },
  responsiveModal: {
    width: Platform.OS === 'web' ? '85%' : '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  content: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  categoryChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  optionButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  optionButtonTextActive: {
    color: '#007AFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    backgroundColor: '#fff',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
