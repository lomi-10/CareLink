// components/parent/jobs/JobTitleInput.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@/hooks/shared';

interface JobTitleInputProps {
  categoryIds: string[]; 
  availableJobs: Job[];
  selectedJobIds: string[]; 
  customJobTitle: string;
  title: string;
  onToggleJob: (jobId: string, jobTitle: string) => void; 
  onCustomJobChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function JobTitleInput({
  categoryIds,
  availableJobs,
  selectedJobIds,
  customJobTitle,
  title, // not strictly used for display here, but good for parent logic
  onToggleJob,
  onCustomJobChange,
  onTitleChange,
  error,
  disabled = false,
}: JobTitleInputProps) {
  const [showJobList, setShowJobList] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // FIXED: Convert the array to a string so it doesn't trigger the useEffect on every single keystroke!
  const categoryIdsString = categoryIds.join(',');

  // Reset when actual categories change (not when typing)
  useEffect(() => {
    setShowJobList(false);
    if (availableJobs.length === 0 && categoryIds.length > 0) {
      setIsCustom(true);
    } else {
      setIsCustom(false);
    }
  }, [categoryIdsString, availableJobs.length]); // <-- Uses the stringified version here

  // Don't show anything if no category selected
  if (categoryIds.length === 0) {
    return null;
  }

  const handleJobToggle = (job: Job) => {
    if (disabled) return;
    onToggleJob(job.job_id.toString(), job.job_title);
  };

  const isJobSelected = (jobId: string | number) => {
    return selectedJobIds.includes(jobId.toString());
  };

  const getSelectedTitles = () => {
    const selectedFromList = availableJobs
      .filter((job) => isJobSelected(job.job_id))
      .map((job) => job.job_title);
    
    // FIXED: Stop mixing the custom title with the dropdown selections!
    return selectedFromList.length > 0 ? selectedFromList.join(', ') : null;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Step 2: Select Job Titles <Text style={styles.asterisk}>*</Text>
      </Text>

      {availableJobs.length > 0 ? (
        <View style={styles.jobSelectionWrapper}>
          <TouchableOpacity
            style={[styles.selectButton, disabled && styles.disabled]}
            onPress={() => !disabled && setShowJobList(!showJobList)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text style={[styles.selectButtonText, !getSelectedTitles() && styles.placeholder]}>
              {getSelectedTitles() || 'Select from available jobs'}
            </Text>
            <Ionicons
              name={showJobList ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={disabled ? '#9CA3AF' : '#4B5563'}
            />
          </TouchableOpacity>

          {showJobList && (
            <View style={styles.dropdownContainer}>
              <ScrollView style={styles.jobList} nestedScrollEnabled>
                {availableJobs.map((job) => {
                  const selected = isJobSelected(job.job_id);
                  return (
                    <TouchableOpacity
                      key={`job-${job.job_id}`}
                      style={[styles.jobItem, selected && styles.jobItemActive]}
                      onPress={() => handleJobToggle(job)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.jobItemContent}>
                        <Ionicons
                          name={selected ? 'checkbox' : 'square-outline'}
                          size={22}
                          color={selected ? '#2563EB' : '#9CA3AF'}
                        />
                        <Text style={[styles.jobItemText, selected && styles.jobItemTextActive]}>
                          {job.job_title}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={styles.customToggle}
            onPress={() => setIsCustom(!isCustom)}
            disabled={disabled}
          >
            <Ionicons 
              name={isCustom ? "remove-circle-outline" : "add-circle-outline"} 
              size={18} 
              color="#2563EB" 
            />
            <Text style={styles.customToggleText}>
              {isCustom ? "I'll pick from the list instead" : "Add a custom job title"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noJobsText}>
          No predefined jobs for this category. Please enter a custom title.
        </Text>
      )}

      {(isCustom || availableJobs.length === 0) && (
        <View style={styles.customInputWrapper}>
          <Text style={styles.inputLabel}>Custom Job Title</Text>
          <TextInput
            style={[styles.input, disabled && styles.disabled]}
            placeholder="e.g., Senior Caregiver, Pet Groomer..."
            value={customJobTitle}
            onChangeText={(val) => {
              onCustomJobChange(val);
              // Also update the main title if it's the only one
              if (selectedJobIds.length === 0) {
                onTitleChange(val);
              }
            }}
            placeholderTextColor="#9CA3AF"
            editable={!disabled}
          />
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '700', color: '#1A1C1E', marginBottom: 12 },
  asterisk: { color: '#FF3B30' },
  jobSelectionWrapper: { gap: 8 },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14 },
  selectButtonText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  disabled: { backgroundColor: '#F3F4F6', opacity: 0.6 },
  dropdownContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 4, maxHeight: 250, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  jobList: { padding: 4 },
  jobItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8 },
  jobItemActive: { backgroundColor: '#F0F8FF' },
  jobItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  jobItemText: { fontSize: 14, color: '#374151' },
  jobItemTextActive: { color: '#2563EB', fontWeight: '600' },
  customToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  customToggleText: { fontSize: 14, color: '#2563EB', fontWeight: '600' },
  noJobsText: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginBottom: 8 },
  customInputWrapper: { marginTop: 8, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 8 },
});