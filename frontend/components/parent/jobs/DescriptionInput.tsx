// components/parent/jobs/DescriptionInput.tsx
// Component for job description input

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateDescription: () => void;
  error?: string;
  disabled?: boolean;
}

export function DescriptionInput({ value, onChange, onGenerateDescription, error, disabled }: DescriptionInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={22} color="#FF9500" />
        <Text style={styles.title}>Job Description <Text style={{ color: '#EF4444' }}>*</Text></Text>
      </View>

      <Text style={styles.hint}>
        Describe the job responsibilities, requirements, and expectations
      </Text>

      <TouchableOpacity
        style={[styles.generateButton, disabled && { opacity: 0.5 }]}
        onPress={onGenerateDescription}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons name="sparkles-outline" size={18} color="#FF9500" />
        <Text style={styles.generateButtonText}>Generate Description</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Example:&#10;&#10;We are looking for a reliable and caring yaya to take care of our 2-year-old son. Responsibilities include:&#10;&#10;• Feeding and bathing the child&#10;• Playing and educational activities&#10;• Ensuring child safety at all times&#10;• Light housekeeping related to the child&#10;&#10;Requirements:&#10;• At least 1 year experience with toddlers&#10;• Patient and loving personality&#10;• Non-smoker"
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={10}
        textAlignVertical="top"
        placeholderTextColor="#999"
        editable={!disabled}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 Tips for a great description:</Text>
        <Text style={styles.tipItem}>• Be specific about daily tasks</Text>
        <Text style={styles.tipItem}>• Mention your household (family size, kids' ages)</Text>
        <Text style={styles.tipItem}>• Include working hours and days off</Text>
        <Text style={styles.tipItem}>• List any special requirements or skills needed</Text>
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
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
    minHeight: 200,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
  },
  tips: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FFF4E5',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
});
