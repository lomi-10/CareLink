// components/profile/EditParentProfileModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator, Switch 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API_URL from '../../constants/api';

import LabeledInput from '../common/LabeledInput';
import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface EditParentProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function EditParentProfileModal({ 
  visible, 
  onClose, 
  onSaveSuccess 
}: EditParentProfileModalProps) {
  
  // --- STATE ---
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [householdSize, setHouseholdSize] = useState('');
  const [hasChildren, setHasChildren] = useState(false);
  const [childrenAges, setChildrenAges] = useState('');
  const [hasElderly, setHasElderly] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // --- LOAD DATA ---
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserId(parsed.user_id);
        await fetchProfileData(parsed.user_id);
      }
    } catch (error) {
      console.error("Failed to load user data", error);
    }
  };

  const fetchProfileData = async (uid: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/parent/get_profile.php?user_id=${uid}`);
      const data = await response.json();
      
      if (data.success && data.profile) {
        const p = data.profile;
        setAddress(p.address || '');
        setMunicipality(p.municipality || '');
        setBarangay(p.barangay || '');
        setHouseholdSize(p.household_size?.toString() || '');
        setHasChildren(p.has_children === 1);
        setChildrenAges(p.children_ages || '');
        setHasElderly(p.has_elderly === 1);
        setHasPets(p.has_pets === 1);
        setPetDetails(p.pet_details || '');
        setProfileImage(p.profile_image || null);
      }
    } catch (error) {
      console.error("Failed to fetch profile", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!address.trim() || !municipality.trim() || !barangay.trim()) {
      setNotifMessage("Please fill in all required fields.");
      setNotifType('error');
      setNotifVisible(true);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/parent/update_profile.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          profile_image: profileImage,
          address,
          municipality,
          barangay,
          household_size: householdSize,
          has_children: hasChildren ? 1 : 0,
          children_ages: childrenAges,
          has_elderly: hasElderly ? 1 : 0,
          has_pets: hasPets ? 1 : 0,
          pet_details: petDetails
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setNotifMessage("Profile updated successfully!");
        setNotifType('success');
        setNotifVisible(true);
        
        if (onSaveSuccess) {
          setTimeout(() => onSaveSuccess(), 500);
        }
      } else {
        setNotifMessage(data.message || "Failed to update profile");
        setNotifType('error');
        setNotifVisible(true);
      }
    } catch (error) {
      console.error("Save error:", error);
      setNotifMessage("Network error. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseNotification = () => {
    setNotifVisible(false);
    if (notifType === 'success') {
      onClose();
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={onClose} disabled={saving}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              
              {/* PROFILE PICTURE */}
              <View style={styles.centerUpload}>
                <TouchableOpacity onPress={pickImage} style={styles.uploadCircle} disabled={saving}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.imagePreview} />
                  ) : (
                    <Ionicons name="camera-outline" size={40} color="#007AFF" />
                  )}
                </TouchableOpacity>
                <Text style={styles.uploadLabel}>Change Profile Photo</Text>
              </View>

              {/* ADDRESS */}
              <LabeledInput 
                label="Complete Address" 
                value={address} 
                onChangeText={setAddress} 
                placeholder="e.g. 123 Main St., Barangay ABC"
                required={true}
                editable={!saving}
                multiline={true}
                numberOfLines={2}
              />

              {/* MUNICIPALITY */}
              <LabeledInput 
                label="Municipality/City" 
                value={municipality} 
                onChangeText={setMunicipality} 
                placeholder="e.g. Ormoc City"
                required={true}
                editable={!saving}
              />

              {/* BARANGAY */}
              <LabeledInput 
                label="Barangay" 
                value={barangay} 
                onChangeText={setBarangay} 
                placeholder="e.g. Barangay Guadalupe"
                required={true}
                editable={!saving}
              />

              {/* HOUSEHOLD SIZE */}
              <LabeledInput 
                label="Household Size" 
                value={householdSize} 
                onChangeText={setHouseholdSize} 
                placeholder="Number of household members"
                keyboardType="numeric"
                editable={!saving}
              />

              {/* HAS CHILDREN */}
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Ionicons name="happy-outline" size={20} color="#007AFF" />
                  <Text style={styles.switchText}>Do you have children?</Text>
                </View>
                <Switch 
                  value={hasChildren} 
                  onValueChange={setHasChildren}
                  disabled={saving}
                  trackColor={{ false: "#ccc", true: "#007AFF" }}
                />
              </View>

              {/* CHILDREN AGES (if has children) */}
              {hasChildren && (
                <LabeledInput 
                  label="Children's Ages" 
                  value={childrenAges} 
                  onChangeText={setChildrenAges} 
                  placeholder="e.g. 3, 5, 8"
                  editable={!saving}
                />
              )}

              {/* HAS ELDERLY */}
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Ionicons name="people-outline" size={20} color="#007AFF" />
                  <Text style={styles.switchText}>Elderly members in household?</Text>
                </View>
                <Switch 
                  value={hasElderly} 
                  onValueChange={setHasElderly}
                  disabled={saving}
                  trackColor={{ false: "#ccc", true: "#007AFF" }}
                />
              </View>

              {/* HAS PETS */}
              <View style={styles.switchRow}>
                <View style={styles.switchLabel}>
                  <Ionicons name="paw-outline" size={20} color="#007AFF" />
                  <Text style={styles.switchText}>Do you have pets?</Text>
                </View>
                <Switch 
                  value={hasPets} 
                  onValueChange={setHasPets}
                  disabled={saving}
                  trackColor={{ false: "#ccc", true: "#007AFF" }}
                />
              </View>

              {/* PET DETAILS (if has pets) */}
              {hasPets && (
                <LabeledInput 
                  label="Pet Details" 
                  value={petDetails} 
                  onChangeText={setPetDetails} 
                  placeholder="e.g. 1 dog, 2 cats"
                  editable={!saving}
                />
              )}

              <View style={{height: 40}} />
            </ScrollView>

            {/* FOOTER */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      <LoadingSpinner visible={saving} message="Saving your profile..." />

      <NotificationModal 
        visible={notifVisible}
        message={notifMessage}
        type={notifType}
        onClose={handleCloseNotification}
      />
    </>
  );
}
    // --- STYLES ---
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: Platform.OS === 'web' ? 600 : '100%',
    height: Platform.OS === 'web' ? '90%' : '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...(Platform.OS === 'web' && { borderRadius: 16, marginBottom: '2%' }),
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    padding: 20,
  },
  centerUpload: {
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  uploadLabel: {
    color: '#007AFF',
    marginTop: 8,
    fontSize: 14,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#ccc',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});