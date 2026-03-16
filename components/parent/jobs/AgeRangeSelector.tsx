// components/parent/jobs/AgeRangeSelector.tsx
// Age range selector with dual sliders

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

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
      <Text style={styles.label}>Preferred Age Range (Optional)</Text>
      <Text style={styles.hint}>
        Select the age range you prefer for your helper
      </Text>

      {/* Age Range Display */}
      <View style={styles.rangeDisplay}>
        <View style={styles.ageBox}>
          <Text style={styles.ageLabel}>Min Age</Text>
          <Text style={styles.ageValue}>{minAge}</Text>
        </View>
        <View style={styles.separator}>
          <Text style={styles.separatorText}>to</Text>
        </View>
        <View style={styles.ageBox}>
          <Text style={styles.ageLabel}>Max Age</Text>
          <Text style={styles.ageValue}>{maxAge}</Text>
        </View>
      </View>

      {/* Minimum Age Slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Minimum Age</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderValue}>18</Text>
          <Slider
            style={styles.slider}
            minimumValue={18}
            maximumValue={70}
            value={minAge}
            onValueChange={handleMinChange}
            step={1}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
            thumbTintColor="#007AFF"
            disabled={disabled}
          />
          <Text style={styles.sliderValue}>70</Text>
        </View>
      </View>

      {/* Maximum Age Slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Maximum Age</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderValue}>18</Text>
          <Slider
            style={styles.slider}
            minimumValue={18}
            maximumValue={70}
            value={maxAge}
            onValueChange={handleMaxChange}
            step={1}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
            thumbTintColor="#007AFF"
            disabled={disabled}
          />
          <Text style={styles.sliderValue}>70</Text>
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
    color: '#1A1C1E',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  rangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  ageBox: {
    alignItems: 'center',
    flex: 1,
  },
  ageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  ageValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1976D2',
  },
  separator: {
    paddingHorizontal: 16,
  },
  separatorText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    width: 24,
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
