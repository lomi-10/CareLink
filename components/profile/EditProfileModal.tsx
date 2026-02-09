// components/profile/EditProfileModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator, KeyboardAvoidingView 
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
  
  // STATE - Matches helper_profiles table structure EXACTLY
  const [userId, setUserId] = useState<string | null>(null);
  
  // Required fields (NOT NULL in database)
  const [contactNumber, setContactNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [address, setAddress] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  
  // Optional fields
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [civilStatus, setCivilStatus] = useState<string>('Single');
  const [bio, setBio] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState('Tagalog,English');
  const [educationLevel, setEducationLevel] = useState<string>('High School Grad');
  const [experienceYears, setExperienceYears] = useState('0');
  const [workTypePreference, setWorkTypePreference] = useState<string>('Both');
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('Available');
  const [expectedSalaryMin, setExpectedSalaryMin] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState<string>('Monthly');

  // Skills (from helper_skills table)
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
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
      console.log('📥 Loading profile data...');
      
      // 1. Fetch reference skills
      const refResponse = await fetch(`${API_URL}/helper/get_ref_skills.php`);
      const refText = await refResponse.text();
      
      let refResult;
      try {
        refResult = JSON.parse(refText);
      } catch (e) {
        console.error('Failed to parse skills JSON:', e);
        throw new Error('Invalid skills data from server');
      }
      
      const refs = refResult.success ? refResult.data : [];
      setAvailableSkills(refs);
      console.log('✅ Loaded skills:', refs.length);

      // 2. Fetch user profile
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        throw new Error('No user data found');
      }
      
      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);
      
      const profResponse = await fetch(`${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`);
      const profText = await profResponse.text();
      
      let profData;
      try {
        profData = JSON.parse(profText);
      } catch (e) {
        console.error('Failed to parse profile JSON:', e);
        throw new Error('Invalid profile data from server');
      }
      
      if (profData.success && profData.profile) {
        const p = profData.profile;
        
        // Populate all fields matching database structure
        setContactNumber(p.contact_number || '');
        setBirthDate(p.birth_date || '');
        setGender(p.gender || 'Female');
        setAddress(p.address || '');
        setMunicipality(p.municipality || '');
        setBarangay(p.barangay || '');
        
        setProfileImage(p.profile_image || null);
        setCivilStatus(p.civil_status || 'Single');
        setBio(p.bio || '');
        setLanguagesSpoken(p.languages_spoken || 'Tagalog, English');
        setEducationLevel(p.education_level || 'High School Grad');
        setExperienceYears(p.experience_years ? String(p.experience_years) : '0');
        setWorkTypePreference(p.work_type_preference || 'Both');
        setAvailabilityStatus(p.availability_status || 'Available');
        setExpectedSalaryMin(p.expected_salary_min ? String(p.expected_salary_min) : '');
        setSalaryPeriod(p.salary_period || 'Monthly');
        
        // Populate selected skills
        if (profData.skills && Array.isArray(profData.skills)) {
          const userSkillNames = profData.skills.map((s: any) => s.skill_name);
          const refNames = refs.map((r: any) => r.skill_name);
          setSelectedSkills(userSkillNames.filter((name: string) => refNames.includes(name)));
        }
        
        console.log('✅ Profile data loaded');
      }
    } catch (error: any) {
      console.error('❌ Load error:', error);
      showNotification(error.message || 'Failed to load data', 'error');
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

  const toggleSkill = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
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
    
    if (!expectedSalaryMin || parseFloat(expectedSalaryMin) <= 0) {
      return showNotification('Valid salary is required', 'error');
    }
    
    if (selectedSkills.length === 0) {
      return showNotification('Select at least one skill', 'error');
    }
    
    setSaving(true);
    try {
      console.log('💾 Saving profile...');
      
      const formData = new FormData();
      formData.append('user_id', userId || '');
      
      // All fields matching helper_profiles table structure
      formData.append('contact_number', contactNumber.trim());
      formData.append('birth_date', birthDate);
      formData.append('gender', gender);
      formData.append('address', address.trim());
      formData.append('municipality', municipality.trim());
      formData.append('barangay', barangay.trim());
      
      formData.append('civil_status', civilStatus);
      formData.append('bio', bio.trim());
      formData.append('languages_spoken', languagesSpoken);
      formData.append('education_level', educationLevel);
      formData.append('experience_years', experienceYears);
      formData.append('work_type_preference', workTypePreference);
      formData.append('availability_status', availabilityStatus);
      formData.append('expected_salary_min', expectedSalaryMin);
      formData.append('salary_period', salaryPeriod);

      // Skills as JSON array
      formData.append('skills', JSON.stringify(selectedSkills));

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
      
      const response = await fetch(`${API_URL}/helper/update_profile.php`, {
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

  // ============================================================================
  // HELPER: Group skills by category
  // ============================================================================
  const groupedSkills = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    availableSkills.forEach(skill => {
      const cat = skill.category_name || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(skill);
    });
    return groups;
  }, [availableSkills]);

  // Constants for enums
  const genderOptions = ['Male', 'Female'];
  const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated'];
  const educationOptions = [
    'Elementary',
    'High School Undergrad',
    'High School Grad',
    'College Undergrad',
    'College Grad',
    'Vocational'
  ];
  const workTypeOptions = ['Live-in', 'Live-out', 'Both'];
  const availabilityOptions = ['Available', 'Employed', 'Not Available'];
  const salaryPeriodOptions = ['Daily', 'Monthly'];

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

              {/* Personal Information */}
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <LabeledInput 
                label="Contact Number *" 
                value={contactNumber} 
                onChangeText={setContactNumber} 
                keyboardType="phone-pad"
                placeholder="09XX XXX XXXX"
                required
              />
              
              <LabeledInput 
                label="Birth Date (YYYY-MM-DD) *" 
                value={birthDate} 
                onChangeText={setBirthDate} 
                placeholder="2000-01-01"
                required
              />
              
              <Text style={styles.label}>Gender *</Text>
              <View style={styles.chipRow}>
                {genderOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setGender(opt as 'Male' | 'Female')} 
                    style={[styles.chip, gender === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, gender === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Civil Status</Text>
              <View style={styles.chipRow}>
                {civilStatusOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setCivilStatus(opt)} 
                    style={[styles.chip, civilStatus === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, civilStatus === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Address */}
              <Text style={styles.sectionTitle}>Address</Text>
              
              <LabeledInput 
                label="Full Address *" 
                value={address} 
                onChangeText={setAddress} 
                placeholder="Street, Block, Lot..."
                multiline
                numberOfLines={2}
                required
              />
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Municipality *" 
                    value={municipality} 
                    onChangeText={setMunicipality}
                    placeholder="City/Municipality"
                    required
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Barangay *" 
                    value={barangay} 
                    onChangeText={setBarangay}
                    placeholder="Barangay"
                    required
                  />
                </View>
              </View>

              {/* Work Preferences */}
              <Text style={styles.sectionTitle}>Work Preferences</Text>
              
              <LabeledInput 
                label="Bio / About Me" 
                value={bio} 
                onChangeText={setBio} 
                multiline 
                numberOfLines={4} 
                placeholder="Tell employers about yourself..."
              />

              <LabeledInput 
                label="Languages Spoken" 
                value={languagesSpoken} 
                onChangeText={setLanguagesSpoken} 
                placeholder="Tagalog,English,Cebuano"
              />
              
              <Text style={styles.label}>Education Level</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {educationOptions.map(opt => (
                    <TouchableOpacity 
                      key={opt} 
                      onPress={() => setEducationLevel(opt)} 
                      style={[styles.chip, educationLevel === opt && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, educationLevel === opt && styles.chipTextActive]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Years of Experience" 
                    value={experienceYears} 
                    onChangeText={setExperienceYears} 
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Expected Salary *" 
                    value={expectedSalaryMin} 
                    onChangeText={setExpectedSalaryMin} 
                    keyboardType="numeric"
                    placeholder="8000"
                    required
                  />
                </View>
              </View>

              <Text style={styles.label}>Salary Period</Text>
              <View style={styles.chipRow}>
                {salaryPeriodOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setSalaryPeriod(opt)} 
                    style={[styles.chip, salaryPeriod === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, salaryPeriod === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Work Type Preference</Text>
              <View style={styles.chipRow}>
                {workTypeOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setWorkTypePreference(opt)} 
                    style={[styles.chip, workTypePreference === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, workTypePreference === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Availability Status</Text>
              <View style={styles.chipRow}>
                {availabilityOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setAvailabilityStatus(opt)} 
                    style={[styles.chip, availabilityStatus === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, availabilityStatus === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              {/* Skills */}
              <Text style={styles.sectionTitle}>Skills & Specialties</Text>
              <Text style={styles.helperText}>Select at least one skill you are good at.</Text>
              
              {Object.keys(groupedSkills).map(category => (
                <View key={category} style={{ marginBottom: 15 }}>
                  <Text style={styles.catTitle}>{category}</Text>
                  <View style={styles.chipRow}>
                    {groupedSkills[category].map((skill: any) => {
                      const isActive = selectedSkills.includes(skill.skill_name);
                      return (
                        <TouchableOpacity 
                          key={skill.skill_id} 
                          onPress={() => toggleSkill(skill.skill_name)} 
                          style={[styles.skillChip, isActive && styles.skillActive]}
                        >
                          <Text style={[styles.skillText, isActive && styles.skillTextActive]}>
                            {skill.skill_name}
                          </Text>
                          {isActive && (
                            <Ionicons name="checkmark-circle" size={16} color="#007AFF" style={{ marginLeft: 4 }} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

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
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 8, 
    marginTop: 12 
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  row: { 
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  divider: { 
    height: 1, 
    backgroundColor: '#eee', 
    marginVertical: 24 
  },
  
  // Chips
  chipRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8,
    marginBottom: 8,
  },
  chip: { 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    backgroundColor: '#fff' 
  },
  chipActive: { 
    backgroundColor: '#007AFF', 
    borderColor: '#007AFF' 
  },
  chipText: { 
    color: '#333', 
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextActive: { 
    color: '#fff', 
    fontWeight: '600' 
  },

  // Skills
  catTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#888', 
    marginBottom: 8, 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  skillChip: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 10, 
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  skillActive: { 
    backgroundColor: '#E3F2FD', 
    borderColor: '#007AFF' 
  },
  skillText: { 
    color: '#444',
    fontSize: 14,
  },
  skillTextActive: { 
    color: '#007AFF', 
    fontWeight: '600' 
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
