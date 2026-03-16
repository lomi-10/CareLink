// app/(parent)/browse_helpers.tsx
// Browse Helpers Screen - 2-column mobile grid with compact cards

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Custom Hooks
import { useBrowseHelpers } from '@/hooks/useBrowseHelpers';
import { useJobReferences } from '@/hooks/useJobReferences';
import { useResponsive } from '@/hooks/useResponsive';

// Components
import { 
  FilterBar, 
  HelperCard, 
  CompactHelperCard 
} from '@/components/parent/browse/';

import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function BrowseHelpers() {
  const router = useRouter();
  const { isDesktop } = useResponsive();

  const {
    helpers,
    filters,
    loading,
    updateFilter,
    resetFilters,
    refresh,
    totalCount,
    filteredCount,
  } = useBrowseHelpers();

  const { categories } = useJobReferences();

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => {
      if (key === 'category') return value !== 'all';
      if (key === 'distance') return value !== 20; // default
      if (key === 'sort') return false; // don't count sort
      return value !== 'all';
    }
  ).length;

  const handleViewProfile = (helper: any) => {
    router.push({
      pathname: '/(parent)/helper_profile',
      params: { helper_id: helper.user_id },
    }); 
  };

  const handleInviteHelper = (helper: any) => {
    router.push({
      pathname: '/(parent)/invite_helper',
      params: { helper_id: helper.user_id, helper_name: helper.full_name },
    });
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading helpers..." />;
  }

  // Determine layout: Desktop = 3 cols, Mobile = 2 cols
  const numColumns = isDesktop ? 3 : 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Helpers</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilter}
        onReset={resetFilters}
        categories={categories}
        activeFilterCount={activeFilterCount}
      />

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredCount} {filteredCount === 1 ? 'helper' : 'helpers'} found
          {filteredCount !== totalCount && ` (filtered from ${totalCount})`}
        </Text>
      </View>

      {/* Helpers Grid */}
      {helpers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No helpers found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or check back later
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={helpers}
          keyExtractor={(item) => item.profile_id}
          renderItem={({ item }) =>
            isDesktop ? (
              // Desktop: Full cards with invite button
              <View style={styles.desktopCardWrapper}>
                <HelperCard
                  helper={item}
                  onPress={() => handleViewProfile(item)}
                  onInvite={() => handleInviteHelper(item)}
                />
              </View>
            ) : (
              // Mobile: Compact cards, tap to view profile
              <View style={styles.mobileCardWrapper}>
                <CompactHelperCard
                  helper={item}
                  onPress={() => handleViewProfile(item)}
                />
              </View>
            )
          }
          contentContainerStyle={styles.listContainer}
          numColumns={numColumns}
          key={numColumns} // Force re-render when columns change
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  mobileCardWrapper: {
    flex: 1,
    maxWidth: '50%',
    paddingHorizontal: 4,
  },
  desktopCardWrapper: {
    flex: 1,
    maxWidth: '33.333%',
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  resetButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
