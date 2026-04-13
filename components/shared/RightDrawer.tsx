// components/common/RightDrawer.tsx
import React, { useEffect, useRef, useState } from 'react';
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
  userType?: 'helper' | 'parent'; // Added this prop
}

export default function RightDrawer({ visible, onClose, onLogout, userType = 'helper' }: RightDrawerProps) {
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Determine the prefix based on userType
  const pathPrefix = userType === 'parent' ? '/(parent)' : '/(helper)';

  const drawerWidth = 300; 

  // Animation Values
  const slideAnim = useRef(new Animated.Value(drawerWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShowLogoutConfirm(false); 
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
        slideAnim.setValue(drawerWidth);
        fadeAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    if (showLogoutConfirm) {
        setShowLogoutConfirm(false);
        return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: drawerWidth, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  };

  const navigateTo = (path: string) => {
    handleClose();
    setTimeout(() => {
        // Automatically prepends the correct folder based on who is logged in
        router.push(`${pathPrefix}${path}` as any);
    }, 300);
  };

  const handleLogoutPress = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    handleClose(); 
    setTimeout(() => {
        onLogout();
    }, 300);
  };

  return (
    <Modal transparent={true} visible={visible} onRequestClose={handleClose} animationType="none">
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.drawerHeader}>
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
        </View>

        <View style={styles.menuItems}>
            {/* Navigates to correct home (parent vs helper) */}
            <TouchableOpacity style={styles.item} onPress={() => navigateTo('/home')}>
                <Ionicons name="home-outline" size={24} color="#555" />
                <Text style={styles.itemText}>Home</Text>
            </TouchableOpacity>
            
            {/* Navigates to correct profile (parent vs helper) */}
            <TouchableOpacity style={styles.item} onPress={() => navigateTo('/profile')}>
                <Ionicons name="person-outline" size={24} color="#555" />
                <Text style={styles.itemText}>My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={() => navigateTo('/settings')}>
                <Ionicons name="settings-outline" size={24} color="#555" />
                <Text style={styles.itemText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.item} onPress={handleLogoutPress}>
                <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
                <Text style={[styles.itemText, { color: '#FF3B30' }]}>Logout</Text>
            </TouchableOpacity>
        </View>
      </Animated.View>

      {showLogoutConfirm && (
        <View style={styles.confirmOverlay}>
            <View style={styles.confirmBox}>
                <View style={styles.confirmHeader}>
                    <Ionicons name="warning-outline" size={32} color="#FF3B30" />
                    <Text style={styles.confirmTitle}>Log Out</Text>
                </View>
                <Text style={styles.confirmMessage}>Are you sure you want to log out?</Text>
                <View style={styles.confirmButtons}>
                    <TouchableOpacity style={styles.btnCancel} onPress={() => setShowLogoutConfirm(false)}>
                        <Text style={styles.btnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnLogout} onPress={confirmLogout}>
                        <Text style={styles.btnLogoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: 'white',
    zIndex: 2,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
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
    gap: 15,
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
  },

  // --- LOGOUT MODAL STYLES ---
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker background for focus
    zIndex: 10, // Must be higher than drawer
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  confirmMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  btnLogout: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  btnLogoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});