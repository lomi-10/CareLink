// components/helper/jobs/FilterBar.tsx
// Filter bar for job browsing

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { JobFilters } from '@/hooks/useBrowseJobs';
import { Category } from '@/hooks/useJobReferences';

interface FilterBarProps {
  filters: JobFilters;
  onFilterChange: (key: keyof JobFilters, value: any) => void;
  onReset: () => void;
  categories: Category[];
  activeFilterCount: number;
  onOpenAdvanced?: () => void;
}

export default function FilterBar({
  filters,
  onFilterChange,
  onReset,
  categories,
  activeFilterCount,
  onOpenAdvanced,
}: FilterBarProps) {
  const CategoryPill = ({ 
    id, 
    name, 
    selected 
  }: { 
    id: string; 
    name: string; 
    selected: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={() => onFilterChange('category', id)}
      activeOpacity={0.7}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
        {name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Category Pills (Quick Filter) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <CategoryPill
          id="all"
          name="All"
          selected={filters.category === 'all'}
        />
        {categories.map((cat) => (
          <CategoryPill
            key={cat.category_id}
            id={cat.category_id.toString()}
            name={cat.name}
            selected={filters.category === cat.category_id.toString()}
          />
        ))}
      </ScrollView>

      {/* Advanced Filters & Sort Row */}
      <View style={styles.actionsRow}>
        {onOpenAdvanced && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={onOpenAdvanced}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={20} color="#007AFF" />
            <Text style={styles.filterButtonText}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Sort Button */}
        <View style={styles.sortContainer}>
          <Ionicons name="swap-vertical-outline" size={16} color="#666" />
          <Text style={styles.sortLabel}>Sort:</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              const sorts = ['recommended', 'nearest', 'highest_salary', 'newest'];
              const currentIndex = sorts.indexOf(filters.sort);
              const nextIndex = (currentIndex + 1) % sorts.length;
              onFilterChange('sort', sorts[nextIndex]);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.sortValue}>
              {filters.sort === 'recommended' && 'Recommended'}
              {filters.sort === 'nearest' && 'Nearest'}
              {filters.sort === 'highest_salary' && 'Highest Salary'}
              {filters.sort === 'newest' && 'Newest'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={onReset}
            activeOpacity={0.7}
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  pillSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pillTextSelected: {
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  filterBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sortLabel: {
    fontSize: 13,
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sortValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
