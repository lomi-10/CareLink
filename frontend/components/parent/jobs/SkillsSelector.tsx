// components/parent/jobs/SkillsSelector.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

interface Skill {
  skill_id: string | number;
  skill_name: string;
  job_id: string | number;
  description?: string;
}

interface JobRef {
  job_id: string | number;
  job_title: string;
}

interface SkillsSelectorProps {
  selectedJobIds: (string | number)[];
  availableSkills: Skill[];
  /** Used to label each skill group with the role it belongs to. */
  availableJobs?: JobRef[];
  selectedSkills: (string | number)[];
  customSkills: string;
  onToggleSkill: (skillId: string | number) => void;
  /** Bulk setter — required for the per-role "Select all" toggles. */
  onSetSkills?: (skillIds: string[]) => void;
  onCustomSkillsChange: (value: string) => void;
  disabled?: boolean;
}

export function SkillsSelector({
  selectedJobIds,
  availableSkills,
  availableJobs = [],
  selectedSkills,
  customSkills,
  onToggleSkill,
  onSetSkills,
  onCustomSkillsChange,
  disabled = false,
}: SkillsSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);

  // Don't show if no jobs selected
  if (selectedJobIds.length === 0) {
    return null;
  }

  const selectedIds = selectedSkills.map(String);
  const jobIds = selectedJobIds.map(String);

  // Group the skills under the role they belong to. A flat wall of chips across
  // several roles gives employers no idea which task belongs to which job.
  const groups = jobIds
    .map((jid) => ({
      jobId: jid,
      title: availableJobs.find((j) => j.job_id.toString() === jid)?.job_title ?? 'Role',
      skills: availableSkills.filter((s) => s.job_id.toString() === jid),
    }))
    .filter((g) => g.skills.length > 0);

  const totalSelected = availableSkills.filter((s) => selectedIds.includes(s.skill_id.toString())).length;

  const setGroup = (groupSkillIds: string[], select: boolean) => {
    if (disabled || !onSetSkills) return;
    const next = select
      ? Array.from(new Set([...selectedIds, ...groupSkillIds]))
      : selectedIds.filter((id) => !groupSkillIds.includes(id));
    onSetSkills(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Tasks for this job (optional)</Text>
        {totalSelected > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalSelected} selected</Text>
          </View>
        )}
      </View>
      <Text style={styles.hint}>
        Tick the tasks you actually need. Helpers who can do them rank higher in your matches — leave it blank
        and we&apos;ll match on the role alone.
      </Text>

      {groups.map((group) => {
        const groupIds = group.skills.map((s) => s.skill_id.toString());
        const chosen = groupIds.filter((id) => selectedIds.includes(id)).length;
        const allOn = chosen === groupIds.length && groupIds.length > 0;
        return (
          <View key={`group-${group.jobId}`} style={styles.group}>
            <View style={styles.groupHead}>
              <View style={styles.groupTitleWrap}>
                <Ionicons name="briefcase-outline" size={14} color={BROWN} />
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupCount}>{chosen}/{groupIds.length}</Text>
              </View>
              {onSetSkills && (
                <TouchableOpacity
                  onPress={() => setGroup(groupIds, !allOn)}
                  disabled={disabled}
                  activeOpacity={0.7}
                  style={styles.selectAllBtn}
                  hitSlop={6}
                >
                  <Ionicons name={allOn ? 'close-circle-outline' : 'checkmark-done-outline'} size={14} color={BROWN} />
                  <Text style={styles.selectAllText}>{allOn ? 'Clear' : 'Select all'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.skillsContainer}>
              {group.skills.map((skill) => {
                const isSelected = selectedIds.includes(skill.skill_id.toString());
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
                      <Ionicons name="checkmark-circle" size={16} color={BROWN} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.customToggle}
        onPress={() => setShowCustom(!showCustom)}
        disabled={disabled}
      >
        <Ionicons
          name={showCustom ? "remove-circle-outline" : "add-circle-outline"}
          size={18}
          color={BROWN}
        />
        <Text style={styles.customToggleText}>
          {showCustom ? "Hide custom skills" : "+ Add other skills"}
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4,
  },
  countBadge: {
    backgroundColor: ICON_BG,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BROWN,
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
  group: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 12,
    padding: 12,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  groupTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  groupTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: DARK,
  },
  groupCount: {
    fontSize: 11.5,
    color: MUTED,
    fontWeight: '600',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: ICON_BG,
  },
  selectAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BROWN,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skillChipActive: {
    backgroundColor: ICON_BG,
    borderColor: CARAMEL,
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
    color: BROWN,
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
    color: BROWN,
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
    backgroundColor: ICON_BG,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: CARAMEL,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BROWN,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectedSkills: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 20,
    fontWeight: '500',
  },
});

