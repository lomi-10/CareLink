// components/helper/jobs/FilterBar.tsx
// Filter bar — category chips + sort/filters row.
// Pass `helperTheme` from the helper browse screen to get the warm brown palette.
// Omitting `helperTheme` keeps the original iOS-blue style (parent browse).

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import type { JobFilters } from '@/hooks/helper';
import type { Category } from '@/hooks/shared';

// ─── Theme shape ──────────────────────────────────────────────────────────────

export interface FilterBarTheme {
  containerBg:       string;
  dividerColor:      string;
  pillBg:            string;
  pillBorderColor:   string;
  pillText:          string;
  pillSelectedBg:    string;
  pillSelectedText:  string;
  accent:            string;   // sort value, filter button, badge bg
  muted:             string;   // "Sort:" label, reset text
  badgeBg:           string;   // active-filter count badge
  badgeText:         string;
  fontFamily:        string;
}

// Default = original iOS blue (used by parent browse)
const DEFAULT_THEME: FilterBarTheme = {
  containerBg:      '#FFFFFF',
  dividerColor:     '#F0F0F0',
  pillBg:           '#FFFFFF',
  pillBorderColor:  '#E5E5EA',
  pillText:         '#666666',
  pillSelectedBg:   '#007AFF',
  pillSelectedText: '#FFFFFF',
  accent:           '#007AFF',
  muted:            '#666666',
  badgeBg:          '#FF3B30',
  badgeText:        '#FFFFFF',
  fontFamily:       'System',
};

// Helper portal warm palette
export const HELPER_FILTER_THEME: FilterBarTheme = {
  containerBg:      '#FFFBF5',
  dividerColor:     '#EDE0D0',
  pillBg:           '#FFFBF5',
  pillBorderColor:  '#D4B896',
  pillText:         '#7A5C3E',
  pillSelectedBg:   '#2A1608',
  pillSelectedText: '#FFFFFF',
  accent:           '#E86019',
  muted:            '#7A5C3E',
  badgeBg:          '#E86019',
  badgeText:        '#FFFFFF',
  fontFamily:       FontFamily.fredokaSemiBold,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: JobFilters;
  onFilterChange: (key: keyof JobFilters, value: any) => void;
  onReset: () => void;
  categories: Category[];
  activeFilterCount: number;
  onOpenAdvanced?: () => void;
  helperTheme?: boolean;   // true → warm brown/orange palette
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterBar({
  filters,
  onFilterChange,
  onReset,
  categories,
  activeFilterCount,
  onOpenAdvanced,
  helperTheme = false,
}: FilterBarProps) {
  const t = helperTheme ? HELPER_FILTER_THEME : DEFAULT_THEME;

  const sortLabels: Record<string, string> = {
    recommended:    'Recommended',
    nearest:        'Nearest',
    highest_salary: 'Highest Salary',
    newest:         'Newest',
  };
  const sorts = Object.keys(sortLabels);

  return (
    <View style={[styles.container, { backgroundColor: t.containerBg, borderBottomColor: t.dividerColor }]}>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "All" chip */}
        {(['all'] as const).map(() => {
          const selected = filters.category === 'all';
          return (
            <TouchableOpacity
              key="all"
              style={[
                styles.pill,
                { backgroundColor: selected ? t.pillSelectedBg : t.pillBg, borderColor: selected ? t.pillSelectedBg : t.pillBorderColor },
              ]}
              onPress={() => onFilterChange('category', 'all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: selected ? t.pillSelectedText : t.pillText, fontFamily: t.fontFamily }]}>
                All
              </Text>
            </TouchableOpacity>
          );
        })}

        {categories.map((cat) => {
          const selected = filters.category === cat.category_id.toString();
          return (
            <TouchableOpacity
              key={cat.category_id}
              style={[
                styles.pill,
                { backgroundColor: selected ? t.pillSelectedBg : t.pillBg, borderColor: selected ? t.pillSelectedBg : t.pillBorderColor },
              ]}
              onPress={() => onFilterChange('category', cat.category_id.toString())}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: selected ? t.pillSelectedText : t.pillText, fontFamily: t.fontFamily }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Sort + Filters row ── */}
      <View style={styles.actionsRow}>
        {/* Sort */}
        <View style={styles.sortContainer}>
          <Ionicons name="swap-vertical-outline" size={15} color={t.muted} />
          <Text style={[styles.sortLabel, { color: t.muted, fontFamily: helperTheme ? FontFamily.fredokaRegular : 'System' }]}>
            Sort:
          </Text>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => {
              const idx  = sorts.indexOf(filters.sort);
              onFilterChange('sort', sorts[(idx + 1) % sorts.length]);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortValue, { color: t.accent, fontFamily: t.fontFamily }]}>
              {sortLabels[filters.sort] ?? 'Recommended'}
            </Text>
            <Ionicons name="chevron-down" size={15} color={t.accent} />
          </TouchableOpacity>
        </View>

        {/* Filters button */}
        {onOpenAdvanced && (
          <TouchableOpacity
            style={[styles.filtersBtn, { borderColor: t.accent }]}
            onPress={onOpenAdvanced}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={16} color={t.accent} />
            <Text style={[styles.filtersBtnText, { color: t.accent, fontFamily: t.fontFamily }]}>
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <View style={[styles.badge, { backgroundColor: t.badgeBg }]}>
                <Text style={[styles.badgeText, { color: t.badgeText }]}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Reset */}
        {activeFilterCount > 0 && (
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: t.pillBorderColor }]}
            onPress={onReset}
            activeOpacity={0.7}
          >
            <Text style={[styles.resetText, { color: t.muted, fontFamily: helperTheme ? FontFamily.fredokaRegular : 'System' }]}>
              Reset
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Base styles (layout only — colors applied inline) ────────────────────────

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  sortLabel: {
    fontSize: 13,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  sortValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  filtersBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
