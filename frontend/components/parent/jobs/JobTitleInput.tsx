// components/parent/jobs/JobTitleInput.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@/hooks/shared';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

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

  const selectedJobs = availableJobs.filter((job) => isJobSelected(job.job_id));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        What work needs doing? <Text style={styles.asterisk}>*</Text>
      </Text>

      {availableJobs.length > 0 ? (
        <View style={styles.jobSelectionWrapper}>
          <TouchableOpacity
            style={[styles.selectButton, disabled && styles.disabled]}
            onPress={() => !disabled && setShowJobList(!showJobList)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <Text style={[styles.selectButtonText, selectedJobs.length === 0 && styles.placeholder]}>
              {selectedJobs.length > 0 ? `${selectedJobs.length} selected` : 'Choose work from the list'}
            </Text>
            <Ionicons
              name={showJobList ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={disabled ? '#9CA3AF' : MUTED}
            />
          </TouchableOpacity>

          {selectedJobs.length > 0 && (
            <View style={styles.chipRow}>
              {selectedJobs.map((job) => (
                <View key={`chip-${job.job_id}`} style={styles.chip}>
                  <Text style={styles.chipText}>{job.job_title}</Text>
                  <TouchableOpacity
                    onPress={() => handleJobToggle(job)}
                    disabled={disabled}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={14} color={BROWN} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

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
                          color={selected ? CARAMEL : '#9CA3AF'}
                        />
                        <View style={styles.jobTextBlock}>
                          <Text style={[styles.jobItemText, selected && styles.jobItemTextActive]}>
                            {job.job_title}
                          </Text>
                          {job.description ? <Text style={styles.jobDescription}>{job.description}</Text> : null}
                        </View>
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
              color={BROWN}
            />
            <Text style={styles.customToggleText}>
              {isCustom ? 'Choose from the list instead' : 'Add work that is not listed'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.noJobsText}>
          No work options are listed for this category. Add a simple title for the work instead.
        </Text>
      )}

      {(isCustom || availableJobs.length === 0) && (
        <View style={styles.customInputWrapper}>
          <Text style={styles.inputLabel}>Name the work</Text>
          <TextInput
            style={[styles.input, disabled && styles.disabled]}
            placeholder="e.g., Household driver, home cleaning"
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
  label: { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 12 },
  asterisk: { color: '#FF3B30' },
  jobSelectionWrapper: { gap: 8 },
  selectButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: DIVIDER, borderRadius: 12, padding: 14 },
  selectButtonText: { fontSize: 15, color: '#111827', flex: 1 },
  placeholder: { color: '#9CA3AF' },
  disabled: { backgroundColor: '#F3F4F6', opacity: 0.6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ICON_BG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '600', color: BROWN },
  dropdownContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, marginTop: 4, maxHeight: 250, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  jobList: { padding: 4 },
  jobItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8 },
  jobItemActive: { backgroundColor: ICON_BG },
  jobItemContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  jobTextBlock: { flex: 1, gap: 3 },
  jobItemText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  jobDescription: { fontSize: 12, color: MUTED, lineHeight: 17 },
  jobItemTextActive: { color: BROWN, fontWeight: '600' },
  customToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  customToggleText: { fontSize: 14, color: BROWN, fontWeight: '600' },
  noJobsText: { fontSize: 14, color: '#6B7280', fontStyle: 'italic', marginBottom: 8 },
  customInputWrapper: { marginTop: 8, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827' },
  errorText: { color: '#FF3B30', fontSize: 12, marginTop: 8 },
});