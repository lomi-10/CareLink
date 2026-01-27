import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationModalProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error'; // Optional, defaults to success
  onClose: () => void;
}

export default function NotificationModal({ 
  visible, 
  message, 
  type = 'success', 
  onClose 
}: NotificationModalProps) {
  
  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* Icon based on type */}
          <View style={[styles.iconCircle, type === 'error' ? styles.errorBg : styles.successBg]}>
            <Ionicons 
              name={type === 'error' ? "alert-circle" : "checkmark"} 
              size={40} 
              color="#fff" 
            />
          </View>

          <Text style={styles.title}>
            {type === 'error' ? "Ooops!" : "Success!"}
          </Text>
          
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Okay</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    width: 300,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    // Shadows
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -45, // Pulls the icon up to sit on the edge
    marginBottom: 15,
    borderWidth: 4,
    borderColor: '#fff',
  },
  successBg: { backgroundColor: '#28a745' },
  errorBg: { backgroundColor: '#dc3545' },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});