// components/profile/EditParentProfileModal.tsx
// components/profile/EditProfileModal.tsx (PARENT VERSION)
// Covers all fields from parent_profiles table
import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator, KeyboardAvoidingView, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API_URL from "../../constants/api";

import LabeledInput from '../common/LabeledInput';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function EditProfileModal({ visible, onClose, onSaveSuccess }: EditProfileModalProps) {
  
  // STATE - Matches parent_profiles table structure EXACTLY
  const [userId, setUserId] = useState<string | null>(null);
  
  // Required fields (NOT NULL in database)
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  
  // Optional fields
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [householdSize, setHouseholdSize] = useState('');
  
  // Children information
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenAges, setChildrenAges] = useState(''); // e.g., "3,5,8"
  
  // Household details
  const [hasElderly, setHasElderly] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // LIFECYCLE
  useEffect(() => {
    if (visible) loadData();
  }, [visible]);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotifMessage(msg);
    setNotifType(type);
    setNotifVisible(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading parent profile data...');
      
      // Get user data
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('No user data found');
      }
      
      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);
      
      // Fetch profile from API
      const response = await fetch(`${API_URL}/parent/get_profile.php?user_id=${parsed.user_id}`);
      const text = await response.text();
      
      console.log('📄 Raw response:', text.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('❌ JSON parse error:', e);
        throw new Error('Invalid response from server');
      }
      
      if (data.success && data.profile) {
        const p = data.profile;
        
        // Populate all fields
        setContactNumber(p.contact_number || '');
        setAddress(p.address || '');
        setMunicipality(p.municipality || '');
        setBarangay(p.barangay || '');
        
        setProfileImage(p.profile_image || null);
        setHouseholdSize(p.household_size ? String(p.household_size) : '');
        
        // Boolean fields (convert from 0/1 to true/false)
        setHasChildren(p.has_children === 1 || p.has_children === true);
        setChildrenAges(p.children_ages || '');
        
        setHasElderly(p.has_elderly === 1 || p.has_elderly === true);
        setHasPets(p.has_pets === 1 || p.has_pets === true);
        setPetDetails(p.pet_details || '');
        
        console.log('✅ Profile data loaded');
      }
    } catch (error: any) {
      console.error('❌ Load error:', error);
      showNotification(error.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ACTIONS
  
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return showNotification('Camera permission needed', 'error');
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!contactNumber.trim()) {
      return showNotification('Contact number is required', 'error');
    }
    
    if (!address.trim() || !municipality.trim() || !barangay.trim()) {
      return showNotification('Complete address is required', 'error');
    }
    
    // Validate children ages format if has_children is true
    if (hasChildren && childrenAges.trim()) {
      const ages = childrenAges.split(',').map(a => a.trim());
      const allValid = ages.every(age => {
        const num = parseInt(age);
        return !isNaN(num) && num >= 0 && num <= 18;
      });
      
      if (!allValid) {
        return showNotification('Children ages must be numbers 0-18, separated by commas (e.g., "3,5,8")', 'error');
      }
    }
    
    setSaving(true);
    try {
      console.log('💾 Saving parent profile...');
      
      const formData = new FormData();
      formData.append('user_id', userId || '');
      
      // Required fields
      formData.append('contact_number', contactNumber.trim());
      formData.append('address', address.trim());
      formData.append('municipality', municipality.trim());
      formData.append('barangay', barangay.trim());
      
      // Optional fields
      formData.append('household_size', householdSize || '0');
      
      // Boolean fields (convert to 0/1)
      formData.append('has_children', hasChildren ? '1' : '0');
      formData.append('children_ages', childrenAges.trim());
      
      formData.append('has_elderly', hasElderly ? '1' : '0');
      formData.append('has_pets', hasPets ? '1' : '0');
      formData.append('pet_details', petDetails.trim());

      // Profile image if changed
      if (profileImage && !profileImage.startsWith('http')) {
        const fileName = profileImage.split('/').pop() || 'profile.jpg';
        // @ts-ignore
        formData.append('profile_image', {
          uri: profileImage,
          name: fileName,
          type: 'image/jpeg',
        });
      }

      console.log('🌐 Sending request...');
      
      const response = await fetch(`${API_URL}/parent/update_profile.php`, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      console.log('📄 Response:', responseText.substring(0, 200));

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ JSON parse error:', e);
        console.error('Response was:', responseText);
        throw new Error(`Server error: ${responseText.substring(0, 100)}`);
      }

      console.log('✅ Parsed response:', data);

      if (data.success) {
        showNotification(data.message || 'Profile saved!', 'success');
        setTimeout(() => {
          onClose();
          if (onSaveSuccess) onSaveSuccess();
        }, 1500);
      } else {
        showNotification(data.message || 'Save failed', 'error');
      }

    } catch (error: any) {
      console.error('❌ Save error:', error);
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.container}
        >
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <ScrollView 
              contentContainerStyle={styles.content} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              
              {/* Profile Image */}
              <TouchableOpacity onPress={pickImage} style={styles.imageBtn}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.placeholderAvatar}>
                    <Ionicons name="camera" size={40} color="#999" />
                  </View>
                )}
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>

              {/* CONTACT INFORMATION */}
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <LabeledInput 
                label="Contact Number *" 
                value={contactNumber} 
                onChangeText={setContactNumber} 
                keyboardType="phone-pad"
                placeholder="09XX XXX XXXX"
                required
              />

              {/* ADDRESS */}
              <Text style={styles.sectionTitle}>Address</Text>
              
              <LabeledInput 
                label="Full Address *" 
                value={address} 
                onChangeText={setAddress} 
                placeholder="Street, Block, Lot, Subdivision..."
                multiline
                numberOfLines={2}
                required
              />
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Municipality/City *" 
                    value={municipality} 
                    onChangeText={setMunicipality}
                    placeholder="e.g., Cebu City"
                    required
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Barangay *" 
                    value={barangay} 
                    onChangeText={setBarangay}
                    placeholder="e.g., Lahug"
                    required
                  />
                </View>
              </View>

              {/* HOUSEHOLD INFORMATION */}
              <Text style={styles.sectionTitle}>Household Information</Text>
              
              <LabeledInput 
                label="Household Size" 
                value={householdSize} 
                onChangeText={setHouseholdSize} 
                keyboardType="numeric"
                placeholder="Number of people in household"
              />

              {/* HAS CHILDREN SWITCH */}
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Do you have children?</Text>
                  <Text style={styles.switchSubtext}>Toggle if you have kids at home</Text>
                </View>
                <Switch
                  value={hasChildren}
                  onValueChange={setHasChildren}
                  trackColor={{ false: '#ccc', true: '#007AFF' }}
                  thumbColor="#fff"
                />
              </View>

              {/* Children Ages (only show if has_children is true) */}
              {hasChildren && (
                <LabeledInput 
                  label="Children Ages" 
                  value={childrenAges} 
                  onChangeText={setChildrenAges} 
                  placeholder="Enter ages separated by commas (e.g., 3,5,8)"
                  keyboardType="default"
                />
              )}

              {/* HAS ELDERLY SWITCH */}
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Do you have elderly family members?</Text>
                  <Text style={styles.switchSubtext}>Senior citizens requiring care</Text>
                </View>
                <Switch
                  value={hasElderly}
                  onValueChange={setHasElderly}
                  trackColor={{ false: '#ccc', true: '#007AFF' }}
                  thumbColor="#fff"
                />
              </View>

              {/* HAS PETS SWITCH */}
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Do you have pets?</Text>
                  <Text style={styles.switchSubtext}>Dogs, cats, or other animals</Text>
                </View>
                <Switch
                  value={hasPets}
                  onValueChange={setHasPets}
                  trackColor={{ false: '#ccc', true: '#007AFF' }}
                  thumbColor="#fff"
                />
              </View>

              {/* Pet Details (only show if has_pets is true) */}
              {hasPets && (
                <LabeledInput 
                  label="Pet Details" 
                  value={petDetails} 
                  onChangeText={setPetDetails} 
                  placeholder="e.g., 2 dogs (Golden Retriever), 1 cat"
                  multiline
                  numberOfLines={2}
                />
              )}

              {/* Helper Text */}
              <View style={styles.helperBox}>
                <Ionicons name="information-circle" size={20} color="#007AFF" />
                <Text style={styles.helperText}>
                  This information helps us match you with the right domestic helpers for your household needs.
                </Text>
              </View>

              <View style={{ height: 50 }} />
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.saveBtn, (saving || loading) && styles.saveBtnDisabled]} 
              onPress={handleSave} 
              disabled={saving || loading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </Modal>

      <NotificationModal 
        visible={notifVisible} 
        message={notifMessage} 
        type={notifType} 
        onClose={() => setNotifVisible(false)}
      />
    </>
  );
}

// STYLES

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff', 
    marginTop: Platform.OS === 'ios' ? 0 : 40 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20, 
    borderBottomWidth: 1, 
    borderColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold',
    color: '#333'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  content: { 
    padding: 20,
    paddingBottom: 40,
  },
  
  // Image
  imageBtn: { 
    alignSelf: 'center', 
    alignItems: 'center', 
    marginBottom: 24 
  },
  avatar: { 
    width: 110, 
    height: 110, 
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  placeholderAvatar: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  changePhotoText: { 
    color: '#007AFF', 
    marginTop: 8, 
    fontWeight: '600',
    fontSize: 14,
  },
  
  // Sections
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 20, 
    marginBottom: 12, 
    color: '#333' 
  },
  row: { 
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // Switch Rows
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  switchSubtext: {
    fontSize: 12,
    color: '#666',
  },

  // Helper Box
  helperBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },

  // Footer
  footer: { 
    padding: 20, 
    borderTopWidth: 1, 
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  saveBtn: { 
    backgroundColor: '#007AFF', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  saveBtnDisabled: {
    backgroundColor: '#ccc',
  },
  saveText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});
