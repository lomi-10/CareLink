// components/parent/jobs/WorkScheduleCard.tsx
// Cross-Platform Work Schedule: Native Calendar for Mobile, Browser Calendar for Web

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface WorkScheduleCardProps {
  startDate: string;
  workHours: string;
  daysOff: string[];
  onStartDateChange: (date: string) => void;
  onWorkHoursChange: (hours: string) => void;
  onDaysOffToggle: (day: string) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function WorkScheduleCard({
  startDate,
  workHours,
  daysOff,
  onStartDateChange,
  onWorkHoursChange,
  onDaysOffToggle,
  disabled = false,
}: WorkScheduleCardProps) {
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Parse existing date or use today's date
  const currentDate = startDate && !isNaN(Date.parse(startDate)) 
    ? new Date(startDate) 
    : new Date();

  // Handle Mobile Date Change
  const handleMobileDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      onStartDateChange(formattedDate);
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  // Convert "Mar 15, 2026" back to "2026-03-15" for the Web Calendar
  let webDateValue = '';
  if (startDate && !isNaN(Date.parse(startDate))) {
    webDateValue = new Date(startDate).toISOString().split('T')[0];
  }

  // The Web-Only Calendar Input
  const renderWebDatePicker = () => {
    return React.createElement('input', {
      type: 'date',
      value: webDateValue,
      min: new Date().toISOString().split('T')[0], // Prevents past dates
      disabled: disabled,
      onChange: (event: any) => {
        const selectedStr = event.target.value; // "YYYY-MM-DD"
        if (selectedStr) {
          // Add timezone offset fix so the day doesn't jump backward
          const d = new Date(selectedStr + 'T12:00:00Z'); 
          const formattedDate = d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          });
          onStartDateChange(formattedDate);
        }
      },
      style: {
        padding: '12px',
        border: '1px solid #E5E5EA',
        borderRadius: '10px',
        backgroundColor: disabled ? '#F0F0F0' : '#F8F9FA',
        color: disabled ? '#999' : '#1A1C1E',
        fontSize: '15px',
        width: '100%',
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box'
      }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={24} color="#007AFF" />
        <Text style={styles.title}>Work Schedule (Optional)</Text>
      </View>

      {/* Start Date */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferred Start Date</Text>
        
        {Platform.OS === 'web' ? (
          // WEB: Native Browser Calendar
          renderWebDatePicker()
        ) : (
          // MOBILE: Native iOS/Android Calendar Picker
          <>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, disabled && styles.inputDisabled]}
              onPress={() => !disabled && setShowDatePicker(true)}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Text style={{ color: startDate ? '#1A1C1E' : '#999', fontSize: 15 }}>
                {startDate || 'Select a start date'}
              </Text>
              <Ionicons name="calendar" size={20} color={disabled ? "#999" : "#007AFF"} />
            </TouchableOpacity>

            {showDatePicker && (
              <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : undefined}>
                {Platform.OS === 'ios' && (
                  <View style={styles.iosPickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.iosDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={currentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleMobileDateChange}
                  minimumDate={new Date()} // Prevents past dates
                />
              </View>
            )}
          </>
        )}
      </View>

      {/* Work Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Work Hours</Text>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          placeholder="e.g., 8:00 AM - 5:00 PM, Flexible"
          value={workHours}
          onChangeText={onWorkHoursChange}
          placeholderTextColor="#999"
          editable={!disabled}
        />
      </View>

      {/* Days Off */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Days Off</Text>
        <Text style={styles.sectionHint}>
          Select preferred days off (tap to toggle)
        </Text>
        <View style={styles.daysGrid}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = daysOff.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  isSelected && styles.dayChipActive,
                  disabled && styles.dayChipDisabled,
                ]}
                onPress={() => !disabled && onDaysOffToggle(day)}
                activeOpacity={disabled ? 1 : 0.7}
                disabled={disabled}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextActive,
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {day.substring(0, 3)}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={14} color="#007AFF" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {daysOff.length > 0 && (
          <Text style={styles.selectedDays}>
            Selected: {daysOff.join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1C1E',
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  iosPickerContainer: {
    backgroundColor: '#fff',
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  iosPickerHeader: {
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  iosDoneText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  dayChipDisabled: {
    opacity: 0.5,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  dayTextActive: {
    color: '#007AFF',
  },
  dayTextDisabled: {
    color: '#999',
  },
  selectedDays: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 8,
  },
});