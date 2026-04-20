// components/parent/jobs/PreferencesCard.tsx
// Component for optional preferences (religion, language, certifications)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Language } from '@/hooks/shared';

interface PreferencesCardProps {
  religions: string[];
  languages: Language[];
  selectedReligion: string;
  selectedLanguageId: string;
  requirePoliceClearance: boolean;
  preferTesdaNc2: boolean;
  onReligionChange: (religion: string) => void;
  onLanguageChange: (languageId: string) => void;
  onPoliceClearanceChange: (value: boolean) => void;
  onTesdaNc2Change: (value: boolean) => void;
  disabled?: boolean;
}

export function PreferencesCard({
  religions,
  languages,
  selectedReligion,
  selectedLanguageId,
  requirePoliceClearance,
  preferTesdaNc2,
  onReligionChange,
  onLanguageChange,
  onPoliceClearanceChange,
  onTesdaNc2Change,
  disabled,
}: PreferencesCardProps) {
  const [showReligions, setShowReligions] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);

  const getSelectedReligionText = () => {
    return selectedReligion || 'No preference';
  };

  const getSelectedLanguageText = () => {
    const lang = languages.find((l) => l.language_id === selectedLanguageId);
    return lang?.language_name || 'No preference';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="filter-outline" size={22} color="#9C27B0" />
        <Text style={styles.title}>Preferences (Optional)</Text>
      </View>

      <Text style={styles.subtitle}>
        These are optional filters to help find the right helper
      </Text>

      {/* Religion Preference */}
      <View style={styles.section}>
        <Text style={styles.label}>Preferred Religion</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowReligions(!showReligions)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectButtonText}>{getSelectedReligionText()}</Text>
          <Ionicons
            name={showReligions ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>

        {showReligions && (
          <ScrollView style={styles.optionsList}>
            <TouchableOpacity
              style={[
                styles.optionItem,
                !selectedReligion && styles.optionItemActive,
                disabled && { backgroundColor: '#f99c9cff' },
              ]}
              onPress={() => {
                onReligionChange('');
                setShowReligions(false);
              }}
            >
              <Text style={styles.optionItemText}>No preference</Text>
              {!selectedReligion && (
                <Ionicons name="checkmark" size={20} color="#9C27B0" />
              )}
            </TouchableOpacity>
            {religions.map((religion) => (
              <TouchableOpacity
                key={religion}
                style={[
                  styles.optionItem,
                  selectedReligion === religion && styles.optionItemActive,
                ]}
                onPress={() => {
                  onReligionChange(religion);
                  setShowReligions(false);
                }}
              >
                <Text style={styles.optionItemText}>{religion}</Text>
                {selectedReligion === religion && (
                  <Ionicons name="checkmark" size={20} color="#9C27B0" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Language Preference */}
      <View style={styles.section}>
        <Text style={styles.label}>Preferred Language</Text>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowLanguages(!showLanguages)}
          activeOpacity={0.7}
        >
          <Text style={styles.selectButtonText}>{getSelectedLanguageText()}</Text>
          <Ionicons
            name={showLanguages ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#666"
          />
        </TouchableOpacity>

        {showLanguages && (
          <ScrollView style={styles.optionsList}>
            <TouchableOpacity
              style={[
                styles.optionItem,
                !selectedLanguageId && styles.optionItemActive,
                disabled && { backgroundColor: '#f99c9cff' },
              ]}
              onPress={() => {
                onLanguageChange('');
                setShowLanguages(false);
              }}
            >
              <Text style={styles.optionItemText}>No preference</Text>
              {!selectedLanguageId && (
                <Ionicons name="checkmark" size={20} color="#9C27B0" />
              )}
            </TouchableOpacity>
            {languages.map((language) => (
              <TouchableOpacity
                key={language.language_id}
                style={[
                  styles.optionItem,
                  selectedLanguageId === language.language_id &&
                    styles.optionItemActive,
                ]}
                onPress={() => {
                  onLanguageChange(String(language.language_id));
                  setShowLanguages(false);
                }}
              >
                <Text style={styles.optionItemText}>{language.language_name}</Text>
                {selectedLanguageId === language.language_id && (
                  <Ionicons name="checkmark" size={20} color="#9C27B0" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Certifications */}
      <View style={styles.section}>
        <Text style={styles.label}>Required Certifications</Text>
        
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.switchLabel}>Police Clearance</Text>
            <Text style={styles.switchHint}>Require valid police clearance</Text>
          </View>
          <Switch
            value={requirePoliceClearance}
            onValueChange={onPoliceClearanceChange}
            trackColor={{ false: '#E5E5EA', true: '#9C27B0' }}
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
            trackColor={{ false: '#E5E5EA', true: '#9C27B0' }}
            thumbColor="#fff"
            disabled={disabled}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
  selectButtonText: {
    fontSize: 15,
    color: '#1A1C1E',
  },
  optionsList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionItemActive: {
    backgroundColor: '#F3E5F5',
  },
  optionItemText: {
    fontSize: 14,
    color: '#1A1C1E',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1C1E',
    marginBottom: 2,
  },
  switchHint: {
    fontSize: 12,
    color: '#666',
  },
});
