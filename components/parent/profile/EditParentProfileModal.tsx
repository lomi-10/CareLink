// components/profile/EditParentProfileModal.tsx

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import API_URL from '@/constants/api';

import { FormModalLayout, NotificationModal, LocationSearchInput, LocationResult } from '@/components/shared';
import LabeledInput from '@/components/shared/LabeledInput';
import { theme } from '@/constants/theme';

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

// NEW: Added Elderly type to match your database schema
type Elderly = {
  elderly_id?: number;
  age: string;
  gender: string;
  condition: string;
  care_level: string;
};

const isWeb = Platform.OS === 'web';

export default function EditProfileModal({ visible, onClose, onSaveSuccess }: EditProfileModalProps) {
  
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Profile fields
  const [contactNumber, setContactNumber] = useState('');
  const [province, setProvince] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [latitude,  setLatitude]  = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [bio, setBio] = useState('');
  const [landmark, setLandmark] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);
  
  // 2. Household fields
  const [householdSize, setHouseholdSize] = useState('');
  const [hasPets, setHasPets] = useState(false); 
  const [petDetails, setPetDetails] = useState('');
  
  // 3. Family Members Fields
  const [hasChildren, setHasChildren] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  
  const [hasElderly, setHasElderly] = useState(false);
  const [elderly, setElderly] = useState<Elderly[]>([]);

  // State flags
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // Modals for deletion
  const [deleteModal, setDeleteModal] = useState<{visible: boolean, type: 'child' | 'elderly' | null, index: number | null}>({
    visible: false, type: null, index: null
  });

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
      const data = await response.json();
      
      if (!data.success) throw new Error(data.message || 'Failed to load profile data');

      if (data.success) {
        if (data.profile) {
          const p = data.profile;
          setContactNumber(p.contact_number || '');
          setProvince(p.province || 'Leyte');
          setMunicipality(p.municipality || '');
          setBarangay(p.barangay || '');
          setLatitude(p.latitude  ? parseFloat(p.latitude)  : null);
          setLongitude(p.longitude ? parseFloat(p.longitude) : null);
          setBio(p.bio || '');
          setLandmark(p.landmark || '');
          if (p.profile_image) setProfileImage(p.profile_image);
        }
        
        if (data.household) {
          const h = data.household;
          setHouseholdSize(h.household_size ? String(h.household_size) : '');
          setHasChildren(h.has_children === true || h.has_children === 1);
          setHasElderly(h.has_elderly === true || h.has_elderly === 1);
          setHasPets(h.has_pets === true || h.has_pets === 1);
          setPetDetails(h.pet_details || '');
        }
        
        if (data.children && Array.isArray(data.children)) {
          setChildren(data.children.map((c: any) => ({
            child_id: c.child_id,
            age: String(c.age),
            gender: c.gender || 'Prefer not to say',
            special_needs: c.special_needs || ''
          })));
        }

        // NEW: Load Elderly data if your backend returns it
        if (data.elderly && Array.isArray(data.elderly)) {
          setElderly(data.elderly.map((e: any) => ({
            elderly_id: e.elderly_id,
            age: String(e.age),
            gender: e.gender || 'Prefer not to say',
            condition: e.condition || '',
            care_level: e.care_level || 'Independent'
          })));
        }
      }
    } catch (error: any) {
      showNotification(error.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generatedAddress = (() => {
    const parts = [];
    if (barangay.trim()) parts.push(barangay.trim());
    if (municipality.trim()) parts.push(municipality.trim());
    if (province.trim()) parts.push(province.trim());
    return parts.length > 0 ? parts.join(', ') : '';
  })();

  // Handlers for dynamic lists
  const addChild = () => setChildren([...children, { age: '', gender: 'Prefer not to say', special_needs: '' }]);
  const addElderly = () => setElderly([...elderly, { age: '', gender: 'Prefer not to say', condition: '', care_level: 'Independent' }]);
  
  const updateChild = (idx: number, field: keyof Child, val: string) => {
    const newArr = [...children];
    newArr[idx] = { ...newArr[idx], [field]: val };
    setChildren(newArr);
  };

  const updateElderly = (idx: number, field: keyof Elderly, val: string) => {
    const newArr = [...elderly];
    newArr[idx] = { ...newArr[idx], [field]: val };
    setElderly(newArr);
  };

  const confirmDelete = () => {
    if (deleteModal.index !== null) {
      if (deleteModal.type === 'child') {
        setChildren(children.filter((_, i) => i !== deleteModal.index));
      } else if (deleteModal.type === 'elderly') {
        setElderly(elderly.filter((_, i) => i !== deleteModal.index));
      }
    }
    setDeleteModal({ visible: false, type: null, index: null });
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return showNotification('Photo library permission is required to pick a profile photo', 'error');
    
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
    if (!contactNumber.trim()) return showNotification('Contact number is required.', 'error');
    if (!province.trim() || !municipality.trim() || !barangay.trim()) return showNotification('Province, municipality and barangay are required.', 'error');
    if (!bio.trim() || bio.trim().length < 15) return showNotification('Bio must be at least 15 characters.', 'error');
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId || '');
      formData.append('contact_number', contactNumber.trim());
      formData.append('province', province.trim());
      formData.append('municipality', municipality.trim());
      formData.append('barangay', barangay.trim());
      formData.append('bio', bio.trim());
      formData.append('landmark', landmark.trim());
      if (latitude  !== null) formData.append('latitude',  String(latitude));
      if (longitude !== null) formData.append('longitude', String(longitude));
      formData.append('household_size', householdSize || '0');
      
      formData.append('has_children', hasChildren ? '1' : '0');
      formData.append('has_elderly', hasElderly ? '1' : '0');
      formData.append('has_pets', hasPets ? '1' : '0');
      formData.append('pet_details', hasPets ? petDetails.trim() : '');
      
      const safeChildren = children.map(c => ({
        age: parseInt(c.age) || 0, gender: c.gender, special_needs: c.special_needs.trim() || null
      }));
      formData.append('children', JSON.stringify(safeChildren));

      const safeElderly = elderly.map(e => ({
        age: parseInt(e.age) || 0, gender: e.gender, condition: e.condition.trim() || null, care_level: e.care_level
      }));
      formData.append('elderly', JSON.stringify(safeElderly));

      if (profileImage && imageChanged && !profileImage.startsWith('http')) {
        if (Platform.OS === 'web') {
          const res = await fetch(profileImage);
          const blob = await res.blob();
          formData.append('profile_image', blob, 'profile.jpg');
        } else {
          const uriParts = profileImage.split('.');
          const fileType = uriParts[uriParts.length - 1];
          // @ts-ignore
          formData.append('profile_image', {
            uri: Platform.OS === 'android' ? profileImage : profileImage.replace('file://', ''),
            name: `profile.${fileType}`,
            type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
          });
        }
      }

      const response = await fetch(`${API_URL}/parent/update_profile.php`, {
        method: 'POST', body: formData,
      });

      const responseText = await response.text();
      let data: any;
      try { data = JSON.parse(responseText); } catch { throw new Error('Server returned an invalid response. Please try again.'); }

      if (data.success) {
        showNotification(data.message || 'Profile saved!', 'success');
        if (data.data?.profile_image) setProfileImage(data.data.profile_image);
        setTimeout(() => {
          onClose();
          if (onSaveSuccess) onSaveSuccess();
        }, 1500);
      } else {
        showNotification(data.message || 'Save failed', 'error');
      }

    } catch (error: any) {
      showNotification(`Error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper render components for cleaner code
  const renderGenderChips = (currentValue: string, onChange: (val: string) => void) => (
    <View style={styles.chipRow}>
      {['Male', 'Female', 'Prefer not to say'].map((g) => (
        <TouchableOpacity key={g} onPress={() => onChange(g)}
          style={[styles.chip, currentValue === g && styles.chipActive]}
        >
          <Text style={[styles.chipText, currentValue === g && styles.chipTextActive]}>{g}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <>
      <FormModalLayout
        visible={visible}
        onClose={onClose}
        title="Edit Profile"
        subtitle="Tell families and helpers about your household"
        accent="parent"
        variant="wide"
        loading={loading}
        loadingText="Loading profile..."
        scrollContentStyle={[styles.content, isWeb && styles.contentWeb]}
        footer={
          !loading ? (
            <TouchableOpacity
              style={[styles.saveBtn, (saving || loading) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || loading}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save Profile</Text>}
            </TouchableOpacity>
          ) : null
        }
      >
        {!loading && (
              <>
                
                {/* SECTION 1: Basic Info */}
                <View style={styles.card}>
                  <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                      <View style={styles.placeholderAvatar}><Ionicons name="camera" size={40} color="#999" /></View>
                    )}
                    <Text style={styles.changePhotoText}>{profileImage ? 'Change Photo' : 'Upload Photo'}</Text>
                  </TouchableOpacity>

                  <LabeledInput label="About Your Household (Bio)" value={bio} onChangeText={setBio} multiline numberOfLines={3} placeholder='Short intro about your family...' />
                  <LabeledInput label="Contact Number" required value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
                </View>

                {/* SECTION 2: Location */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Location & Address</Text>

                  {/* Search-based location picker */}
                  <LocationSearchInput
                    province={province}
                    municipality={municipality}
                    barangay={barangay}
                    onSelect={(result: LocationResult) => {
                      setProvince(result.province);
                      setMunicipality(result.municipality);
                      setBarangay(result.barangay);
                      setLatitude(result.latitude);
                      setLongitude(result.longitude);
                    }}
                    accentColor={theme.color.parent}
                    label="Search Location"
                  />

                  {/* Manual override fields */}
                  <View style={isWeb ? styles.webRow : undefined}>
                    <View style={isWeb ? { flex: 1, paddingRight: 12 } : undefined}>
                      <LabeledInput label="Province" required value={province} onChangeText={v => { setProvince(v); setLatitude(null); setLongitude(null); }} />
                    </View>
                    <View style={isWeb ? { flex: 1, paddingRight: 12 } : styles.row}>
                      <View style={{ flex: 1 }}><LabeledInput label="Municipality" required value={municipality} onChangeText={v => { setMunicipality(v); setLatitude(null); setLongitude(null); }} /></View>
                      {!isWeb && <View style={{ width: 12 }} />}
                      <View style={{ flex: 1, marginLeft: isWeb ? 12 : 0 }}><LabeledInput label="Barangay" required value={barangay} onChangeText={v => { setBarangay(v); setLatitude(null); setLongitude(null); }} /></View>
                    </View>
                  </View>

                  {generatedAddress && (
                    <View style={styles.addressPreview}>
                      <Ionicons name="location" size={16} color="#1976D2" />
                      <Text style={styles.previewText}>{generatedAddress}</Text>
                    </View>
                  )}
                  <LabeledInput label="Landmark (Optional)" value={landmark} onChangeText={setLandmark} placeholder="e.g., Near SM City" />
                </View>

                {/* SECTION 3: Household Composition */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Household Details</Text>
                  <LabeledInput label="Total Household Size" value={householdSize} onChangeText={setHouseholdSize} keyboardType="numeric" placeholder="e.g., 4" />

                  {/* Pets Toggle */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Do you have pets?</Text>
                      <Text style={styles.toggleDesc}>Dogs, cats, or others</Text>
                    </View>
                    <Switch value={hasPets} onValueChange={setHasPets} />
                  </View>
                  {hasPets && (
                    <View style={styles.subForm}>
                      <LabeledInput label="Pet Details" value={petDetails} onChangeText={setPetDetails} placeholder="e.g., 1 Friendly Golden Retriever" />
                    </View>
                  )}

                  {/* Children Toggle */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Do you have children?</Text>
                      <Text style={styles.toggleDesc}>Ages 0-18</Text>
                    </View>
                    <Switch value={hasChildren} onValueChange={(val) => { setHasChildren(val); if(val && children.length===0) addChild(); }} />
                  </View>
                  {hasChildren && (
                    <View style={styles.subForm}>
                      {children.map((child, index) => (
                        <View key={index} style={styles.memberCard}>
                          <View style={styles.memberHeader}>
                            <Text style={styles.memberTitle}>Child {index + 1}</Text>
                            <TouchableOpacity onPress={() => setDeleteModal({visible: true, type: 'child', index})}><Ionicons name="trash-outline" size={20} color="#dc3545" /></TouchableOpacity>
                          </View>
                          <LabeledInput label="Age" required value={child.age} onChangeText={(val) => updateChild(index, 'age', val)} keyboardType="numeric" />
                          <Text style={styles.inputLabel}>Gender <Text style={styles.reqStar}>*</Text></Text>
                          {renderGenderChips(child.gender, (val) => updateChild(index, 'gender', val))}
                          <LabeledInput label="Special Needs (Optional)" value={child.special_needs} onChangeText={(val) => updateChild(index, 'special_needs', val)} placeholder="e.g., Autism, Allergies" />
                        </View>
                      ))}
                      <TouchableOpacity onPress={addChild} style={styles.addMemberBtn}>
                        <Ionicons name="add" size={20} color="#007AFF" />
                        <Text style={styles.addMemberText}>Add Another Child</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Elderly Toggle */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleInfo}>
                      <Text style={styles.toggleTitle}>Elderly Members?</Text>
                      <Text style={styles.toggleDesc}>Seniors requiring care/attention</Text>
                    </View>
                    <Switch value={hasElderly} onValueChange={(val) => { setHasElderly(val); if(val && elderly.length===0) addElderly(); }} />
                  </View>
                  {hasElderly && (
                    <View style={styles.subForm}>
                      {elderly.map((senior, index) => (
                        <View key={index} style={styles.memberCard}>
                          <View style={styles.memberHeader}>
                            <Text style={styles.memberTitle}>Elderly Member {index + 1}</Text>
                            <TouchableOpacity onPress={() => setDeleteModal({visible: true, type: 'elderly', index})}><Ionicons name="trash-outline" size={20} color="#dc3545" /></TouchableOpacity>
                          </View>
                          <LabeledInput label="Age" required value={senior.age} onChangeText={(val) => updateElderly(index, 'age', val)} keyboardType="numeric" />
                          <Text style={styles.inputLabel}>Gender <Text style={styles.reqStar}>*</Text></Text>
                          {renderGenderChips(senior.gender, (val) => updateElderly(index, 'gender', val))}
                          
                          <Text style={styles.inputLabel}>Care Level <Text style={styles.reqStar}>*</Text></Text>
                          <View style={styles.chipRow}>
                            {['Independent', 'Needs Assistance', 'Fully Dependent'].map((level) => (
                              <TouchableOpacity key={level} onPress={() => updateElderly(index, 'care_level', level)}
                                style={[styles.chip, senior.care_level === level && styles.chipActive]}
                              >
                                <Text style={[styles.chipText, senior.care_level === level && styles.chipTextActive]}>{level}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <LabeledInput label="Medical Conditions (Optional)" value={senior.condition} onChangeText={(val) => updateElderly(index, 'condition', val)} placeholder="e.g., Diabetic, Bedridden" />
                        </View>
                      ))}
                      <TouchableOpacity onPress={addElderly} style={styles.addMemberBtn}>
                        <Ionicons name="add" size={20} color="#007AFF" />
                        <Text style={styles.addMemberText}>Add Another Senior</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                </View>
              </>
            )}
      </FormModalLayout>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteModal.visible} transparent animationType="fade" onRequestClose={() => setDeleteModal({visible: false, type: null, index: null})}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Ionicons name="warning" size={48} color="#dc3545" style={{ marginBottom: 16 }} />
            <Text style={styles.confirmTitle}>Remove Member?</Text>
            <Text style={styles.confirmMessage}>Are you sure you want to remove this family member? This cannot be undone.</Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModal({visible: false, type: null, index: null})}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal visible={notifVisible} message={notifMessage} type={notifType} onClose={() => setNotifVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  // --- RESPONSIVE WEB WRAPPERS ---
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark transparent background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webContainer: {
    width: '100%',
    maxWidth: 900, // Wide, beautiful desktop layout
    maxHeight: '95%',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },

  // --- Standard Styles ---
  container: { flex: 1, backgroundColor: '#F2F2F7', marginTop: Platform.OS === 'ios' ? 0 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E5EA', paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  headerWeb: { paddingTop: 20 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  closeBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  content: { padding: 16, paddingBottom: 40 },
  contentWeb: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  row: { flexDirection: 'row' },
  
  imageContainer: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#007AFF' },
  placeholderAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#D1D1D6', borderStyle: 'dashed' },
  changePhotoText: { color: '#007AFF', marginTop: 12, fontWeight: '600', fontSize: 15 },

  addressPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, marginTop: -4, marginBottom: 16, gap: 8 },
  previewText: { fontSize: 14, color: '#1976D2', fontWeight: '500', flex: 1 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderColor: '#E5E5EA' },
  toggleInfo: { flex: 1, paddingRight: 16 },
  toggleTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
  toggleDesc: { fontSize: 13, color: '#8E8E93' },

  subForm: { backgroundColor: '#F8F9FA', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  memberCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#D1D1D6' },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderColor: '#E5E5EA', paddingBottom: 8 },
  memberTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6, backgroundColor: '#E3F2FD', borderRadius: 8 },
  addMemberText: { color: '#007AFF', fontWeight: '600', fontSize: 15 },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 4 },
  reqStar: { color: '#FF3B30', fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: '#E5E5EA' },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { fontSize: 13, color: '#3A3A3C', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#E5E5EA' },
  footerWeb: { maxWidth: 600, alignSelf: 'center', width: '100%' },
  saveBtn: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#A1C6EA' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmModalContainer: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  confirmMessage: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  confirmBtnRow: { flexDirection: 'row', width: '100%', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#F2F2F7', alignItems: 'center' },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#dc3545', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: '#3A3A3C' },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});