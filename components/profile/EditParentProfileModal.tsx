// components/profile/EditParentProfileModal.tsx 
import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator, KeyboardAvoidingView, Switch,
  TextInput
  // Alert removed
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

type Child = {
  child_id?: number;
  age: string;
  gender: string;
  special_needs: string;
};

export default function EditProfileModal({ visible, onClose, onSaveSuccess }: EditProfileModalProps) {
  
  // STATE 
  const [userId, setUserId] = useState<string | null>(null);

  // Profile fields
  const [contactNumber, setContactNumber] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [bio, setBio] = useState('');
  const [landmark, setLandmark] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  
  // Household fields
  const [householdSize, setHouseholdSize] = useState('');
  const [hasElderly, setHasElderly] = useState(false);
  const [hasPets, setHasPets] = useState(false); 
  const [petDetails, setPetDetails] = useState('');
  
  // Children Fields
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // State for the custom Delete Confirmation Modal
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [childToDeleteIndex, setChildToDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
      setImageChanged(false);
    }
  }, [visible]);

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotifMessage(msg);
    setNotifType(type);
    setNotifVisible(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('No user data found');
      
      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);
      
      const response = await fetch(`${API_URL}/parent/get_profile.php?user_id=${parsed.user_id}`);
      const text = await response.text();
      let data = JSON.parse(text);
      
      if (data.success) {
        if (data.profile) {
          const p = data.profile;
          setContactNumber(p.contact_number || '');
          setProvince(p.province || 'Cebu');
          setMunicipality(p.municipality || '');
          setBarangay(p.barangay || '');
          setBio(p.bio || '');
          setLandmark(p.landmark || '');
          if (p.profile_image) setProfileImage(p.profile_image);
        }
        
        if (data.household) {
          const h = data.household;
          setHouseholdSize(h.household_size ? String(h.household_size) : '');
          setHasElderly(h.has_elderly === true || h.has_elderly === 1);
          setHasPets(h.has_pets === true || h.has_pets === 1);
          setPetDetails(h.pet_details || '');
        }
        
        if (data.children && Array.isArray(data.children)) {
          const loadedChildren: Child[] = data.children.map((c: any) => ({
            child_id: c.child_id,
            age: String(c.age),
            gender: c.gender || 'Prefer not to say',
            special_needs: c.special_needs || ''
          }));
          setChildren(loadedChildren);
        }
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addChild = () => {
    setChildren([...children, { age: '', gender: 'Prefer not to say', special_needs: '' }]);
  };

  // REPLACED Alert.alert with Modal-based logic
  const requestRemoveChild = (index: number) => {
    setChildToDeleteIndex(index);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (childToDeleteIndex !== null) {
      const newChildren = children.filter((_, i) => i !== childToDeleteIndex);
      setChildren(newChildren);
      setDeleteModalOpen(false);
      setChildToDeleteIndex(null);
    }
  };

  const updateChild = (index: number, field: keyof Child, value: string) => {
    const newChildren = [...children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setChildren(newChildren);
  };

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
      setImageChanged(true);
    }
  };

  const handleSave = async () => {
    if (!contactNumber.trim()) return showNotification('Contact number is required', 'error');
    if (!province.trim() || !municipality.trim() || !barangay.trim()) {
      return showNotification('Address fields are required', 'error');
    }
    
    setSaving(true);
    try {
      console.log('💾 Saving parent profile...');

      const formData = new FormData();
      formData.append('user_id', userId || '');
      formData.append('contact_number', contactNumber.trim());
      formData.append('province', province.trim());
      formData.append('municipality', municipality.trim());
      formData.append('barangay', barangay.trim());
      formData.append('bio', bio.trim());
      formData.append('landmark', landmark.trim());
      formData.append('household_size', householdSize || '0');
      formData.append('has_elderly', hasElderly ? '1' : '0');
      formData.append('has_pets', hasPets ? '1' : '0');
      formData.append('pet_details', petDetails.trim());
      
      const childrenData = children.map(c => ({
        age: parseInt(c.age) || 0,
        gender: c.gender,
        special_needs: c.special_needs.trim() || null
      }));
      formData.append('children', JSON.stringify(childrenData));

      // ============================================================
      // 2. FIXED IMAGE UPLOAD LOGIC (WEB COMPATIBLE)
      // ============================================================
      if (profileImage && imageChanged && !profileImage.startsWith('http')) {
        
        if (Platform.OS === 'web') {
          // --- WEB LOGIC ---
          // On web, the URI is a blob URL. We must fetch it to get the raw Blob data.
          const res = await fetch(profileImage);
          const blob = await res.blob();
          
          // Append the actual binary file
          formData.append('profile_image', blob, 'profile.jpg');
          
        } else {
          // --- MOBILE LOGIC (Android/iOS) ---
          const uriParts = profileImage.split('.');
          const fileType = uriParts[uriParts.length - 1];
          const fileName = profileImage.split('/').pop() || `profile.${fileType}`;

          // Mobile accepts this object format
          // @ts-ignore
          formData.append('profile_image', {
            uri: Platform.OS === 'android' ? profileImage : profileImage.replace('file://', ''),
            name: fileName,
            type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
          });
        }
      }
      // ============================================================

      console.log('🌐 Sending request...');
      
      // Important: Do not set Content-Type header manually
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
        console.error("Response was: ", responseText);
        throw new Error(`Server error: ${responseText.substring(0, 100)}`);
      }

      if (data.success) {
        showNotification(data.message || 'Profile saved!', 'success');
        
        // Update the local image state if the server returned the new URL
        if (data.data && data.data.profile_image) {
           setProfileImage(data.data.profile_image);
        }
        
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
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              
              <TouchableOpacity onPress={pickImage} style={styles.imageBtn}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.placeholderAvatar}><Ionicons name="camera" size={40} color="#999" /></View>
                )}
                <Text style={styles.changePhotoText}>{profileImage ? 'Change Photo' : 'Add Photo'}</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Bio</Text>
              <LabeledInput
                label="About Your Household *"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                placeholder='Tell service-helpers about your household...'
              />

              <Text style={styles.sectionTitle}>Contact Information</Text>
              <LabeledInput 
                label="Contact Number *" 
                value={contactNumber} 
                onChangeText={setContactNumber} 
                keyboardType="phone-pad" 
              />

              <Text style={styles.sectionTitle}>Address</Text>
              <LabeledInput label="Province *" value={province} onChangeText={setProvince} />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><LabeledInput label="Municipality *" value={municipality} onChangeText={setMunicipality} /></View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}><LabeledInput label="Barangay *" value={barangay} onChangeText={setBarangay} /></View>
              </View>

              <Text style={styles.sectionTitle}>Household Information</Text>
              <LabeledInput label="Household Size" value={householdSize} onChangeText={setHouseholdSize} keyboardType="numeric" />

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}><Text style={styles.switchLabel}>Elderly members?</Text></View>
                <Switch value={hasElderly} onValueChange={setHasElderly} />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}><Text style={styles.switchLabel}>Do you have pets?</Text></View>
                <Switch value={hasPets} onValueChange={setHasPets} />
              </View>

              <View style={styles.childrenSection}>
                <View style={styles.childrenHeader}>
                  <Text style={styles.sectionTitle}>Children ({children.length})</Text>
                  <TouchableOpacity onPress={addChild} style={styles.addChildBtn}>
                    <Ionicons name="add-circle" size={24} color="#007AFF" /><Text style={styles.addChildText}>Add Child</Text>
                  </TouchableOpacity>
                </View>

                {children.map((child, index) => (
                  <View key={index} style={styles.childCard}>
                    <View style={styles.childCardHeader}>
                      <Text style={styles.childCardTitle}>Child {index + 1}</Text>
                      {/* Changed from removeChild to requestRemoveChild */}
                      <TouchableOpacity onPress={() => requestRemoveChild(index)}>
                        <Ionicons name="trash-outline" size={20} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                    <LabeledInput label="Age *" value={child.age} onChangeText={(val) => updateChild(index, 'age', val)} keyboardType="numeric" />
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <TouchableOpacity 
              style={[styles.saveBtn, (saving || loading) && styles.saveBtnDisabled]} 
              onPress={handleSave} 
              disabled={saving || loading}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* --- CUSTOM DELETE CONFIRMATION MODAL --- */}
      <Modal
        visible={isDeleteModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="alert-circle" size={40} color="#dc3545" />
            </View>
            
            <Text style={styles.confirmTitle}>Remove Child?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to remove this child from your profile? This cannot be undone.
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setDeleteModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteBtn} 
                onPress={confirmDelete}
              >
                <Text style={styles.deleteBtnText}>Yes, Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  container: { flex: 1, backgroundColor: '#fff', marginTop: Platform.OS === 'ios' ? 0 : 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20, 
    borderBottomWidth: 1, 
    borderColor: '#eee',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },
  
  // Image
  imageBtn: { alignSelf: 'center', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#007AFF' },
  placeholderAvatar: { 
    width: 110, height: 110, borderRadius: 55, backgroundColor: '#f0f0f0', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ddd' 
  },
  changePhotoText: { color: '#007AFF', marginTop: 8, fontWeight: '600', fontSize: 14 },
  
  // Sections
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 12, color: '#333' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },

  // Address Preview
  addressPreview: { backgroundColor: '#E3F2FD', padding: 14, borderRadius: 10, marginTop: 10, marginBottom: 10 },
  previewLabel: { fontSize: 12, fontWeight: '600', color: '#1976D2', marginBottom: 4 },
  previewText: { fontSize: 14, color: '#1976D2', fontWeight: '500' },

  // Switch Rows
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, marginBottom: 12
  },
  switchInfo: { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  switchSubtext: { fontSize: 12, color: '#666' },

  // Children Section
  childrenSection: { marginTop: 10 },
  childrenHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 
  },
  addChildBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addChildText: { color: '#007AFF', fontWeight: '600', fontSize: 14 },
  
  noChildrenBox: {
    backgroundColor: '#F8F9FA', padding: 40, borderRadius: 12, alignItems: 'center'
  },
  noChildrenText: { fontSize: 16, color: '#666', fontWeight: '600', marginTop: 12 },
  noChildrenSubtext: { fontSize: 13, color: '#999', marginTop: 4 },

  // Child Card
  childCard: {
    backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#E0E0E0'
  },
  childCardHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 
  },
  childCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },

  // Gender Selection
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  genderRow: { flexDirection: 'row', gap: 6 },
  genderChip: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', alignItems: 'center'
  },
  genderChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  genderChipText: { fontSize: 12, color: '#666', fontWeight: '500' },
  genderChipTextActive: { color: '#fff', fontWeight: '600' },

  // Footer
  footer: { padding: 20, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
  saveBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#ccc' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffebee', // light red
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#dc3545', // red
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
