// components/parent/verification/PendingBanner.tsx
// Warning banner for pending verification parents

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface PendingBannerProps {
  status: 'Pending' | 'Rejected' | 'Unverified';
  message: string;
  onDismiss?: () => void;
}

export function PendingBanner({ status, message, onDismiss }: PendingBannerProps) {
  const router = useRouter();

  const getConfig = () => {
    switch (status) {
      case 'Pending':
        return {
          bg: '#FFF3E0',
          border: '#FF9500',
          icon: 'time' as const,
          iconColor: '#FF9500',
          action: 'View Profile',
        };
      case 'Rejected':
        return {
          bg: '#FFEBEE',
          border: '#FF3B30',
          icon: 'close-circle' as const,
          iconColor: '#FF3B30',
          action: 'Contact PESO',
        };
      default:
        return {
          bg: '#E3F2FD',
          border: '#007AFF',
          icon: 'information-circle' as const,
          iconColor: '#007AFF',
          action: 'Complete Profile',
        };
    }
  };

  const config = getConfig();

  const handleAction = () => {
    if (status === 'Rejected') {
      // TODO: Navigate to contact/support
      alert('Please contact PESO at peso@ormoc.gov.ph');
    } else {
      router.push('/(parent)/profile');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={styles.content}>
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {status === 'Pending' && 'Verification Pending'}
            {status === 'Rejected' && 'Verification Rejected'}
            {status === 'Unverified' && 'Account Not Verified'}
          </Text>
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: config.iconColor }]}
          onPress={handleAction}
          activeOpacity={0.7}
        >
          <Text style={[styles.actionButtonText, { color: config.iconColor }]}>
            {config.action}
          </Text>
        </TouchableOpacity>

        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dismissButton: {
    padding: 8,
  },
});
