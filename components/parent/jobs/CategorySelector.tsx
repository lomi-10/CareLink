// components/parent/jobs/CategorySelector.tsx

import type { Category } from '@/hooks/shared';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Mapping database categories to specific icons
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Babysitter': 'happy-outline',
  'Cook': 'restaurant-outline',
  'General Househelp': 'home-outline',
  'Cleaner': 'sparkles-outline',
  'Laundry': 'shirt-outline',
  'Yaya': 'person-outline',
  'Gardener': 'leaf-outline',
  'Laundry Person': 'shirt-outline',
  'Others': 'ellipsis-horizontal-outline',
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

  // Assuming '6' is the "Others" ID from the database
  const OTHERS_CATEGORY_ID = '6'; 
  const isOthersSelected = isSelected(OTHERS_CATEGORY_ID);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Step 1: Select Work Category <Text style={styles.asterisk}>*</Text>
      </Text>
      
      <View style={styles.gridContainer}>
        {categories.map((category) => {
          const catId = category.category_id.toString();
          const selected = isSelected(catId);
          const iconName = CATEGORY_ICONS[category.name] || 'briefcase-outline';

          return (
            <TouchableOpacity
              key={`category-${catId}`}
              style={[
                styles.categoryCard,
                selected && styles.categoryCardActive,
                disabled && styles.categoryCardDisabled,
              ]}
              onPress={() => handleCategoryPress(catId)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              {selected && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
              <View style={[styles.iconContainer, selected && styles.iconContainerActive]}>
                <Ionicons name={iconName} size={24} color={selected ? "#2563EB" : "#666"} />
              </View>
              <Text style={[styles.categoryName, selected && styles.categoryNameActive]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* If OTHERS is selected, force a custom category name */}
      {isOthersSelected && (
        <View style={styles.customInputWrapper}>
          <Text style={styles.inputLabel}>
            Custom Category Name <Text style={styles.asterisk}>*</Text>
          </Text>
          <TextInput
            style={[styles.textInput, disabled && styles.inputDisabled]}
            placeholder="e.g., Pet Care, Private Tutor..."
            value={customCategory}
            onChangeText={onCustomCategoryChange}
            placeholderTextColor="#999"
            editable={!disabled}
          />
          <Text style={styles.helperText}>
            Since you selected "Others", please specify the category.
          </Text>
        </View>
      )}

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
    width: '47%', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryCardActive: {
    borderColor: '#2563EB',
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
    color: '#4B5563',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
  },
});