// components/parent/jobs/AgeRangeSelector.tsx
// Age range selector with dual sliders

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

const MIN_AGE_BOUND = 18;
const MAX_AGE_BOUND = 65;

interface AgeRangeSelectorProps {
  minAge: number;
  maxAge: number;
  onMinAgeChange: (value: number) => void;
  onMaxAgeChange: (value: number) => void;
  disabled?: boolean;
}

export function AgeRangeSelector({
  minAge,
  maxAge,
  onMinAgeChange,
  onMaxAgeChange,
  disabled = false,
}: AgeRangeSelectorProps) {

  const handleMinChange = (value: number) => {
    const rounded = Math.round(value);
    // Ensure min doesn't exceed max
    if (rounded > maxAge) {
      onMaxAgeChange(rounded);
    }
    onMinAgeChange(rounded);
  };

  const handleMaxChange = (value: number) => {
    const rounded = Math.round(value);
    // Ensure max doesn't go below min
    if (rounded < minAge) {
      onMinAgeChange(rounded);
    }
    onMaxAgeChange(rounded);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Preferred Age (Optional)</Text>
      <Text style={styles.hint}>
        Select the age range you prefer for your helper
      </Text>

      {/* Age Range Display */}
      <View style={styles.rangeDisplay}>
        <Text style={styles.rangeText}>{minAge} - {maxAge} years old</Text>
      </View>

      {/* Minimum Age Slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Minimum Age: {minAge}</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderEndpoint}>{MIN_AGE_BOUND} yrs</Text>
          <Slider
            style={styles.slider}
            minimumValue={MIN_AGE_BOUND}
            maximumValue={MAX_AGE_BOUND}
            value={minAge}
            onValueChange={handleMinChange}
            step={1}
            minimumTrackTintColor={CARAMEL}
            maximumTrackTintColor={DIVIDER}
            thumbTintColor={BROWN}
            disabled={disabled}
          />
          <Text style={styles.sliderEndpoint}>{MAX_AGE_BOUND} yrs</Text>
        </View>
      </View>

      {/* Maximum Age Slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Maximum Age: {maxAge}</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderEndpoint}>{MIN_AGE_BOUND} yrs</Text>
          <Slider
            style={styles.slider}
            minimumValue={MIN_AGE_BOUND}
            maximumValue={MAX_AGE_BOUND}
            value={maxAge}
            onValueChange={handleMaxChange}
            step={1}
            minimumTrackTintColor={CARAMEL}
            maximumTrackTintColor={DIVIDER}
            thumbTintColor={BROWN}
            disabled={disabled}
          />
          <Text style={styles.sliderEndpoint}>{MAX_AGE_BOUND} yrs</Text>
        </View>
      </View>

      {disabled && (
        <Text style={styles.disabledNote}>
          Verification required to set preferences
        </Text>
      )}
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
    color: DARK,
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 16,
  },
  rangeDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ICON_BG,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  rangeText: {
    fontSize: 18,
    fontWeight: '700',
    color: BROWN,
  },
  sliderContainer: {
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  sliderEndpoint: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '600',
    width: 36,
    textAlign: 'center',
  },
  disabledNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
