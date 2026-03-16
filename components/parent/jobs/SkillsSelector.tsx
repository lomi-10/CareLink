// components/parent/jobs/SkillsSelector.tsx
// UPDATED - Shows skills from ALL selected jobs (multi-job support)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Skill {
  skill_id: string | number;
  skill_name: string;
  job_id: string | number;
  description?: string;
}

interface SkillsSelectorProps {
  selectedJobIds: (string | number)[]; // CHANGED: Now array instead of single jobId
  availableSkills: Skill[];
  selectedSkills: (string | number)[];
  onToggleSkill: (skillId: string | number) => void;
  disabled?: boolean;
}

export function SkillsSelector({
  selectedJobIds,
  availableSkills,
  selectedSkills,
  onToggleSkill,
  disabled = false,
}: SkillsSelectorProps) {
  // Don't show if no jobs selected
  if (selectedJobIds.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Preferred Skills (Optional)</Text>
        <Text style={styles.hint}>
          Select job titles first to see available skills
        </Text>
      </View>
    );
  }

  // Don't show if no skills for selected jobs
  if (availableSkills.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Preferred Skills (Optional)</Text>
        <Text style={styles.hint}>
          No specific skills defined for the selected job{selectedJobIds.length > 1 ? 's' : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Preferred Skills (Optional) - {selectedSkills.length} selected
      </Text>
      <Text style={styles.hint}>
        Select skills you want the helper to have for {selectedJobIds.length > 1 ? 'these jobs' : 'this job'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.skillsContainer}
      >
        {availableSkills.map((skill) => {
          const isSelected = selectedSkills.includes(skill.skill_id);
          return (
            <TouchableOpacity
              key={skill.skill_id}
              style={[
                styles.skillChip,
                isSelected && styles.skillChipActive,
                disabled && styles.skillChipDisabled,
              ]}
              onPress={() => !disabled && onToggleSkill(skill.skill_id)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.skillText,
                  isSelected && styles.skillTextActive,
                  disabled && styles.skillTextDisabled,
                ]}
              >
                {skill.skill_name}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedSkills.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>
            Selected: {selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.selectedSkills}>
            {availableSkills
              .filter((skill) => selectedSkills.includes(skill.skill_id))
              .map((skill) => skill.skill_name)
              .join(', ')}
          </Text>
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
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  skillsContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  skillChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  skillChipDisabled: {
    opacity: 0.5,
    backgroundColor: '#F8F9FA',
  },
  skillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  skillTextActive: {
    color: '#007AFF',
  },
  skillTextDisabled: {
    color: '#999',
  },
  selectedContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
  },
  selectedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  selectedSkills: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
});
