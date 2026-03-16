// components/parent/jobs/JobTitleInput.tsx
// UPDATED - Multi-select support for jobs

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Job } from '@/hooks/useJobReferences';

interface JobTitleInputProps {
  categoryIds: string[]; // CHANGED: Now array
  availableJobs: Job[];
  selectedJobIds: string[]; // CHANGED: Now array
  customJobTitle: string;
  title: string;
  onToggleJob: (jobId: string, jobTitle: string) => void; // CHANGED: Toggle instead of select
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
  title,
  onToggleJob,
  onCustomJobChange,
  onTitleChange,
  error,
  disabled = false,
}: JobTitleInputProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [showJobList, setShowJobList] = useState(false);

  // Reset when categories change
  useEffect(() => {
    setShowCustom(false);
    setShowJobList(false);
  }, [categoryIds]);

  const handleJobToggle = (job: Job) => {
    if (disabled) return;
    onToggleJob(job.job_id, job.job_title);
  };

  const handleCustomClick = () => {
    if (disabled) return;
    setShowCustom(true);
    setShowJobList(false);
  };

  const isJobSelected = (jobId: string) => {
    return selectedJobIds.includes(jobId);
  };

  // Get selected job titles for display
  const getSelectedTitles = () => {
    const titles = availableJobs
      .filter((job) => selectedJobIds.includes(job.job_id))
      .map((job) => job.job_title);
    return titles.length > 0 ? titles.join(', ') : null;
  };

  // Show message based on categories
  const getCategoryMessage = () => {
    if (categoryIds.length === 0) {
      return 'Please select categories first';
    }

    const hasGeneralHousehold = categoryIds.includes('1');

    if (hasGeneralHousehold && categoryIds.length === 1) {
      return 'All job titles available (General Household)';
    }

    return `Job titles from ${categoryIds.length} selected ${
      categoryIds.length > 1 ? 'categories' : 'category'
    }`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Job Titles * ({selectedJobIds.length} selected)
      </Text>

      {/* Category message */}
      {categoryIds.length > 0 && (
        <Text style={styles.categoryHint}>{getCategoryMessage()}</Text>
      )}

      {/* Show job selection if categories are selected */}
      {categoryIds.length > 0 && availableJobs.length > 0 && !showCustom && (
        <View style={styles.jobSelectionContainer}>
          <TouchableOpacity
            style={[styles.selectButton, disabled && styles.selectButtonDisabled]}
            onPress={() => !disabled && setShowJobList(!showJobList)}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
          >
            <Text
              style={[styles.selectButtonText, disabled && styles.selectButtonTextDisabled]}
            >
              {getSelectedTitles() || 'Select from available jobs'}
            </Text>
            <Ionicons
              name={showJobList ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={disabled ? '#ccc' : '#666'}
            />
          </TouchableOpacity>

          {showJobList && !disabled && (
            <ScrollView style={styles.jobList} nestedScrollEnabled>
              {availableJobs.map((job) => {
                const selected = isJobSelected(job.job_id);
                return (
                  <TouchableOpacity
                    key={job.job_id}
                    style={[
                      styles.jobItem,
                      selected && styles.jobItemActive,
                    ]}
                    onPress={() => handleJobToggle(job)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.jobItemContent}>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={selected ? '#007AFF' : '#999'}
                      />
                      <Text
                        style={[
                          styles.jobItemText,
                          selected && styles.jobItemTextActive,
                        ]}
                      >
                        {job.job_title}
                      </Text>
                    </View>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.customButton}
            onPress={handleCustomClick}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled}
          >
            <Ionicons name="create-outline" size={18} color={disabled ? '#ccc' : '#007AFF'} />
            <Text style={[styles.customButtonText, disabled && styles.customButtonTextDisabled]}>
              Or enter custom job title
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom job title input */}
      {(showCustom || categoryIds.length === 0 || availableJobs.length === 0) && (
        <View style={styles.customContainer}>
          <TextInput
            style={[styles.input, disabled && styles.inputDisabled]}
            placeholder="Enter custom job title (e.g., Live-in Nanny)"
            value={customJobTitle || title}
            onChangeText={(value) => {
              if (disabled) return;
              onCustomJobChange(value);
              onTitleChange(value);
            }}
            placeholderTextColor="#999"
            editable={!disabled}
          />
          {categoryIds.length > 0 && availableJobs.length > 0 && !disabled && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowCustom(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>← Back to job list</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Selected Jobs Summary */}
      {selectedJobIds.length > 0 && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedLabel}>Selected jobs:</Text>
          <Text style={styles.selectedText}>{getSelectedTitles()}</Text>
        </View>
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
  categoryHint: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  jobSelectionContainer: {
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
  },
  selectButtonDisabled: {
    backgroundColor: '#F8F9FA',
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 15,
    color: '#1A1C1E',
    flex: 1,
  },
  selectButtonTextDisabled: {
    color: '#999',
  },
  jobList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 250,
  },
  jobItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  jobItemActive: {
    backgroundColor: '#F0F8FF',
  },
  jobItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  jobItemText: {
    fontSize: 14,
    color: '#1A1C1E',
    flex: 1,
  },
  jobItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  customButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  customButtonTextDisabled: {
    color: '#ccc',
  },
  customContainer: {
    marginTop: 0,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
  },
  inputDisabled: {
    backgroundColor: '#F8F9FA',
    color: '#999',
  },
  backButton: {
    marginTop: 8,
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
  },
  selectedBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 13,
    color: '#1976D2',
  },
});
