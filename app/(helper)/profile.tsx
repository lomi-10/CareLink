import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, Image, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Custom Components
import AppHeader from '../../components/common/AppHeader';
import RightDrawer from '../../components/common/RightDrawer';
import EditProfileModal from '../../components/profile/EditProfileModal'; // We will create this next

export default function HelperProfileScreen() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- MOCK DATA (Replace this with Fetch from DB later) ---
  const profileData = {
    fullName: "Juan Dela Cruz",
    username: "@juandelacruz",
    bio: "Hardworking and reliable helper with 5 years of experience in elderly care. I am patient, kind, and certified in First Aid.",
    avatar: null, // If null, shows placeholder
    location: "Brgy. Guadalupe, Cebu City",
    salary: "8,000",
    skills: ["Elderly Care", "Cooking", "Housekeeping"],
    verificationStatus: "Pending", // 'Verified', 'Pending', 'Unverified'
  };

  return (
    <View style={styles.screenContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <AppHeader 
        title="My Dashboard" 
        menu={true} 
        onMenuPress={() => setIsMenuOpen(true)} 
      />

      {/* Navigation Drawer */}
      <RightDrawer 
        visible={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        onLogout={() => router.replace('/(auth)/login')} 
      />

      {/* Edit Modal (The Form) */}
      <EditProfileModal 
        visible={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
      />

      {/* --- MAIN DASHBOARD CONTENT --- */}
      <View style={styles.webCenterContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 1. IDENTITY CARD (Top Section) */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarContainer}>
              {profileData.avatar ? (
                <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={60} color="#ccc" />
              )}
            </View>
            <Text style={styles.nameText}>{profileData.fullName}</Text>
            <Text style={styles.usernameText}>{profileData.username}</Text>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, 
              profileData.verificationStatus === 'Verified' ? styles.bgGreen : styles.bgOrange
            ]}>
              <Ionicons 
                name={profileData.verificationStatus === 'Verified' ? "checkmark-circle" : "time"} 
                size={14} color="#fff" 
              />
              <Text style={styles.statusText}>PESO {profileData.verificationStatus}</Text>
            </View>

            <View style={styles.locationRow}>
               <Ionicons name="location-sharp" size={16} color="#666" />
               <Text style={styles.locationText}>{profileData.location}</Text>
            </View>
          </View>

          {/* 2. ABOUT ME */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeaderRow}>
               <Text style={styles.cardTitle}>About Me</Text>
            </View>
            <Text style={styles.bioText}>{profileData.bio}</Text>
          </View>

          {/* 3. SKILLS & RATES */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Specialties</Text>
            <View style={styles.skillRow}>
              {profileData.skills.map((skill, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>Expected Salary:</Text>
              <Text style={styles.salaryValue}>₱ {profileData.salary} / month</Text>
            </View>
          </View>

          {/* 4. DOCUMENTS STATUS */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Documents</Text>
            <View style={styles.docRow}>
               <Ionicons name="document-text" size={24} color="#007AFF" />
               <Text style={styles.docText}>NBI Clearance</Text>
               <Ionicons name="checkmark-circle" size={20} color="green" />
            </View>
            <View style={styles.docRow}>
               <Ionicons name="document-text" size={24} color="#007AFF" />
               <Text style={styles.docText}>Barangay Clearance</Text>
               <Ionicons name="checkmark-circle" size={20} color="green" />
            </View>
          </View>

        </ScrollView>

        {/* --- FLOATING EDIT BUTTON --- */}
        {/* This mimics the "Pen" icon usually found on profiles */}
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => setIsEditModalOpen(true)}
        >
           <Ionicons name="create-outline" size={24} color="#fff" />
           <Text style={styles.fabText}>Edit Profile</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  webCenterContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
    position: 'relative', // For FAB positioning
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
  
  // 1. Header Card
  profileHeaderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: '#fff',
    // Shadow for avatar pop
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  usernameText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  bgGreen: { backgroundColor: '#28a745' },
  bgOrange: { backgroundColor: '#fd7e14' },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: { color: '#666', fontSize: 14 },

  // Generic Card Styles
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  
  // Skills
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillChip: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  skillText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 13,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  salaryLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  salaryValue: { fontSize: 16, fontWeight: 'bold', color: '#28a745' },

  // Docs
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
  },
  docText: { flex: 1, fontSize: 15, color: '#333' },

  // Floating Action Button (Edit)
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});