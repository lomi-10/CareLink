import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API_URL from '../../constants/api';

// --- TYPES ---
type User = {
  name: string;
  user_type: 'parent' | 'helper' | 'admin';
};

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error("Failed to load user", e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // --- RENDER DIFFERENT SCREENS BASED ON ROLE ---
  if (user?.user_type === 'helper') {
    return <HelperDashboard user={user} />;
  }

  // Default to Parent Dashboard
  return <ParentDashboard user={user} />;
}

// ==========================================
// 👨‍👩‍👧 PARENT DASHBOARD COMPONENT
// ==========================================
function ParentDashboard({ user }: { user: User | null }) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false); 

  // 1. ACTION: Open the confirmation modal
  const openLogoutModal = () => {
    setMenuVisible(false); 
    setTimeout(() => setLogoutModalVisible(true), 100); 
  };

  // 2. ACTION: Actually log out
  const performLogout = async () => {
    setLogoutModalVisible(false);
    
    try {
      // Log the logout event in DB
      const userId = await AsyncStorage.getItem('user_token');
      if (userId) {
        await fetch(`${API_URL}/logout.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        });
      }
    } catch (e) {
      console.error("Logout log failed", e);
    }

    await AsyncStorage.clear();
    router.replace('/welcome');
  };

  const handleSettings = () => {
    setMenuVisible(false);
    router.push('/(tabs)/settings');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. COLORFUL TOP BAR */}
      <View style={styles.headerBackground}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greetingTime}>Good Day,</Text>
            <Text style={styles.greetingName}>{user?.name || "Guest"}</Text>
          </View>
          
          {/* MENU BUTTON (Right Side) */}
          <TouchableOpacity 
            style={styles.menuBtn} 
            onPress={() => setMenuVisible(true)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MENU MODAL (Dropdown) */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <View style={styles.menuDropdown}>
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
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            
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

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={styles.mainScrollView}
      >
        {/* 2. FLOATING SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
          <TextInput 
            placeholder="Find a Nanny, Maid, Cook..." 
            placeholderTextColor="#999"
            style={styles.searchInput} 
          />
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="options" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* 3. CATEGORIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {['Cleaning', 'Nanny', 'Cooking', 'Elderly', 'Laundry'].map((cat, index) => (
              <TouchableOpacity key={index} style={styles.categoryCard}>
                <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(index) }]}>
                  <Ionicons name={getCategoryIcon(cat)} size={24} color="#fff" />
                </View>
                <Text style={styles.categoryText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 4. FEATURED HELPERS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Rated Helpers</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.featuredCard}>
              <View style={styles.featuredBadge}>
                <Text style={styles.badgeText}>PRO</Text>
              </View>
              <View style={styles.avatarContainer}>
                 <Text style={{fontSize: 30}}>👩‍🍳</Text>
              </View>
              <Text style={styles.featuredName}>Maria Santos</Text>
              <Text style={styles.featuredRole}>Expert Cook</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>4.9 (120)</Text>
              </View>
            </View>

            <View style={styles.featuredCard}>
              <View style={styles.avatarContainer}>
                 <Text style={{fontSize: 30}}>🧹</Text>
              </View>
              <Text style={styles.featuredName}>Lita Cruz</Text>
              <Text style={styles.featuredRole}>Housekeeper</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>4.8 (85)</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* 5. RECENT LISTINGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Helpers</Text>
          {[1, 2, 3].map((i) => (
            <TouchableOpacity key={i} style={styles.listCard}>
              <View style={styles.listIcon}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={styles.listInfo}>
                <Text style={styles.listName}>Juana Dela Cruz</Text>
                <Text style={styles.listSub}>Nanny • 3km away</Text>
                <View style={styles.skillsRow}>
                  <Text style={styles.skillTag}>Kids</Text>
                  <Text style={styles.skillTag}>First Aid</Text>
                </View>
              </View>
              <View style={styles.listAction}>
                <Text style={styles.rateText}>₱500/day</Text>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

// ==========================================
// 👷‍♀️ HELPER DASHBOARD COMPONENT
// ==========================================
function HelperDashboard({ user }: { user: User | null }) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false); 

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
      console.error("Logout log failed", e);
    }

    await AsyncStorage.clear();
    router.replace('/welcome');
  };

  const handleSettings = () => {
    setMenuVisible(false);
    router.push('/(tabs)/settings');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Helper Header (Green Theme) */}
      <View style={[styles.headerBackground, { backgroundColor: '#2E8B57' }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greetingTime}>Welcome Back,</Text>
            <Text style={styles.greetingName}>{user?.name}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Shared Menu Modal */}
      <Modal
        transparent={true}
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.menuOverlay}>
            <View style={styles.menuDropdown}>
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
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            
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

      <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#2E8B57' }}>My Profile Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Ionicons name="checkmark-circle" size={24} color="#2E8B57" />
              <Text style={{ marginLeft: 10, fontSize: 16, color: '#333' }}>Active & Visible</Text>
            </View>
          </View>

          <View style={{ marginTop: 20, backgroundColor: '#fff', padding: 20, borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.05, elevation: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>Job Requests</Text>
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Ionicons name="briefcase-outline" size={40} color="#ccc" />
              <Text style={{ marginTop: 10, color: '#999' }}>No new requests yet.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- UTILS ---
function getCategoryColor(index: number) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#96CEB4'];
  return colors[index % colors.length];
}

function getCategoryIcon(cat: string) {
  switch(cat) {
    case 'Cleaning': return 'water';
    case 'Nanny': return 'happy';
    case 'Cooking': return 'restaurant';
    case 'Elderly': return 'medkit';
    case 'Laundry': return 'shirt';
    default: return 'star';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // HEADER
  headerBackground: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 80,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  greetingName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },

  // MENU POPUP
  menuOverlay: {
    flex: 1,
    backgroundColor: 'transparent', 
  },
  menuDropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90, 
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    width: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 10,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 10,
  },

  // LOGOUT CONFIRMATION MODAL
  alertOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", 
  },
  logoutModalContainer: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 12,
    width: "85%",
    maxWidth: 350,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    color: "#666",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: { backgroundColor: "#E5E5EA" },
  logoutButton: { backgroundColor: "#FF3B30" },
  cancelButtonText: { color: "#333", fontWeight: "600", fontSize: 16 },
  logoutButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },

  // SCROLL CONTENT
  mainScrollView: {
    marginTop: -50, 
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // SEARCH BAR
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 25,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterBtn: {
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
    paddingLeft: 10,
  },

  // SECTIONS
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  seeAll: {
    color: '#007AFF',
    fontWeight: '600',
  },

  // CATEGORIES
  categoryScroll: {
    overflow: 'visible', 
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },

  // FEATURED CARDS
  featuredCard: {
    backgroundColor: '#fff',
    width: 160,
    padding: 15,
    borderRadius: 20,
    marginRight: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  featuredRole: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFC107',
    marginLeft: 4,
  },

  // LIST CARDS
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  listIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  listSub: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  skillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  skillTag: {
    fontSize: 10,
    color: '#007AFF',
    backgroundColor: '#E6F0FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listAction: {
    alignItems: 'flex-end',
  },
  rateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
});