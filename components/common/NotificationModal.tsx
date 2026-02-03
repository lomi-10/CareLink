// components/common/NotificationModal.tsx
import React, { useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, 
  Animated, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationModalProps {
  visible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function NotificationModal({ 
  visible, 
  message, 
  type = 'info',
  onClose,
  autoClose = true,
  duration = 3000 
}: NotificationModalProps) {
  
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
      
      // Auto close
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);
  
  const handleClose = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };
  
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
      case 'error':
        return { name: 'close-circle', color: '#F44336', bg: '#FFEBEE' };
      case 'warning':
        return { name: 'warning', color: '#FF9800', bg: '#FFF3E0' };
      case 'info':
        return { name: 'information-circle', color: '#2196F3', bg: '#E3F2FD' };
    }
  };
  
  const iconConfig = getIconConfig();
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
            <Ionicons name={iconConfig.name as any} size={40} color={iconConfig.color} />
          </View>
          
          <Text style={styles.message}>{message}</Text>
          
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: iconConfig.color }]} 
            onPress={handleClose}
          >
            <Text style={styles.closeButtonText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
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
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 25,
    lineHeight: 24,
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    minWidth: 120,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});