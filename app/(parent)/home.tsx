// app/(parent)/home.tsx
// Professional Parent Dashboard - Domestic Care Platform
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API_URL from '../../constants/api';

// Components
import AppHeader from '../../components/common/AppHeader';
import RightDrawer from '../../components/common/RightDrawer';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import NotificationModal from '../../components/common/NotificationModal';

const { width } = Dimensions.get('window');

// Types
type User = {
  name: string;
  user_id: string;
  user_type: 'service_seeker' | 'service_helper' | 'peso_admin';
};

type HelperCategory = {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  count: number;
};

type FeaturedHelper = {
  id: number;
  name: string;
  role: string;
  rating: number;
  reviews: number;
  experience: number;
  hourlyRate: number;
  avatar: string;
  isVerified: boolean;
  skills: string[];
  availability: 'available' | 'busy' | 'unavailable';
};

export default function ParentHomeScreen() {
  const router = useRouter();

  // State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutSuccessVisible, setLogoutSuccessVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data - Replace with API calls
  const [stats, setStats] = useState({
    activeJobs: 2,
    applications: 15,
    hired: 3,
  });

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      
      // TODO: Fetch real stats from API
      // const response = await fetch(`${API_URL}/parent/get_stats.php?user_id=${user.user_id}`);
      
    } catch (e) {
      console.error("Failed to load user", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  // Actions
  const handleLogout = async () => {
    setIsMenuOpen(false);
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
    setLogoutSuccessVisible(true);
    setTimeout(() => {
      setLogoutSuccessVisible(false);
      router.replace('/welcome');
    }, 1500);
  };

  const handleSearch = () => {
    router.push({
      pathname: '/(parent)/search',
      params: { query: searchQuery }
    });
  };

  // Categories
  const categories: HelperCategory[] = [
    { id: '1', name: 'Nanny', icon: 'person', color: '#FF6B9D', bgColor: '#FFE8F0', count: 45 },
    { id: '2', name: 'Cook', icon: 'restaurant', color: '#FF9800', bgColor: '#FFF3E0', count: 32 },
    { id: '3', name: 'Maid', icon: 'home', color: '#4CAF50', bgColor: '#E8F5E9', count: 68 },
    { id: '4', name: 'Caregiver', icon: 'medkit', color: '#2196F3', bgColor: '#E3F2FD', count: 28 },
    { id: '5', name: 'Driver', icon: 'car', color: '#9C27B0', bgColor: '#F3E5F5', count: 15 },
    { id: '6', name: 'Gardener', icon: 'leaf', color: '#4CAF50', bgColor: '#E8F5E9', count: 12 },
  ];

  // Featured Helpers - Mock data
  const featuredHelpers: FeaturedHelper[] = [
    {
      id: 1,
      name: 'Maria Santos',
      role: 'Professional Nanny',
      rating: 4.9,
      reviews: 127,
      experience: 8,
      hourlyRate: 150,
      avatar: '👩‍🍼',
      isVerified: true,
      skills: ['Infant Care', 'First Aid', 'Tutoring'],
      availability: 'available',
    },
    {
      id: 2,
      name: 'Elena Cruz',
      role: 'Expert Cook',
      rating: 5.0,
      reviews: 85,
      experience: 12,
      hourlyRate: 180,
      avatar: '👩‍🍳',
      isVerified: true,
      skills: ['Filipino', 'Western', 'Baking'],
      availability: 'available',
    },
    {
      id: 3,
      name: 'Rosa Garcia',
      role: 'Housekeeper',
      rating: 4.8,
      reviews: 94,
      experience: 6,
      hourlyRate: 120,
      avatar: '🧹',
      isVerified: true,
      skills: ['Deep Clean', 'Laundry', 'Organization'],
      availability: 'busy',
    },
  ];

  if (loading) return <LoadingSpinner visible={true} message="Loading dashboard..." />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
      
      {/* Logout Success Modal */}
      <NotificationModal 
        visible={logoutSuccessVisible} 
        message="Logged out successfully." 
        type="success" 
        onClose={() => {}} 
      />

      {/* Header & Drawer */}
      <AppHeader 
        title="Find Help" 
        menu={true} 
        onMenuPress={() => setIsMenuOpen(true)} 
      />
      
      <RightDrawer 
        visible={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onLogout={handleLogout} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
      >
        {/* 1. WELCOME SECTION WITH STATS */}
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.greetingTime}>Good {getTimeOfDay()},</Text>
            <Text style={styles.greetingName}>{user?.name || "Parent"} 👋</Text>
            <Text style={styles.greetingSubtext}>Find the perfect help for your home</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <StatCard 
            icon="briefcase-outline" 
            value={stats.activeJobs} 
            label="Active Jobs" 
            color="#007AFF"
            onPress={() => router.push('/(parent)/my-jobs')}
          />
          <StatCard 
            icon="people-outline" 
            value={stats.applications} 
            label="Applications" 
            color="#FF9800"
            onPress={() => router.push('/(parent)/applications')}
          />
          <StatCard 
            icon="checkmark-circle-outline" 
            value={stats.hired} 
            label="Hired" 
            color="#4CAF50"
            onPress={() => router.push('/(parent)/hired')}
          />
        </View>

        {/* 2. SEARCH BAR */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput 
              placeholder="Search for nanny, cook, maid..." 
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => router.push('/(parent)/filters')}
          >
            <Ionicons name="options" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* 3. QUICK ACTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <QuickActionCard
              icon="add-circle"
              iconColor="#007AFF"
              iconBg="#E3F2FD"
              title="Post a Job"
              subtitle="Find helpers"
              onPress={() => router.push('/(parent)/post-job')}
            />
            
            <QuickActionCard
              icon="search"
              iconColor="#4CAF50"
              iconBg="#E8F5E9"
              title="Browse Helpers"
              subtitle="View profiles"
              onPress={() => router.push('/(parent)/browse')}
            />
            
            <QuickActionCard
              icon="calendar"
              iconColor="#FF9800"
              iconBg="#FFF3E0"
              title="Manage Bookings"
              subtitle="View schedule"
              onPress={() => router.push('/(parent)/bookings')}
            />
            
            <QuickActionCard
              icon="chatbubbles"
              iconColor="#9C27B0"
              iconBg="#F3E5F5"
              title="Messages"
              subtitle="Chat with helpers"
              onPress={() => router.push('/(parent)/messages')}
            />
          </View>
        </View>

        {/* 4. HELPER CATEGORIES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <TouchableOpacity onPress={() => router.push('/(parent)/categories')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onPress={() => router.push({
                  pathname: '/(parent)/search',
                  params: { category: category.name }
                })}
              />
            ))}
          </ScrollView>
        </View>

        {/* 5. FEATURED HELPERS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Top Rated Helpers</Text>
              <Text style={styles.sectionSubtitle}>Verified & highly recommended</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(parent)/top-rated')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {featuredHelpers.map((helper) => (
              <FeaturedHelperCard
                key={helper.id}
                helper={helper}
                onPress={() => router.push({
                  pathname: '/(parent)/helper-profile',
                  params: { helper_id: helper.id }
                })}
              />
            ))}
          </ScrollView>
        </View>

        {/* 6. NEARBY HELPERS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Helpers Near You</Text>
              <Text style={styles.sectionSubtitle}>Available in Cebu City</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(parent)/nearby')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Helper List Cards */}
          <HelperListCard
            name="Ana Reyes"
            role="Experienced Nanny"
            distance="2.5 km away"
            rating={4.7}
            reviews={52}
            rate="₱500/day"
            skills={['Infant Care', 'First Aid']}
            avatar="👶"
            isVerified={true}
            onPress={() => router.push('/(parent)/helper-profile')}
          />

          <HelperListCard
            name="Liza Santos"
            role="Professional Cook"
            distance="1.8 km away"
            rating={4.9}
            reviews={68}
            rate="₱600/day"
            skills={['Filipino', 'Baking']}
            avatar="👩‍🍳"
            isVerified={true}
            onPress={() => router.push('/(parent)/helper-profile')}
          />

          <HelperListCard
            name="Gloria Martinez"
            role="Housekeeper"
            distance="3.2 km away"
            rating={4.6}
            reviews={41}
            rate="₱450/day"
            skills={['Deep Clean', 'Laundry']}
            avatar="🧹"
            isVerified={false}
            onPress={() => router.push('/(parent)/helper-profile')}
          />
        </View>

        {/* 7. TIPS & GUIDES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hiring Tips & Guides</Text>
          
          <TipCard
            icon="shield-checkmark"
            iconColor="#4CAF50"
            iconBg="#E8F5E9"
            title="How to Verify Helpers"
            subtitle="Learn about background checks and verification"
            onPress={() => router.push('/(parent)/guides/verification')}
          />

          <TipCard
            icon="document-text"
            iconColor="#2196F3"
            iconBg="#E3F2FD"
            title="Creating Effective Job Posts"
            subtitle="Tips for attracting quality applicants"
            onPress={() => router.push('/(parent)/guides/job-posts')}
          />
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatCard({ icon, value, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function QuickActionCard({ icon, iconColor, iconBg, title, subtitle, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function CategoryCard({ category, onPress }: { category: HelperCategory, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.categoryCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.categoryIcon, { backgroundColor: category.bgColor }]}>
        <Ionicons name={category.icon as any} size={28} color={category.color} />
      </View>
      <Text style={styles.categoryName}>{category.name}</Text>
      <Text style={styles.categoryCount}>{category.count} available</Text>
    </TouchableOpacity>
  );
}

function FeaturedHelperCard({ helper, onPress }: { helper: FeaturedHelper, onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.featuredCard} onPress={onPress} activeOpacity={0.8}>
      {/* Verified Badge */}
      {helper.isVerified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
        </View>
      )}

      {/* Avatar */}
      <View style={styles.helperAvatar}>
        <Text style={styles.helperAvatarEmoji}>{helper.avatar}</Text>
      </View>

      {/* Info */}
      <Text style={styles.helperName} numberOfLines={1}>{helper.name}</Text>
      <Text style={styles.helperRole} numberOfLines={1}>{helper.role}</Text>

      {/* Rating */}
      <View style={styles.helperRating}>
        <Ionicons name="star" size={14} color="#FFD700" />
        <Text style={styles.helperRatingText}>{helper.rating}</Text>
        <Text style={styles.helperReviews}>({helper.reviews})</Text>
      </View>

      {/* Skills */}
      <View style={styles.helperSkills}>
        {helper.skills.slice(0, 2).map((skill, index) => (
          <View key={index} style={styles.skillBadge}>
            <Text style={styles.skillBadgeText}>{skill}</Text>
          </View>
        ))}
      </View>

      {/* Rate */}
      <View style={styles.helperRate}>
        <Text style={styles.helperRateText}>₱{helper.hourlyRate}/hr</Text>
      </View>

      {/* Availability */}
      <View style={[
        styles.availabilityDot, 
        { backgroundColor: helper.availability === 'available' ? '#4CAF50' : '#FF9800' }
      ]} />
    </TouchableOpacity>
  );
}

