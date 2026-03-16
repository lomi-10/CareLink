// components/parent/browse/FilterBar.tsx
// Filter bar for browsing helpers

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BrowseFilters } from '@/hooks/useBrowseHelpers';

interface FilterBarProps {
  filters: BrowseFilters;
  onFilterChange: (key: keyof BrowseFilters, value: any) => void;
  onReset: () => void;
  categories: Array<{ category_id: string; name: string }>;
  activeFilterCount: number;
}

export function FilterBar({
  filters,
  onFilterChange,
  onReset,
  categories,
  activeFilterCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const distanceOptions = [
    { value: 5, label: '5 km' },
    { value: 10, label: '10 km' },
    { value: 20, label: '20 km' },
    { value: 50, label: '50 km' },
    { value: 9999, label: 'Any distance' },
  ];

  const sortOptions = [
    { value: 'nearest', label: 'Nearest First' },
    { value: 'highest_rated', label: 'Highest Rated' },
    { value: 'most_experienced', label: 'Most Experienced' },
    { value: 'newest', label: 'Newest' },
  ];

  return (
    <View style={styles.container}>
      {/* Quick Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryPill,
            filters.category === 'all' && styles.categoryPillActive,
          ]}
          onPress={() => onFilterChange('category', 'all')}
        >
          <Text
            style={[
              styles.categoryPillText,
              filters.category === 'all' && styles.categoryPillTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.category_id}
            style={[
              styles.categoryPill,
              filters.category === cat.category_id && styles.categoryPillActive,
            ]}
            onPress={() => onFilterChange('category', cat.category_id)}
          >
            <Text
              style={[
                styles.categoryPillText,
                filters.category === cat.category_id && styles.categoryPillTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter & Sort Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={18} color="#007AFF" />
          <Text style={styles.filterButtonText}>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
        </TouchableOpacity>

        <View style={styles.sortDropdown}>
          <Ionicons name="swap-vertical" size={16} color="#666" />
          <Text style={styles.sortText}>
            {sortOptions.find((s) => s.value === filters.sort)?.label}
          </Text>
        </View>
      </View>

      {/* Full Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Distance */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Distance</Text>
              <View style={styles.optionsGrid}>
                {distanceOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionButton,
                      filters.distance === opt.value && styles.optionButtonActive,
                    ]}
                    onPress={() => onFilterChange('distance', opt.value)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        filters.distance === opt.value && styles.optionButtonTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Availability */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Availability</Text>
              <View style={styles.optionsGrid}>
                {['all', 'Available', 'Not Available'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionButton,
                      filters.availability === opt && styles.optionButtonActive,
                    ]}
                    onPress={() => onFilterChange('availability', opt)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        filters.availability === opt && styles.optionButtonTextActive,
                      ]}
                    >
                      {opt === 'all' ? 'Any' : opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Verification */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Verification Status</Text>
              <View style={styles.optionsGrid}>
                {['all', 'Verified', 'Pending'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionButton,
                      filters.verification === opt && styles.optionButtonActive,
                    ]}
                    onPress={() => onFilterChange('verification', opt)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        filters.verification === opt && styles.optionButtonTextActive,
                      ]}
                    >
                      {opt === 'all' ? 'Any' : opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Experience */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Years of Experience</Text>
              <View style={styles.optionsGrid}>
                {['all', '0-1', '1-3', '3-5', '5+'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionButton,
                      filters.experience === opt && styles.optionButtonActive,
                    ]}
                    onPress={() => onFilterChange('experience', opt)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        filters.experience === opt && styles.optionButtonTextActive,
                      ]}
                    >
                      {opt === 'all' ? 'Any' : opt + ' yrs'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Gender */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Gender</Text>
              <View style={styles.optionsGrid}>
                {['all', 'Female', 'Male'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionButton,
                      filters.gender === opt && styles.optionButtonActive,
                    ]}
                    onPress={() => onFilterChange('gender', opt)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        filters.gender === opt && styles.optionButtonTextActive,
                      ]}
                    >
                      {opt === 'all' ? 'Any' : opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              {sortOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.sortOption,
                    filters.sort === opt.value && styles.sortOptionActive,
                  ]}
                  onPress={() => onFilterChange('sort', opt.value)}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      filters.sort === opt.value && styles.sortOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {filters.sort === opt.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetButton} onPress={onReset}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  pillsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  categoryPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  sortDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortText: {
    fontSize: 13,
    color: '#666',
  },
  modal: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
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
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sortOptionActive: {
    backgroundColor: '#F0F8FF',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#1A1C1E',
  },
  sortOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
