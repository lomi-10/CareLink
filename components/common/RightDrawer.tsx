import React, { useEffect, useRef } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, 
  Animated, Dimensions, Platform, TouchableWithoutFeedback 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface RightDrawerProps {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function RightDrawer({ visible, onClose, onLogout }: RightDrawerProps) {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const drawerWidth = 300; // Fixed width for the drawer

  // Animation Values
  // 1. Slide: Starts off-screen to the right (positive value)
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;
  // 2. Fade: Starts transparent
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // OPEN: Animate Slide In + Fade In
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true, // 'true' is better for performance
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
        // CLOSE: Reset values (optional, mostly handled by unmounting)
        slideAnim.setValue(drawerWidth);
        fadeAnim.setValue(0);
    }
  }, [visible]);

  // Function to animate OUT before closing the actual Modal
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: drawerWidth, // Slide back out
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose(); // Tell parent to hide the Modal AFTER animation finishes
    });
  };

  const navigateTo = (path: string) => {
    handleClose();
    // Small timeout to let the drawer close before pushing new screen
    setTimeout(() => {
        // @ts-ignore
        router.push(path);
    }, 300);
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      animationType="none" // We use our own custom animation
    >
      {/* 1. BACKDROP (Dark Overlay) */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      {/* 2. THE DRAWER (Sliding Panel) */}
      <Animated.View 
        style={[
          styles.drawer, 
          { transform: [{ translateX: slideAnim }] } 
        ]}
      >
        {/* Header Section */}
        <View style={styles.drawerHeader}>
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuItems}>
            <TouchableOpacity style={styles.item} onPress={() => navigateTo('/(helper)/home')}>
                <Ionicons name="home-outline" size={24} color="#555" />
                <Text style={styles.itemText}>Home</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.item} onPress={() => navigateTo('/(helper)/profile')}>
                <Ionicons name="person-outline" size={24} color="#555" />
                <Text style={styles.itemText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => navigateTo('/settings')}>
                <Ionicons name="settings-outline" size={24} color="#555" />
                <Text style={styles.itemText}>Settings</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            <TouchableOpacity style={styles.item} onPress={() => { handleClose(); onLogout(); }}>
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                <Text style={[styles.itemText, { color: '#FF3B30' }]}>Logout</Text>
            </TouchableOpacity>

        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject, // Fills the whole screen
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0, // Fills vertical height
    width: 300, // Standard Sidebar width
    backgroundColor: 'white',
    zIndex: 2,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Space for status bar
    
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  closeBtn: {
    padding: 5,
  },
  menuItems: {
    padding: 20,
    gap: 15, // Space between items
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemText: {
    fontSize: 18,
    marginLeft: 15,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  }
});