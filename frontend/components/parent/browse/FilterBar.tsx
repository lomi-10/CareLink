// components/parent/browse/FilterBar.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  BG, BROWN, CARAMEL, DARK, MUTED, DIVIDER, ICON_BG, SURFACE,
} from '@/components/parent/home/parentWarmTheme';
import type { BrowseFilters } from '@/hooks/parent';
import type { Category } from '@/hooks/shared';

interface FilterBarProps {
  filters: BrowseFilters;
  onFilterChange: (key: keyof BrowseFilters, value: any) => void;
  onReset: () => void;
  categories: Category[];
  activeFilterCount: number;
  onOpenAdvanced?: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset, categories, activeFilterCount, onOpenAdvanced }: FilterBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const options = [
    { id: 'all', name: 'All Categories' },
    ...categories.map((c) => ({ id: c.category_id.toString(), name: c.name })),
  ];
  const selected = options.find((o) => o.id === filters.category) ?? options[0];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Category dropdown */}
        <TouchableOpacity style={styles.dropdown} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
          <Ionicons name="grid-outline" size={16} color={MUTED} />
          <Text style={styles.dropdownText} numberOfLines={1}>{selected.name}</Text>
          <Ionicons name="chevron-down" size={15} color={MUTED} />
        </TouchableOpacity>

        {/* Advanced filters */}
        {onOpenAdvanced && (
          <TouchableOpacity style={styles.filterBtn} onPress={onOpenAdvanced} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={18} color={BROWN} />
            <Text style={styles.filterBtnText}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {activeFilterCount > 0 && (
          <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.7}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category picker modal */}
      <Modal visible={pickerOpen} animationType="fade" transparent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter by category</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.id === filters.category;
                return (
                  <TouchableOpacity
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => { onFilterChange('category', item.id); setPickerOpen(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>{item.name}</Text>
                    {active && <Ionicons name="checkmark" size={17} color={BROWN} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: SURFACE,
  },
  dropdownText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    color: DARK,
    flex: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: CARAMEL,
    backgroundColor: SURFACE,
  },
  filterBtnText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 14,
    color: BROWN,
  },
  badge: {
    backgroundColor: CARAMEL,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 11,
    color: '#fff',
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DIVIDER,
    backgroundColor: SURFACE,
  },
  resetBtnText: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 13,
    color: MUTED,
  },

  // Picker
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(59,42,24,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: SURFACE,
    borderRadius: 18,
    padding: 12,
  },
  sheetTitle: {
    fontFamily: FontFamily.fredokaSemiBold,
    fontSize: 15,
    color: DARK,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 10,
  },
  optionActive: {
    backgroundColor: ICON_BG,
  },
  optionText: {
    fontFamily: FontFamily.fredokaRegular,
    fontSize: 14.5,
    color: DARK,
  },
  optionTextActive: {
    fontFamily: FontFamily.fredokaSemiBold,
    color: BROWN,
  },
});
