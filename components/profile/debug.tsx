// components/profile/EditHelperProfileModal.tsx
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

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function EditHelperProfileModal({ visible, onClose, onSaveSuccess }: EditProfileModalProps) {
  
  // ============================================================================
  // STATE - Matches helper_profiles table exactly
  // ============================================================================
  const [userId, setUserId] = useState<string | null>(null);
  
  // Personal info
  const [contactNumber, setContactNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [civilStatus, setCivilStatus] = useState<string>('Single');
  const [religion, setReligion] = useState('');

  // Location
  const [province, setProvince] = useState('Leyte');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [address, setAddress] = useState(''); // Auto-generated
  const [landmark, setLandmark] = useState('');

  // Bio & Background
  const [bio, setBio] = useState('');
  const [educationLevel, setEducationLevel] = useState<string>('High School Grad');
  const [experienceYears, setExperienceYears] = useState('0');

  // Work Preferences (SEPARATE columns!)
  const [employmentType, setEmploymentType] = useState<string>('Any'); // Live-in/Live-out
  const [workSchedule, setWorkSchedule] = useState<string>('Full-time'); // Full-time/Part-time
  const [expectedSalary, setExpectedSalary] = useState('6000');            
  const [salaryPeriod, setSalaryPeriod] = useState<string>('Monthly');
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('Available');

  // Image
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Skills (from ref_skills → helper_skills)
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  // Languages (from ref_languages → helper_languages)
  const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);

  // Jobs (from ref_jobs → helper_jobs)
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // ============================================================================
  // OPTIONS
  // ============================================================================
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
  const employmentTypeOptions = ['Live-in', 'Live-out', 'Any'];
  const workScheduleOptions = ['Full-time', 'Part-time', 'Any'];
  const salaryPeriodOptions = ['Monthly', 'Daily'];
  const availabilityOptions = ['Available', 'Employed', 'Not Available'];

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Auto-generate address from parts
  useEffect(() => {
    const parts = [barangay, municipality, province].filter(p => p && p.trim() !== '');
    if (parts.length > 0) {
      setAddress(parts.join(', '));
    }
  }, [barangay, municipality, province]);

  // Group skills by job title for UI
  const skillsByJob = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    availableSkills.forEach(skill => {
      const job = skill.job_title || 'General';
      if (!groups[job]) groups[job] = [];
      groups[job].push(skill);
    });
    return groups;
  }, [availableSkills]);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

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

  // ============================================================================
  // LOAD DATA
  // ============================================================================

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📥 Loading helper profile...');
      
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('No user data found');
      
      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);
      
      // Fetch profile
      const response = await fetch(`${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`);
      const text = await response.text();
      console.log('📄 Response:', text.substring(0, 200));
      
      const data = JSON.parse(text);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load profile');
      }
      
      // Populate profile fields
      if (data.profile) {
        const p = data.profile;
        setContactNumber(p.contact_number || '');
        setBirthDate(p.birth_date || '');
        setGender(p.gender || 'Female');
        setCivilStatus(p.civil_status || 'Single');
        setReligion(p.religion || '');
        setProvince(p.province || 'Leyte');
        setMunicipality(p.municipality || '');
        setBarangay(p.barangay || '');
        setLandmark(p.landmark || '');
        setBio(p.bio || '');
        setEducationLevel(p.education_level || 'High School Grad');
        setExperienceYears(p.experience_years ? String(p.experience_years) : '0');
        setEmploymentType(p.employment_type || 'Any');
        setWorkSchedule(p.work_schedule || 'Full-time');
        setExpectedSalary(p.expected_salary ? String(p.expected_salary) : '6000');
        setSalaryPeriod(p.salary_period || 'Monthly');
        setAvailabilityStatus(p.availability_status || 'Available');
        setProfileImage(p.profile_image || null);
      }
      
      // Populate reference data
      setAvailableSkills(data.available_skills || []);
      setAvailableLanguages(data.available_languages || []);
      setAvailableJobs(data.available_jobs || []);
      
      // Populate selected items
      setSelectedSkillIds(data.selected_skills || []);
      setSelectedLanguageIds(data.selected_languages || []);
      setSelectedJobIds(data.selected_jobs || []);
      
      console.log('✅ Profile loaded successfully');
      
    } catch (error: any) {
      console.error('❌ Load error:', error);
      showNotification(error.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return showNotification('Camera permission needed', 'error');
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
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

  const toggleSkill = (skillId: number) => {
    if (selectedSkillIds.includes(skillId)) {
      setSelectedSkillIds(selectedSkillIds.filter(id => id !== skillId));
    } else {
      setSelectedSkillIds([...selectedSkillIds, skillId]);
    }
  };

  const toggleLanguage = (langId: number) => {
    if (selectedLanguageIds.includes(langId)) {
      setSelectedLanguageIds(selectedLanguageIds.filter(id => id !== langId));
    } else {
      setSelectedLanguageIds([...selectedLanguageIds, langId]);
    }
  };

  const toggleJob = (jobId: number) => {
    if (selectedJobIds.includes(jobId)) {
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!contactNumber.trim()) {
      return showNotification('Contact number is required', 'error');
    }
    
    if (!birthDate) {
      return showNotification('Birth date is required', 'error');
    }
    
    if (!province || !municipality || !barangay) {
      return showNotification('Complete address is required', 'error');
    }
    
    if (!expectedSalary || parseFloat(expectedSalary) < 6000) {
      return showNotification('Salary must be at least ₱6,000 (PESO minimum)', 'error');
    }
    
    if (selectedSkillIds.length === 0) {
      return showNotification('Select at least one skill', 'error');
    }
    
    if (selectedLanguageIds.length === 0) {
      return showNotification('Select at least one language', 'error');
    }
    
    if (selectedJobIds.length === 0) {
      return showNotification('Select at least one job specialty', 'error');
    }
    
    setSaving(true);
    try {
      console.log('💾 Saving profile...');
      
      const formData = new FormData();
      formData.append('user_id', userId || '');
      
      // Personal info
      formData.append('contact_number', contactNumber);
      formData.append('birth_date', birthDate);
      formData.append('gender', gender);
      formData.append('civil_status', civilStatus);
      formData.append('religion', religion);
      
      // Location
      formData.append('province', province);
      formData.append('municipality', municipality);
      formData.append('barangay', barangay);
      formData.append('address', address);
      formData.append('landmark', landmark);
      
      // Bio & Background
      formData.append('bio', bio);
      formData.append('education_level', educationLevel);
      formData.append('experience_years', experienceYears);
      
      // Work preferences
      formData.append('employment_type', employmentType);
      formData.append('work_schedule', workSchedule);
      formData.append('expected_salary', expectedSalary);
      formData.append('salary_period', salaryPeriod);
      formData.append('availability_status', availabilityStatus);
      
      // Junction tables as JSON arrays
      formData.append('skill_ids', JSON.stringify(selectedSkillIds));
      formData.append('language_ids', JSON.stringify(selectedLanguageIds));
      formData.append('job_ids', JSON.stringify(selectedJobIds));
      
      // Image if changed
      if (profileImage && imageChanged && !profileImage.startsWith('http')) {
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
      
      const data = JSON.parse(responseText);
      
      if (data.success) {
        showNotification(data.message || 'Profile saved!', 'success');
        
        if (data.data?.profile_image) {
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

  // ============================================================================
  // RENDER
  // ============================================================================

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
                <Text style={styles.changePhotoText}>
                  {profileImage ? 'Change Photo' : 'Add Photo'}
                </Text>
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

              <LabeledInput 
                label="Religion" 
                value={religion} 
                onChangeText={setReligion} 
                placeholder="e.g., Catholic, Christian, Muslim"
              />

              {/* Address */}
              <Text style={styles.sectionTitle}>Address</Text>
              
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Province *" 
                    value={province} 
                    onChangeText={setProvince}
                    placeholder="Leyte"
                    required
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Municipality *" 
                    value={municipality} 
                    onChangeText={setMunicipality}
                    placeholder="Isabel"
                    required
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Barangay *" 
                    value={barangay} 
                    onChangeText={setBarangay}
                    placeholder="San Jose"
                    required
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Landmark" 
                    value={landmark} 
                    onChangeText={setLandmark}
                    placeholder="Near mall"
                  />
                </View>
              </View>

              {/* Address Preview */}
              {address && (
                <View style={styles.addressPreview}>
                  <Text style={styles.previewLabel}>Full Address:</Text>
                  <Text style={styles.previewText}>{address}</Text>
                </View>
              )}

              {/* Background & Experience */}
              <Text style={styles.sectionTitle}>Background & Experience</Text>
              
              <LabeledInput 
                label="Bio / About Me" 
                value={bio} 
                onChangeText={setBio} 
                multiline 
                numberOfLines={4} 
                placeholder="Tell employers about yourself..."
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

              <LabeledInput 
                label="Years of Experience" 
                value={experienceYears} 
                onChangeText={setExperienceYears} 
                keyboardType="numeric"
                placeholder="0"
              />

              {/* Work Preferences */}
              <Text style={styles.sectionTitle}>Work Preferences</Text>
              
              <Text style={styles.label}>Employment Type (Accommodation)</Text>
              <View style={styles.chipRow}>
                {employmentTypeOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setEmploymentType(opt)} 
                    style={[styles.chip, employmentType === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, employmentType === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Work Schedule (Hours)</Text>
              <View style={styles.chipRow}>
                {workScheduleOptions.map(opt => (
                  <TouchableOpacity 
                    key={opt} 
                    onPress={() => setWorkSchedule(opt)} 
                    style={[styles.chip, workSchedule === opt && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, workSchedule === opt && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <LabeledInput 
                    label="Expected Salary *" 
                    value={expectedSalary} 
                    onChangeText={setExpectedSalary} 
                    keyboardType="numeric"
                    placeholder="6000"
                    required
                  />
                  <Text style={styles.helperText}>Minimum: ₱6,000/month (PESO)</Text>
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
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
                </View>
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

              {/* Job Specialties */}
              <Text style={styles.sectionTitle}>Job Specialties *</Text>
              <Text style={styles.helperText}>Select jobs you can perform</Text>
              
              {availableJobs.map(job => {
                const isSelected = selectedJobIds.includes(job.job_id);
                return (
                  <TouchableOpacity 
                    key={job.job_id} 
                    onPress={() => toggleJob(job.job_id)} 
                    style={[styles.jobCard, isSelected && styles.jobCardActive]}
                  >
                    <View style={styles.jobCardContent}>
                      <Text style={[styles.jobTitle, isSelected && styles.jobTitleActive]}>
                        {job.job_title}
                      </Text>
                      {job.description && (
                        <Text style={styles.jobDesc}>{job.description}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Languages */}
              <Text style={styles.sectionTitle}>Languages *</Text>
              <Text style={styles.helperText}>Select languages you speak</Text>
              
              <View style={styles.chipRow}>
                {availableLanguages.map(lang => {
                  const isSelected = selectedLanguageIds.includes(lang.language_id);
                  return (
                    <TouchableOpacity 
                      key={lang.language_id} 
                      onPress={() => toggleLanguage(lang.language_id)} 
                      style={[styles.chip, isSelected && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {lang.language_name}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Skills */}
              <Text style={styles.sectionTitle}>Skills & Abilities *</Text>
              <Text style={styles.helperText}>Select skills you have</Text>
              
              {Object.keys(skillsByJob).map(jobTitle => (
                <View key={jobTitle} style={{ marginBottom: 16 }}>
                  <Text style={styles.jobGroupTitle}>{jobTitle}</Text>
                  <View style={styles.chipRow}>
                    {skillsByJob[jobTitle].map(skill => {
                      const isSelected = selectedSkillIds.includes(skill.skill_id);
                      return (
                        <TouchableOpacity 
                          key={skill.skill_id} 
                          onPress={() => toggleSkill(skill.skill_id)} 
                          style={[styles.skillChip, isSelected && styles.skillActive]}
                        >
                          <Text style={[styles.skillText, isSelected && styles.skillTextActive]}>
                            {skill.skill_name}
                          </Text>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={14} color="#007AFF" style={{ marginLeft: 4 }} />
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

// ============================================================================
// STYLES
// ============================================================================

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
    marginBottom: 8,
  },
  row: { 
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  // Address Preview
  addressPreview: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#1976D2',
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
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
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

  // Job Cards
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    marginBottom: 8,
  },
  jobCardActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  jobCardContent: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  jobTitleActive: {
    color: '#007AFF',
  },
  jobDesc: {
    fontSize: 12,
    color: '#666',
  },

  // Skills
  jobGroupTitle: {
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
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
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
    fontSize: 13,
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
