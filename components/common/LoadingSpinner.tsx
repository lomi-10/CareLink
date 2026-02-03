// components/common/LoadingSpinner.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';

interface LoadingSpinnerProps {
  visible: boolean;
  message?: string;
}

export default function LoadingSpinner({ visible, message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.message}>{message}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: 15,
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});