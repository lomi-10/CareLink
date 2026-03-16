// components/parent/jobs/CategorySelector.tsx
// UPDATED - Component with multi-select and disabled state support

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Category } from '@/hooks/useJobReferences';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[]; // <-- CHANGED to array
  customCategory: string;
  onToggleCategory: (categoryId: string) => void; // <-- CHANGED to toggle
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
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCategoryPress = (categoryId: string) => {
    if (disabled) return;

    if (categoryId === 'custom') {
      setShowCustomInput(!showCustomInput);
    } else {
      onToggleCategory(categoryId);
    }
  };

  // Helper function to check if a category is selected
  const isSelected = (categoryId: string) => {
    return selectedCategoryIds.includes(categoryId);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Job Category * ({selectedCategoryIds.length} selected)
      </Text>
      <Text style={styles.hint}>
        {disabled
          ? 'Category selection (verification required)'
          : 'Select one or more categories or create your own'}
      </Text>

      <View style={styles.grid}>
        {categories.map((category) => {
          const active = isSelected(category.category_id);
          return (
            <TouchableOpacity
              key={category.category_id}
              style={[
                styles.categoryCard,
                active && styles.categoryCardActive,
                disabled && styles.categoryCardDisabled,
              ]}
              onPress={() => handleCategoryPress(category.category_id)}
              activeOpacity={disabled ? 1 : 0.7}
              disabled={disabled}
            >
              <View
                style={[
                  styles.iconContainer,
                  active && styles.iconContainerActive,
                  disabled && styles.iconContainerDisabled,
                ]}
              >
                <Ionicons
                  name={category.icon as any}
                  size={24}
                  color={
                    disabled
                      ? '#ccc'
                      : active
                      ? '#007AFF'
                      : '#666'
                  }
                />
              </View>
              <Text
                style={[
                  styles.categoryName,
                  active && styles.categoryNameActive,
                  disabled && styles.categoryNameDisabled,
                ]}
              >
                {category.name}
              </Text>
              {active && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Custom Category Option */}
        <TouchableOpacity
          style={[
            styles.categoryCard,
            showCustomInput && styles.categoryCardActive,
            disabled && styles.categoryCardDisabled,
          ]}
          onPress={() => handleCategoryPress('custom')}
          activeOpacity={disabled ? 1 : 0.7}
          disabled={disabled}
        >
          <View
            style={[
              styles.iconContainer,
              showCustomInput && styles.iconContainerActive,
              disabled && styles.iconContainerDisabled,
            ]}
          >
            <Ionicons
              name="add-circle"
              size={24}
              color={disabled ? '#ccc' : showCustomInput ? '#007AFF' : '#666'}
            />
          </View>
          <Text
            style={[
              styles.categoryName,
              showCustomInput && styles.categoryNameActive,
              disabled && styles.categoryNameDisabled,
            ]}
          >
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Category Input */}
      {showCustomInput && (
        <View style={styles.customInputContainer}>
          <TextInput
            style={[styles.customInput, disabled && styles.customInputDisabled]}
            placeholder="Enter custom category (e.g., Pet Caretaker)"
            value={customCategory}
            onChangeText={onCustomCategoryChange}
            placeholderTextColor="#999"
            editable={!disabled}
          />
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    position: 'relative', // Added for checkmark positioning
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconContainerActive: {
    backgroundColor: '#E3F2FD',
  },
  iconContainerDisabled: {
    backgroundColor: '#F0F0F0',
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
  categoryNameDisabled: {
    color: '#999',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  customInputContainer: {
    marginTop: 12,
  },
  customInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
  },
  customInputDisabled: {
    backgroundColor: '#F8F9FA',
    color: '#999',
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
  },
});