function HelperListCard({ name, role, distance, rating, reviews, rate, skills, avatar, isVerified, onPress }: any) {
  return (
    <TouchableOpacity style={styles.listCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.listCardLeft}>
        <View style={styles.listAvatar}>
          <Text style={styles.listAvatarEmoji}>{avatar}</Text>
          {isVerified && (
            <View style={styles.listVerifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
            </View>
          )}
        </View>

        <View style={styles.listInfo}>
          <Text style={styles.listName}>{name}</Text>
          <Text style={styles.listRole}>{role}</Text>
          
          <View style={styles.listMeta}>
            <Ionicons name="location" size={12} color="#999" />
            <Text style={styles.listDistance}>{distance}</Text>
            
            <Ionicons name="star" size={12} color="#FFD700" style={{ marginLeft: 12 }} />
            <Text style={styles.listRating}>{rating} ({reviews})</Text>
          </View>

          <View style={styles.listSkills}>
            {skills.map((skill: string, index: number) => (
              <View key={index} style={styles.listSkillTag}>
                <Text style={styles.listSkillText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.listCardRight}>
        <Text style={styles.listRate}>{rate}</Text>
        <Ionicons name="chevron-forward" size={20} color="#CCC" />
      </View>
    </TouchableOpacity>
  );
}

function TipCard({ icon, iconColor, iconBg, title, subtitle, onPress }: any) {
  return (
    <TouchableOpacity style={styles.tipCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.tipIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.tipInfo}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Welcome Section
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greetingTime: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  greetingSubtext: {
    fontSize: 14,
    color: '#666',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 25,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // Section
  section: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#666',
  },

  // Categories
  categoriesScroll: {
    paddingRight: 20,
    gap: 12,
  },
  categoryCard: {
    width: 110,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 11,
    color: '#666',
  },

  // Featured Helpers
  featuredScroll: {
    paddingRight: 20,
    gap: 16,
  },
  featuredCard: {
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    position: 'relative',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
  },
  helperAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  helperAvatarEmoji: {
    fontSize: 36,
  },
  helperName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  helperRole: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  helperRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
    gap: 4,
  },
  helperRatingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFC107',
  },
  helperReviews: {
    fontSize: 11,
    color: '#999',
  },
  helperSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillBadgeText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  helperRate: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  helperRateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  availabilityDot: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },

  // List Cards
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  listCardLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  listAvatar: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  listAvatarEmoji: {
    fontSize: 28,
  },
  listVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  listRole: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listDistance: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  listRating: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  listSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  listSkillTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  listSkillText: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  listCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  listRate: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },

  // Tip Cards
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 14,
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipInfo: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  tipSubtitle: {
    fontSize: 12,
    color: '#666',
  },
});
