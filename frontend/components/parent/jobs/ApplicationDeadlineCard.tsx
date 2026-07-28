// components/parent/jobs/ApplicationDeadlineCard.tsx
// Optional "applications close on" date for a job post

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateField } from '@/components/shared/DateField';

interface ApplicationDeadlineCardProps {
  expiresAt: string;
  onExpiresAtChange: (date: string) => void;
  error?: string;
  disabled?: boolean;
}

export function ApplicationDeadlineCard({
  expiresAt,
  onExpiresAtChange,
  error,
  disabled = false,
}: ApplicationDeadlineCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="hourglass-outline" size={24} color="#2563EB" />
        <Text style={styles.title}>Application Deadline (Optional)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Applications close on</Text>
        <DateField
          value={expiresAt}
          onChange={onExpiresAtChange}
          placeholder="No deadline — stays open until you close it"
          minimumDate={new Date()}
          disabled={disabled}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {expiresAt ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => !disabled && onExpiresAtChange('')}
            disabled={disabled}
          >
            <Text style={styles.clearButtonText}>Clear deadline</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color="#2563EB" />
        <Text style={styles.infoText}>
          Leave this blank to keep the post open indefinitely. If set, the post is
          automatically hidden from helpers after this date — your existing
          applications and hires are not affected.
        </Text>
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
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 16,
  },
});
