// components/helper/jobs/SearchBar.tsx
// Search bar with suggestions and recent searches.
// Pass `helperTheme` from the helper browse screen to get the warm brown palette.

import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  suggestions: string[];
  recentSearches: string[];
  onSelectSuggestion: (suggestion: string) => void;
  onClearRecent: () => void;
  placeholder?: string;
  helperTheme?: boolean;   // true → warm brown/orange palette
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  suggestions,
  recentSearches,
  onSelectSuggestion,
  onClearRecent,
  placeholder = 'Search jobs, skills, or locations...',
  helperTheme = false,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const showSuggestions = isFocused && (suggestions.length > 0 || recentSearches.length > 0);

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleSelect = (text: string) => {
    onSelectSuggestion(text);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  // ── Palette ──
  const c = helperTheme ? {
    inputBg:          '#F5E6CC',
    inputBgFocused:   '#FFFFFF',
    inputBorder:      '#D4B896',
    inputBorderFocus: '#E86019',
    inputText:        '#2A1608',
    placeholder:      '#B0A090',
    iconColor:        '#7A5C3E',
    clearColor:       '#B0A090',
    dropdownBg:       '#FFFFFF',
    dropdownBorder:   '#EDE0D0',
    headerText:       '#7A5C3E',
    clearText:        '#E86019',
    itemText:         '#2A1608',
    itemBorder:       '#F5E6CC',
    shadowColor:      '#8B5E3C',
  } : {
    inputBg:          '#F5F5F5',
    inputBgFocused:   '#FFFFFF',
    inputBorder:      'transparent',
    inputBorderFocus: '#007AFF',
    inputText:        '#1A1C1E',
    placeholder:      '#999999',
    iconColor:        '#666666',
    clearColor:       '#999999',
    dropdownBg:       '#FFFFFF',
    dropdownBorder:   '#F0F0F0',
    headerText:       '#666666',
    clearText:        '#007AFF',
    itemText:         '#1A1C1E',
    itemBorder:       '#F5F5F5',
    shadowColor:      '#000000',
  };

  const fontRegular  = helperTheme ? FontFamily.fredokaRegular  : 'System';
  const fontSemiBold = helperTheme ? FontFamily.fredokaSemiBold : 'System';

  return (
    <View style={styles.container}>
      {/* ── Input ── */}
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: isFocused ? c.inputBgFocused : c.inputBg,
            borderColor:     isFocused ? c.inputBorderFocus : c.inputBorder,
          },
          isFocused && Platform.select({
            ios:     { shadowColor: c.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
            android: { elevation: 4 },
          }),
        ]}
      >
        <Ionicons name="search" size={20} color={c.iconColor} style={styles.icon} />

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: c.inputText, fontFamily: fontRegular }]}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={c.clearColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Suggestions dropdown ── */}
      {showSuggestions && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: c.dropdownBg },
            Platform.select({
              ios:     { shadowColor: c.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
              android: { elevation: 8 },
            }),
          ]}
        >
          {/* Recent searches */}
          {recentSearches.length > 0 && value.length === 0 && (
            <>
              <View style={[styles.dropdownHeader, { borderBottomColor: c.dropdownBorder }]}>
                <Text style={[styles.dropdownHeaderText, { color: c.headerText, fontFamily: fontSemiBold }]}>
                  Recent Searches
                </Text>
                <TouchableOpacity onPress={onClearRecent}>
                  <Text style={[styles.dropdownClear, { color: c.clearText, fontFamily: fontSemiBold }]}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((s, i) => (
                <TouchableOpacity
                  key={`recent-${i}`}
                  style={[styles.dropdownItem, { borderBottomColor: c.itemBorder }]}
                  onPress={() => handleSelect(s)}
                >
                  <Ionicons name="time-outline" size={18} color={c.iconColor} />
                  <Text style={[styles.itemText, { color: c.itemText, fontFamily: fontRegular }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Search suggestions */}
          {suggestions.length > 0 && value.length > 0 && (
            <>
              <View style={[styles.dropdownHeader, { borderBottomColor: c.dropdownBorder }]}>
                <Text style={[styles.dropdownHeaderText, { color: c.headerText, fontFamily: fontSemiBold }]}>
                  Suggestions
                </Text>
              </View>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={`sug-${i}`}
                  style={[styles.dropdownItem, { borderBottomColor: c.itemBorder }]}
                  onPress={() => handleSelect(s)}
                >
                  <Ionicons name="search" size={18} color={c.iconColor} />
                  <Text style={[styles.itemText, { color: c.itemText, fontFamily: fontRegular }]}>{s}</Text>
                  <Ionicons name="arrow-forward" size={16} color={c.clearColor} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Layout styles (colors applied inline) ────────────────────────────────────

const styles = StyleSheet.create({
  container: { zIndex: 100 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1.5,
  },
  icon:     { marginRight: 8 },
  input:    { flex: 1, fontSize: 15, paddingVertical: 0 },
  clearBtn: { padding: 4, marginLeft: 8 },

  dropdown: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    borderRadius: 12,
    maxHeight: 300,
    overflow: 'hidden',
    zIndex: 200,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownHeaderText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 },
  dropdownClear:      { fontSize: 13 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemText: { flex: 1, fontSize: 15 },
});
