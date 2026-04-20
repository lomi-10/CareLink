// components/parent/browse/FilterModal.tsx
// Advanced filter modal for helper browsing

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BrowseFilters } from '@/hooks/parent';
import type { Category } from '@/hooks/shared';

interface FilterModalProps {
  visible: boolean;
  filters: BrowseFilters;
  categories: Category[];
  onApply: (filters: BrowseFilters) => void;
  onReset: () => void;
  onClose: () => void;
}

export function FilterModal({
  visible,
  filters,
  categories,
  onApply,
  onReset,
  onClose,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<BrowseFilters>(filters);

  const updateLocalFilter = (key: keyof BrowseFilters, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const FilterChip = ({ 
    label, 
    selected, 
    onPress 
  }: { 
    label: string; 
    selected: boolean; 
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
            <Text style={styles.headerTitle}>Filter Helpers</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Category Filter */}
            <FilterSection title="Category">
              <View style={styles.chipContainer}>
                <FilterChip
                  label="All Categories"
                  selected={localFilters.category === 'all'}
                  onPress={() => updateLocalFilter('category', 'all')}
                />
                {categories.map((cat) => (
                  <FilterChip
                    key={cat.category_id}
                    label={cat.name}
                    selected={localFilters.category === cat.category_id.toString()}
                    onPress={() => updateLocalFilter('category', cat.category_id.toString())}
                  />
                ))}
              </View>
            </FilterSection>

            {/* Distance Filter */}
            <FilterSection title="Distance">
              <View style={styles.chipContainer}>
                {[
                  { label: '5 km', value: 5 },
                  { label: '10 km', value: 10 },
                  { label: '20 km', value: 20 },
                  { label: '50 km', value: 50 },
                  { label: 'Any distance', value: 9999 },
                ].map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={localFilters.distance === option.value}
                    onPress={() => updateLocalFilter('distance', option.value)}
                  />
                ))}
              </View>
            </FilterSection>

            {/* Verification Filter */}
            <FilterSection title="Verification Status">
              <View style={styles.chipContainer}>
                <FilterChip
                  label="All"
                  selected={localFilters.verification === 'all'}
                  onPress={() => updateLocalFilter('verification', 'all')}
                />
                <FilterChip
                  label="Verified Only"
                  selected={localFilters.verification === 'Verified'}
                  onPress={() => updateLocalFilter('verification', 'Verified')}
                />
                <FilterChip
                  label="Pending"
                  selected={localFilters.verification === 'Pending'}
                  onPress={() => updateLocalFilter('verification', 'Pending')}
                />
              </View>
            </FilterSection>

            {/* Availability Filter */}
            <FilterSection title="Availability">
              <View style={styles.chipContainer}>
                <FilterChip
                  label="All"
                  selected={localFilters.availability === 'all'}
                  onPress={() => updateLocalFilter('availability', 'all')}
                />
                <FilterChip
                  label="Available Now"
                  selected={localFilters.availability === 'Available'}
                  onPress={() => updateLocalFilter('availability', 'Available')}
                />
                <FilterChip
                  label="Not Available"
                  selected={localFilters.availability === 'Not Available'}
                  onPress={() => updateLocalFilter('availability', 'Not Available')}
                />
              </View>
            </FilterSection>

            {/* Experience Filter */}
            <FilterSection title="Experience">
              <View style={styles.chipContainer}>
                <FilterChip
                  label="Any experience"
                  selected={localFilters.experience === 'all'}
                  onPress={() => updateLocalFilter('experience', 'all')}
                />
                <FilterChip
                  label="0-1 years"
                  selected={localFilters.experience === '0-1'}
                  onPress={() => updateLocalFilter('experience', '0-1')}
                />
                <FilterChip
                  label="1-3 years"
                  selected={localFilters.experience === '1-3'}
                  onPress={() => updateLocalFilter('experience', '1-3')}
                />
                <FilterChip
                  label="3-5 years"
                  selected={localFilters.experience === '3-5'}
                  onPress={() => updateLocalFilter('experience', '3-5')}
                />
                <FilterChip
                  label="5+ years"
                  selected={localFilters.experience === '5+'}
                  onPress={() => updateLocalFilter('experience', '5+')}
                />
              </View>
            </FilterSection>

            {/* Gender Filter */}
            <FilterSection title="Gender">
              <View style={styles.chipContainer}>
                <FilterChip
                  label="All"
                  selected={localFilters.gender === 'all'}
                  onPress={() => updateLocalFilter('gender', 'all')}
                />
                <FilterChip
                  label="Female"
                  selected={localFilters.gender === 'Female'}
                  onPress={() => updateLocalFilter('gender', 'Female')}
                />
                <FilterChip
                  label="Male"
                  selected={localFilters.gender === 'Male'}
                  onPress={() => updateLocalFilter('gender', 'Male')}
                />
              </View>
            </FilterSection>

            {/* Sort Filter */}
            <FilterSection title="Sort By">
              <View style={styles.chipContainer}>
                <FilterChip
                  label="Nearest First"
                  selected={localFilters.sort === 'nearest'}
                  onPress={() => updateLocalFilter('sort', 'nearest')}
                />
                <FilterChip
                  label="Highest Rated"
                  selected={localFilters.sort === 'highest_rated'}
                  onPress={() => updateLocalFilter('sort', 'highest_rated')}
                />
                <FilterChip
                  label="Most Experienced"
                  selected={localFilters.sort === 'most_experienced'}
                  onPress={() => updateLocalFilter('sort', 'most_experienced')}
                />
                <FilterChip
                  label="Newest"
                  selected={localFilters.sort === 'newest'}
                  onPress={() => updateLocalFilter('sort', 'newest')}
                />
              </View>
            </FilterSection>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Actions */}
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
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: Platform.OS === 'web' ? 24 : 0,
    borderBottomRightRadius: Platform.OS === 'web' ? 24 : 0,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
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
