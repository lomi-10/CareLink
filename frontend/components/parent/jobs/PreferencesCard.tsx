// components/parent/jobs/PreferencesCard.tsx

import type { Language } from '@/hooks/shared';
import React from 'react';
import { View, Text, StyleSheet, Switch, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { BROWN, CARAMEL, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

interface PreferencesCardProps {
  religions: string[];
  languages: Language[];
  selectedReligion: string;
  selectedLanguageId: string;
  onReligionChange: (religion: string) => void;
  onLanguageChange: (languageId: string) => void;
  requirePoliceClearance: boolean;
  preferTesdaNc2: boolean;
  onPoliceClearanceChange: (value: boolean) => void;
  onTesdaNc2Change: (value: boolean) => void;
  disabled?: boolean;
}

export function PreferencesCard({
  religions,
  languages,
  selectedReligion,
  selectedLanguageId,
  onReligionChange,
  onLanguageChange,
  requirePoliceClearance,
  preferTesdaNc2,
  onPoliceClearanceChange,
  onTesdaNc2Change,
  disabled,
}: PreferencesCardProps) {
  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="people-outline" size={22} color={BROWN} />
          <Text style={styles.title}>Preferred Qualifications (Optional)</Text>
        </View>

        <Text style={styles.sectionLabel}>Preferred Religion</Text>
        <View style={styles.pickerWrap}>
          <Picker
            enabled={!disabled}
            selectedValue={selectedReligion}
            onValueChange={(value) => onReligionChange(value)}
            style={styles.picker}
            itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
          >
            <Picker.Item label="No preference" value="" />
            {religions.map((religion) => (
              <Picker.Item key={religion} label={religion} value={religion} />
            ))}
          </Picker>
        </View>

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Preferred Language</Text>
        <View style={styles.pickerWrap}>
          <Picker
            enabled={!disabled}
            selectedValue={selectedLanguageId}
            onValueChange={(value) => onLanguageChange(value)}
            style={styles.picker}
            itemStyle={Platform.OS === 'ios' ? styles.pickerItem : undefined}
          >
            <Picker.Item label="No preference" value="" />
            {languages.map((language) => (
              <Picker.Item key={language.language_id} label={language.language_name} value={String(language.language_id)} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark-outline" size={22} color={BROWN} />
          <Text style={styles.title}>Required Certifications (Optional)</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Police Clearance</Text>
            <Text style={styles.switchHint}>Require valid police clearance</Text>
          </View>
          <Switch
            value={requirePoliceClearance}
            onValueChange={onPoliceClearanceChange}
            trackColor={{ false: '#E5E5EA', true: CARAMEL }}
            thumbColor="#fff"
            disabled={disabled}
          />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>TESDA NC2 Certificate</Text>
            <Text style={styles.switchHint}>Prefer helper with NC2</Text>
          </View>
          <Switch
            value={preferTesdaNc2}
            onValueChange={onTesdaNc2Change}
            trackColor={{ false: '#E5E5EA', true: CARAMEL }}
            thumbColor="#fff"
            disabled={disabled}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700', color: DARK },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: MUTED, marginBottom: 10 },
  sectionLabelSpaced: { marginTop: 16 },
  pickerWrap: {
    borderWidth: 1.5,
    borderColor: DIVIDER,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: Platform.OS === 'ios' ? { height: 160 } : { height: 50, color: '#1A1C1E' },
  pickerItem: { height: 160, fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#1A1C1E', marginBottom: 2 },
  switchHint: { fontSize: 12, color: MUTED },
});
