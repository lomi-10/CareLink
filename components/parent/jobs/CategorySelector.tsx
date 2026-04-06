// components/parent/jobs/CategorySelector.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '@/hooks/useJobReferences';

// You can map your database categories to specific icons here!
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Babysitter': 'happy-outline',
  'Cook': 'restaurant-outline',
  'General Househelp': 'home-outline',
  'Cleaner': 'sparkles-outline',
  'Laundry': 'shirt-outline',
};

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[]; 
  customCategory: string;
  onToggleCategory: (categoryId: string) => void; 
  onCustomCategoryChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function CategorySelector({
  categories,
  selectedCategoryIds,
  customCategory,
  onToggleCategory,
  onCustomCategoryChange,
  error,
  disabled = false,
}: CategorySelectorProps) {

  const handleCategoryPress = (categoryId: string) => {
    if (disabled) return;
    onToggleCategory(categoryId);
  };

  const isSelected = (categoryId: string) => {
    return selectedCategoryIds.includes(categoryId);
  };

  // We filter out the database's "Others" category because we will render a special "Custom" card for it
  const visibleCategories = categories.filter(c => c.name.toLowerCase() !== 'others');
  
  // Assuming '6' is your "Others" ID from the database. Change this if yours is different!
  const OTHERS_CATEGORY_ID = '6'; 
  const isCustomSelected = isSelected(OTHERS_CATEGORY_ID);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Select Category <Text style={styles.asterisk}>*</Text>
      </Text>
      
      <View style={styles.gridContainer}>
        {/* Render Official Categories */}
        {visibleCategories.map((category) => {
          const selected = isSelected(category.category_id.toString());
          const iconName = CATEGORY_ICONS[category.name] || 'briefcase-outline';

          return (
            <TouchableOpacity
              key={`category-${category.category_id}`}
              style={[
                styles.categoryCard,
                selected && styles.categoryCardActive,
                disabled && styles.categoryCardDisabled,
              ]}
              onPress={() => handleCategoryPress(category.category_id.toString())}
              disabled={disabled}
              activeOpacity={0.7}
            >
              {selected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <View style={[styles.iconContainer, selected && styles.iconContainerActive]}>
                <Ionicons name={iconName} size={24} color={selected ? "#007AFF" : "#666"} />
              </View>
              <Text style={[styles.categoryName, selected && styles.categoryNameActive]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Render The Special "Custom" Card */}
        <TouchableOpacity
          style={[
            styles.categoryCard,
            isCustomSelected && styles.categoryCardActive,
            disabled && styles.categoryCardDisabled,
          ]}
          onPress={() => handleCategoryPress(OTHERS_CATEGORY_ID)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          {isCustomSelected && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          )}
          <View style={[styles.iconContainer, isCustomSelected && styles.iconContainerActive]}>
            <Ionicons name="create-outline" size={24} color={isCustomSelected ? "#007AFF" : "#666"} />
          </View>
          <Text style={[styles.categoryName, isCustomSelected && styles.categoryNameActive]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  asterisk: {
    color: '#FF3B30',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '47%', // Fits 2 side-by-side perfectly
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    position: 'relative',
  },
  categoryCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoryCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#F8F9FA',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconContainerActive: {
    backgroundColor: '#E3F2FD',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#007AFF',
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 2,
    zIndex: 1,
  },
  customInputWrapper: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
  },
});