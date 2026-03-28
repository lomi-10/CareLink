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
import { JobFilters } from '@/hooks/useBrowseJobs';
import { Category } from '@/hooks/useJobReferences';

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
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Advanced Search</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
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
                  ]}>All</Text>
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
              <Text style={styles.sectionTitle}>Distance</Text>
              <Text style={styles.sliderValue}>
                {localFilters.distance === 9999 ? 'Any distance' : `Within ${localFilters.distance} km`}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={50}
                step={5}
                value={localFilters.distance === 9999 ? 50 : localFilters.distance}
                onValueChange={(value) => updateFilter('distance', value)}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#E5E5EA"
                thumbTintColor="#007AFF"
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>5 km</Text>
                <Text style={styles.sliderLabel}>50 km</Text>
              </View>
            </View>

            {/* Salary Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Salary Range (Monthly)</Text>
              <Text style={styles.sliderValue}>
                ₱{localFilters.salary_min.toLocaleString()} - ₱{localFilters.salary_max.toLocaleString()}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={50000}
                step={1000}
                value={localFilters.salary_min}
                onValueChange={(value) => updateFilter('salary_min', value)}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#E5E5EA"
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
                maximumTrackTintColor="#E5E5EA"
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
                    ]}>{type === 'all' ? 'All' : type}</Text>
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
                    ]}>{schedule === 'all' ? 'All' : schedule}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Benefits Required */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benefits Required</Text>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>SSS</Text>
                <Switch
                  value={localFilters.requires_sss || false}
                  onValueChange={(value) => updateFilter('requires_sss', value)}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>PhilHealth</Text>
                <Switch
                  value={localFilters.requires_philhealth || false}
                  onValueChange={(value) => updateFilter('requires_philhealth', value)}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Pag-IBIG</Text>
                <Switch
                  value={localFilters.requires_pagibig || false}
                  onValueChange={(value) => updateFilter('requires_pagibig', value)}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Meals Provided</Text>
                <Switch
                  value={localFilters.requires_meals || false}
                  onValueChange={(value) => updateFilter('requires_meals', value)}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Accommodation Provided</Text>
                <Switch
                  value={localFilters.requires_accommodation || false}
                  onValueChange={(value) => updateFilter('requires_accommodation', value)}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>
            </View>

            {/* Verification Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employer Verification</Text>
              <View style={styles.switchRow}>
                <View style={styles.switchLabelContainer}>
                  <Text style={styles.switchLabel}>PESO Verified Employers Only</Text>
                  <Text style={styles.switchSubtext}>Show only jobs from verified parents</Text>
                </View>
                <Switch
                  value={localFilters.verified_only || false}
                  onValueChange={(value) => updateFilter('verified_only', value)}
                  trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                  thumbColor={'#fff'}
                />
              </View>
            </View>

            {/* Posted Within */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Posted Within</Text>
              <View style={styles.optionsRow}>
                {[
                  { label: 'Any time', value: 'all' },
                  { label: '24 hours', value: '24h' },
                  { label: '7 days', value: '7d' },
                  { label: '30 days', value: '30d' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      localFilters.posted_within === option.value && styles.optionButtonActive
                    ]}
                    onPress={() => updateFilter('posted_within', option.value)}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      localFilters.posted_within === option.value && styles.optionButtonTextActive
                    ]}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  categoryChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#999',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 15,
    color: '#1A1C1E',
    fontWeight: '500',
  },
  switchSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
