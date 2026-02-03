// app/(helper)/home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

// Make sure this points to your actual API URL config
import API_URL from '../../constants/api'; 

// Components
import AppHeader from '../../components/common/AppHeader';
import RightDrawer from '../../components/common/RightDrawer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationModal from '../../components/common/NotificationModal';

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
  const router = useRouter();

  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Menu state (Controls the RightDrawer)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Error notification
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- EFFECTS ---
  useEffect(() => {
    loadUserData();
  }, []);

  /**
   * Load user data and stats
   */
  const loadUserData = async () => {
    try {
      // Don't set loading true on refresh, only initial load
      if (!refreshing) setLoading(true);
      
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        // If no data, silent fail or redirect to login
        setLoading(false);
        return;
      }

      const parsed = JSON.parse(userData);
      setUser(parsed);
      
      // Fetch stats from backend
      await fetchProfileStats(parsed.user_id);
      
    } catch (error: any) {
      console.error('Error loading user data:', error);
      setErrorMessage(`Failed to load user data: ${error.message}`);
      setErrorModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch profile statistics
   */
  const fetchProfileStats = async (userId: string) => {
    try {
      // Ensure API_URL is correct in your constants file
      const response = await fetch(`${API_URL}/helper/get_stats.php?user_id=${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP Error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        // Fallback default
        setStats({
          profile_views: 0,
          job_applications: 0,
          pending_interviews: 0,
          profile_completeness: 0
        });
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      // We don't always want to show a modal for background fetch errors
      // Just set defaults
      setStats({
        profile_views: 0,
        job_applications: 0,
        pending_interviews: 0,
        profile_completeness: 0
      });
    }
  };

  /**
   * Refresh data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  /**
   * HANDLE LOGOUT
   * This is passed to RightDrawer. It runs ONLY after the user clicks "Yes" in the drawer.
   */
  const handleLogout = async () => {
    try {
      // 1. Clear specific keys or Clear All
      await AsyncStorage.multiRemove(['user_data', 'user_token']); 
      // OR: await AsyncStorage.clear();

      // 2. Close the menu state
      setIsMenuOpen(false);

      // 3. Reset navigation to Login
      router.replace('/(auth)/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  /**
   * Navigation helpers
   */
  const navigateToJobSearch = () => router.push('/(helper)/jobs');
  const navigateToApplications = () => router.push('/(helper)/applications');
  const navigateToMessages = () => router.push('/(helper)/messages');
  const navigateToProfile = () => router.push('/(helper)/profile');

  /**
   * Get profile completeness color
   */
  const getProfileCompletenessColor = (percentage: number) => {
    if (percentage >= 80) return '#2E8B57';
    if (percentage >= 50) return '#FFA500';
    return '#FF6B6B';
  };

  /**
   * Get time of day greeting
   */
  const getTimeOfDay = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 18) return 'Afternoon';
    return 'Evening';
  };

  if (loading) {
    return <LoadingSpinner visible={true} message="Loading your dashboard..." />;
  }

  const profileCompleteness = stats?.profile_completeness || 0;
  const completenessColor = getProfileCompletenessColor(profileCompleteness);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#2E8B57" />
      
      {/* ERROR NOTIFICATION */}
      <NotificationModal 
        visible={errorModalVisible}
        message={errorMessage}
        type="error"
        onClose={() => setErrorModalVisible(false)}
        autoClose={false}
      />

      {/* HEADER */}
      <AppHeader 
        title="CareLink" 
        menu={true} 
        onMenuPress={() => setIsMenuOpen(true)} 
      />

      {/* NAVIGATION DRAWER 
        - visible: Controlled by isMenuOpen
        - onLogout: Calls handleLogout (which clears storage & redirects)
      */}
      <RightDrawer 
        visible={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onLogout={handleLogout} 
      />

      {/* MAIN CONTENT */}
      <ScrollView 
        style={styles.mainScrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E8B57']} />
        }
      >
        {/* GREETING CARD */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingContent}>
            <Text style={styles.greetingTime}>Good {getTimeOfDay()},</Text>
            <Text style={styles.greetingName}>{user?.name || 'Helper'}</Text>
            <Text style={styles.greetingSubtext}>Welcome back to CareLink</Text>
          </View>
          <View style={styles.greetingIcon}>
            <Ionicons name="sunny" size={40} color="#FFA500" />
          </View>
        </View>

        {/* PROFILE COMPLETENESS CARD */}
        <View style={styles.profileCompletenessCard}>
          <View style={styles.completenessHeader}>
            <View style={styles.completenessInfo}>
              <Text style={styles.cardTitle}>Profile Strength</Text>
              <Text style={styles.cardSubtitle}>
                {profileCompleteness < 100 
                  ? 'Complete your profile to get more job offers!' 
                  : 'Your profile is complete! 🎉'}
              </Text>
            </View>
            <View style={[styles.percentageCircle, { borderColor: completenessColor }]}>
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
            <TouchableOpacity style={styles.completeProfileBtn} onPress={navigateToProfile}>
              <Text style={styles.completeProfileText}>Complete Profile</Text>
              <Ionicons name="arrow-forward" size={16} color="#2E8B57" />
            </TouchableOpacity>
          )}
        </View>

        {/* QUICK STATS */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statCard} onPress={navigateToJobSearch}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="eye" size={24} color="#2E8B57" />
            </View>
            <Text style={styles.statNumber}>{stats?.profile_views || 0}</Text>
            <Text style={styles.statLabel}>Views</Text>
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

          <TouchableOpacity style={styles.actionCard} onPress={navigateToProfile}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  mainScrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100,
    paddingHorizontal: 20,
  },

  // GREETING CARD
  greetingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  greetingContent: {
    flex: 1,
  },
  greetingTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 13,
    color: '#999',
  },
  greetingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF9E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // PROFILE COMPLETENESS
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
  completenessInfo: {
    flex: 1,
    marginRight: 12,
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
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  percentageText: {
    fontSize: 16,
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

  // STATS
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