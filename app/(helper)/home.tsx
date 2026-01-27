// app/(helper)/home.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API_URL from '../../constants/api';

// --- TYPES ---
type User = {
  name: string;
  user_type: 'parent' | 'helper' | 'admin';
  user_id: string;
};

type ProfileStats = {
  profile_views: number;
  job_applications: number;
  pending_interviews: number;
  profile_completeness: number;
};

export default function HelperHomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        await fetchProfileStats(parsedUser.user_id);
      }
    } catch (e) {
      console.error("Failed to load user", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileStats = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/helper/get_stats.php?user_id=${userId}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E8B57" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const openLogoutModal = () => {
    setMenuVisible(false);
    setTimeout(() => setLogoutModalVisible(true), 100);
  };

  const performLogout = async () => {
    setLogoutModalVisible(false);
    try {
      const userId = await AsyncStorage.getItem('user_token');
      if (userId) {
        await fetch(`${API_URL}/logout.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
    await AsyncStorage.clear();
    router.replace('/welcome');
  };

  const handleSettings = () => {
    setMenuVisible(false);
    router.push('/(helper)/settings');
  };

  const handleProfile = () => {
    setMenuVisible(false);
    router.push('/(helper)/profile');
  };

  const navigateToJobSearch = () => {
    router.push('/(helper)/jobs');
  };

  const navigateToApplications = () => {
    router.push('/(helper)/applications');
  };

  const navigateToMessages = () => {
    router.push('/(helper)/messages');
  };

  const getProfileCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return '#2E8B57';
    if (percentage >= 50) return '#FFA500';
    return '#FF6B6B';
  };

  const profileCompleteness = stats?.profile_completeness || 0;
  const completenessColor = getProfileCompletenessColor(profileCompleteness);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E8B57" />
      
      {/* HEADER */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingTime}>Good {getTimeOfDay()},</Text>
            <Text style={styles.greetingName}>{user?.name}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MENU MODAL */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <View style={styles.menuDropdown}>
              <TouchableOpacity style={styles.menuItem} onPress={handleProfile}>
                <Ionicons name="person-circle" size={20} color="#333"/>
                <Text style={styles.menuText}>My Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                <Ionicons name="settings-outline" size={20} color="#333" />
                <Text style={styles.menuText}>Settings</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={openLogoutModal}>
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={[styles.menuText, { color: '#FF3B30' }]}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.logoutModalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="log-out-outline" size={48} color="#FF3B30" />
            </View>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out of CareLink?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.logoutButton]} 
                onPress={performLogout}
              >
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MAIN CONTENT */}
      <ScrollView 
        style={styles.mainScrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E8B57']} />
        }
      >
        {/* PROFILE COMPLETENESS CARD */}
        <View style={styles.profileCompletenessCard}>
          <View style={styles.completenessHeader}>
            <View>
              <Text style={styles.cardTitle}>Profile Strength</Text>
              <Text style={styles.cardSubtitle}>
                {profileCompleteness < 100 
                  ? 'Complete your profile to get more job offers!' 
                  : 'Your profile is complete!'}
              </Text>
            </View>
            <View style={styles.percentageCircle}>
              <Text style={[styles.percentageText, { color: completenessColor }]}>
                {profileCompleteness}%
              </Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${profileCompleteness}%`, backgroundColor: completenessColor }
              ]} 
            />
          </View>

          {profileCompleteness < 100 && (
            <TouchableOpacity style={styles.completeProfileBtn} onPress={handleProfile}>
              <Text style={styles.completeProfileText}>Complete Profile</Text>
              <Ionicons name="arrow-forward" size={16} color="#2E8B57" />
            </TouchableOpacity>
          )}
        </View>

        {/* QUICK STATS */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={navigateToJobSearch}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="briefcase" size={24} color="#2E8B57" />
            </View>
            <Text style={styles.statNumber}>{stats?.profile_views || 0}</Text>
            <Text style={styles.statLabel}>Profile Views</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={navigateToApplications}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="document-text" size={24} color="#FF9800" />
            </View>
            <Text style={styles.statNumber}>{stats?.job_applications || 0}</Text>
            <Text style={styles.statLabel}>Applications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statCard} onPress={navigateToApplications}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="calendar" size={24} color="#2196F3" />
            </View>
            <Text style={styles.statNumber}>{stats?.pending_interviews || 0}</Text>
            <Text style={styles.statLabel}>Interviews</Text>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={navigateToJobSearch}>
            <View style={styles.actionCardLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="search" size={24} color="#2E8B57" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Find Jobs</Text>
                <Text style={styles.actionSubtitle}>Browse available opportunities</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToApplications}>
            <View style={styles.actionCardLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="document-text" size={24} color="#FF9800" />
              </View>
              <View>
                <Text style={styles.actionTitle}>My Applications</Text>
                <Text style={styles.actionSubtitle}>Track your job applications</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToMessages}>
            <View style={styles.actionCardLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="chatbubbles" size={24} color="#2196F3" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Messages</Text>
                <Text style={styles.actionSubtitle}>Chat with employers</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleProfile}>
            <View style={styles.actionCardLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="person" size={24} color="#9C27B0" />
              </View>
              <View>
                <Text style={styles.actionTitle}>Edit Profile</Text>
                <Text style={styles.actionSubtitle}>Update your information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* TIPS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips for Success</Text>
          
          <View style={styles.tipCard}>
            <Ionicons name="bulb" size={20} color="#FFC107" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Keep your profile updated</Text>
              <Text style={styles.tipText}>
                Employers prefer helpers with complete and current information.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Respond quickly to messages</Text>
              <Text style={styles.tipText}>
                Fast responses increase your chances of getting hired.
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="star" size={20} color="#FF9800" />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Build your reputation</Text>
              <Text style={styles.tipText}>
                Positive reviews help you stand out to potential employers.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
} 

// Helper function to get time of day
function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  
  // HEADER
  headerBackground: {
    backgroundColor: '#2E8B57',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greetingTime: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  greetingName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  menuBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },

  // MENU POPUP
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', 
  },
  menuDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90, 
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    width: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
    marginHorizontal: 12,
  },

  // LOGOUT MODAL
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", 
  },
  logoutModalContainer: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 20,
    width: "85%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE6E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 25,
    color: "#666",
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: { 
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  logoutButton: { 
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButtonText: { 
    color: "#333", 
    fontWeight: "600", 
    fontSize: 16 
  },
  logoutButtonText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 16 
  },

  // MAIN SCROLL
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },

  // PROFILE COMPLETENESS CARD
  profileCompletenessCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    maxWidth: '80%',
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completeProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    borderRadius: 10,
  },
  completeProfileText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E8B57',
    marginRight: 6,
  },

  // STATS CARDS
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  // SECTIONS
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // ACTION CARDS
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#666',
  },

  // TIP CARDS
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E8B57',
  },
  tipContent: {
    flex: 1,
    marginLeft: 12,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
});