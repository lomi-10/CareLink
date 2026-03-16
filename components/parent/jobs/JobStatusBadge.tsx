// components/parent/jobs/JobStatusBadge.tsx
// Status badge for job posts

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface JobStatusBadgeProps {
  status: 'Open' | 'Filled' | 'Closed' | 'Expired';
}

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'Open':
        return {
          backgroundColor: '#E8F5E9',
          borderColor: '#34C759',
          textColor: '#34C759',
          label: 'Open',
        };
      case 'Filled':
        return {
          backgroundColor: '#E3F2FD',
          borderColor: '#007AFF',
          textColor: '#007AFF',
          label: 'Filled',
        };
      case 'Closed':
        return {
          backgroundColor: '#FFF3E0',
          borderColor: '#FF9500',
          textColor: '#FF9500',
          label: 'Closed',
        };
      case 'Expired':
        return {
          backgroundColor: '#FFEBEE',
          borderColor: '#FF3B30',
          textColor: '#FF3B30',
          label: 'Expired',
        };
      default:
        return {
          backgroundColor: '#F0F0F0',
          borderColor: '#999',
          textColor: '#999',
          label: status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
