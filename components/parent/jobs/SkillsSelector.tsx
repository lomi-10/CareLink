// components/parent/jobs/SkillsSelector.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Skill {
  skill_id: string | number;
  skill_name: string;
  job_id: string | number;
  description?: string;
}

interface SkillsSelectorProps {
  selectedJobIds: (string | number)[]; 
  availableSkills: Skill[];
  selectedSkills: (string | number)[];
  customSkills: string;
  onToggleSkill: (skillId: string | number) => void;
  onCustomSkillsChange: (value: string) => void;
  disabled?: boolean;
}

export function SkillsSelector({
  selectedJobIds,
  availableSkills,
  selectedSkills,
  customSkills,
  onToggleSkill,
  onCustomSkillsChange,
  disabled = false,
}: SkillsSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);

  // Don't show if no jobs selected
  if (selectedJobIds.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Step 3: Preferred Skills <Text style={styles.asterisk}>*</Text>
      </Text>
      <Text style={styles.hint}>
        Select at least 2 skills or specify your own to help us match the right helper.
      </Text>

      {availableSkills.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skillsContainer}
        >
          {availableSkills.map((skill) => {
            const isSelected = selectedSkills.includes(skill.skill_id.toString());
            return (
              <TouchableOpacity
                key={`skill-${skill.skill_id}`}
                style={[
                  styles.skillChip,
                  isSelected && styles.skillChipActive,
                  disabled && styles.skillChipDisabled,
                ]}
                onPress={() => !disabled && onToggleSkill(skill.skill_id.toString())}
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
                  <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.customToggle}
        onPress={() => setShowCustom(!showCustom)}
        disabled={disabled}
      >
        <Ionicons 
          name={showCustom ? "remove-circle-outline" : "add-circle-outline"} 
          size={18} 
          color="#2563EB" 
        />
        <Text style={styles.customToggleText}>
          {showCustom ? "Hide custom skills" : "Add other specific skills"}
        </Text>
      </TouchableOpacity>

      {showCustom && (
        <View style={styles.customInputWrapper}>
          <Text style={styles.inputLabel}>Other Skills (Comma separated)</Text>
          <TextInput
            style={[styles.input, disabled && styles.disabled]}
            placeholder="e.g., Driving, First Aid, Swimming..."
            value={customSkills}
            onChangeText={onCustomSkillsChange}
            placeholderTextColor="#9CA3AF"
            editable={!disabled}
            multiline
          />
        </View>
      )}

      {(selectedSkills.length > 0 || customSkills) && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>
            Selected requirements:
          </Text>
          <Text style={styles.selectedSkills}>
            {[
              ...availableSkills
                .filter((skill) => selectedSkills.includes(skill.skill_id.toString()))
                .map((skill) => skill.skill_name),
              ...(customSkills ? customSkills.split(',').map(s => s.trim()).filter(s => s) : [])
            ].join(' • ')}
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
  asterisk: {
    color: '#FF3B30',
  },
  hint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  skillsContainer: {
    paddingVertical: 4,
    marginBottom: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
  },
  skillChipActive: {
    backgroundColor: '#F0F8FF',
    borderColor: '#2563EB',
  },
  skillChipDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  skillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  skillTextActive: {
    color: '#2563EB',
  },
  skillTextDisabled: {
    color: '#9CA3AF',
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  customToggleText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  customInputWrapper: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  selectedContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectedSkills: {
    fontSize: 13,
    color: '#0C4A6E',
    lineHeight: 20,
    fontWeight: '500',
  },
});

