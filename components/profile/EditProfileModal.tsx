// components/profile/EditHelperProfileModal.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import API_URL from "../../constants/api";

import LabeledInput from '../common/LabeledInput';
import {NotificationModal} from '../common';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

const isWeb = Platform.OS === 'web';

export default function EditHelperProfileModal({ visible, onClose, onSaveSuccess }: EditProfileModalProps) {
  
  // ============================================================================
  // STATE
  // ============================================================================
  const [userId, setUserId] = useState<string | null>(null);
  
  // User info (editable)
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
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
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  // Bio & Background
  const [bio, setBio] = useState('');
  const [educationLevel, setEducationLevel] = useState<string>('High School Grad');
  const [experienceYears, setExperienceYears] = useState('0');

  // Work Preferences
  const [employmentType, setEmploymentType] = useState<string>('Any');
  const [workSchedule, setWorkSchedule] = useState<string>('Full-time');
  const [expectedSalary, setExpectedSalary] = useState('6000');
  const [salaryPeriod, setSalaryPeriod] = useState<string>('Monthly');
  const [availabilityStatus, setAvailabilityStatus] = useState<string>('Available');

  // Image
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Reference data
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
  
  // STEP 1: Categories (PESO's 6 nature of work)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  
  // STEP 2: Jobs (based on categories)
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  
  // STEP 3: Skills (based on jobs)
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  
  // STEP 4: Languages
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  
  // Custom specifications
  const [customJobs, setCustomJobs] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');
  
  // Selection modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [jobModalVisible, setJobModalVisible] = useState(false);
  const [skillModalVisible, setSkillModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  
  // Search filters
  const [jobSearch, setJobSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  useEffect(() => {
    const parts = [barangay, municipality, province].filter(p => p && p.trim() !== '');
    if (parts.length > 0) {
      setAddress(parts.join(', '));
    }
  }, [barangay, municipality, province]);

  // Check if "General Househelp" is selected (category_id = 1)
  const isGeneralHousehelpSelected = selectedCategoryIds.includes(1);

  // Jobs to show based on selected categories
  const availableJobsForSelection = useMemo(() => {
    if (isGeneralHousehelpSelected) {
      // Show ALL jobs from ALL categories
      return availableJobs;
    } else if (selectedCategoryIds.length === 0) {
      // No categories selected, no jobs available
      return [];
    } else {
      // Show only jobs from selected categories
      return availableJobs.filter(j => selectedCategoryIds.includes(j.category_id));
    }
  }, [availableJobs, selectedCategoryIds, isGeneralHousehelpSelected]);

  // Skills to show based on selected jobs
  const availableSkillsForSelection = useMemo(() => {
    if (selectedJobIds.length === 0) {
      return [];
    }
    return availableSkills.filter(s => selectedJobIds.includes(s.job_id));
  }, [availableSkills, selectedJobIds]);

  // Filtered lists for search
  const filteredJobs = useMemo(() => 
    availableJobsForSelection.filter(j => 
      j.job_title.toLowerCase().includes(jobSearch.toLowerCase())
    ),
    [availableJobsForSelection, jobSearch]
  );
  
  const filteredSkills = useMemo(() => 
    availableSkillsForSelection.filter(s => 
      s.skill_name.toLowerCase().includes(skillSearch.toLowerCase())
    ),
    [availableSkillsForSelection, skillSearch]
  );
  
  const filteredLanguages = useMemo(() => 
    availableLanguages.filter(l => 
      l.language_name.toLowerCase().includes(languageSearch.toLowerCase())
    ),
    [availableLanguages, languageSearch]
  );

  // Selected items for display
  const selectedCategories = useMemo(() => 
    availableCategories.filter(c => selectedCategoryIds.includes(c.category_id)),
    [availableCategories, selectedCategoryIds]
  );

  const selectedJobs = useMemo(() => 
    availableJobs.filter(j => selectedJobIds.includes(j.job_id)),
    [availableJobs, selectedJobIds]
  );
  
  const selectedSkills = useMemo(() => 
    availableSkills.filter(s => selectedSkillIds.includes(s.skill_id)),
    [availableSkills, selectedSkillIds]
  );
  
  const selectedLanguages = useMemo(() => 
    availableLanguages.filter(l => selectedLanguageIds.includes(l.language_id)),
    [availableLanguages, selectedLanguageIds]
  );

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

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('No user data found');
      
      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);
      
      const response = await fetch(`${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}`);
      const text = await response.text();
      const data = JSON.parse(text);
      
      if (!data.success) throw new Error(data.message || 'Failed to load profile');
      
      // User info
      if (data.user) {
        setFirstName(data.user.first_name || '');
        setMiddleName(data.user.middle_name || '');
        setLastName(data.user.last_name || '');
        setUsername(data.user.username || '');
        setEmail(data.user.email || '');
      }
      
      // Profile
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
      
      setAvailableCategories(data.available_categories || []);
      setAvailableSkills(data.available_skills || []);
      setAvailableLanguages(data.available_languages || []);
      setAvailableJobs(data.available_jobs || []);
      
      // Get selected category IDs from selected jobs
      const selectedJobData = data.selected_jobs || [];
      const jobData = data.available_jobs || [];
      const categoryIds = new Set<number>();
      selectedJobData.forEach((jobId: number) => {
        const job = jobData.find((j: any) => j.job_id === jobId);
        if (job) categoryIds.add(job.category_id);
      });
      setSelectedCategoryIds(Array.from(categoryIds));
      
      setSelectedJobIds(data.selected_jobs || []);
      setSelectedSkillIds(data.selected_skills || []);
      setSelectedLanguageIds(data.selected_languages || []);
      
    } catch (error: any) {
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

  const toggleCategory = (categoryId: number) => {
    // ID for "General Househelp" is usually 1 based on previous code
    const isGeneralHousehelpId = categoryId === 1;
    const allOtherCategoryIds = availableCategories
      .filter(c => c.category_id !== 1)
      .map(c => c.category_id);

    if (selectedCategoryIds.includes(categoryId)) {
      // DESELECTING
      if (isGeneralHousehelpId) {
        // Deselecting General Househelp -> Deselect everything
        setSelectedCategoryIds([]);
        setSelectedJobIds([]);
        setSelectedSkillIds([]);
      } else {
        // Deselecting a specific category
        const newSelected = selectedCategoryIds.filter(id => id !== categoryId && id !== 1);
        setSelectedCategoryIds(newSelected);
        
        // Remove associated jobs and skills
        const jobsToRemove = availableJobs
          .filter(j => j.category_id === categoryId)
          .map(j => j.job_id);
        setSelectedJobIds(selectedJobIds.filter(id => !jobsToRemove.includes(id)));
        
        const skillsToRemove = availableSkills
          .filter(s => jobsToRemove.includes(s.job_id))
          .map(s => s.skill_id);
        setSelectedSkillIds(selectedSkillIds.filter(id => !skillsToRemove.includes(id)));
      }
    } else {
      // SELECTING
      if (isGeneralHousehelpId) {
        // Selecting General Househelp -> Select ALL categories
        setSelectedCategoryIds(availableCategories.map(c => c.category_id));
      } else {
        // Selecting a specific category
        const newSelected = [...selectedCategoryIds, categoryId];
        
        // If all other categories are now selected, also select General Househelp
        const otherSelectedCount = newSelected.filter(id => id !== 1).length;
        if (otherSelectedCount === allOtherCategoryIds.length) {
          setSelectedCategoryIds([...allOtherCategoryIds, 1]);
        } else {
          setSelectedCategoryIds(newSelected);
        }
      }
    }
  };

  const toggleJob = (jobId: number) => {
    if (selectedJobIds.includes(jobId)) {
      // Deselecting job - remove its skills too
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
      
      const skillsToRemove = availableSkills
        .filter(s => s.job_id === jobId)
        .map(s => s.skill_id);
      setSelectedSkillIds(selectedSkillIds.filter(id => !skillsToRemove.includes(id)));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
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

  const handleSave = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim()) {
      return showNotification('Name is required', 'error');
    }
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
      return showNotification('Salary must be at least ₱6,000', 'error');
    }
    if (selectedCategoryIds.length === 0) {
      return showNotification('Select at least one job category', 'error');
    }
    if (selectedJobIds.length === 0) {
      return showNotification('Select at least one job specialty', 'error');
    }
    if (selectedSkillIds.length === 0) {
      return showNotification('Select at least one skill', 'error');
    }
    if (selectedLanguageIds.length === 0) {
      return showNotification('Select at least one language', 'error');
    }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('user_id', userId || '');
      formData.append('first_name', firstName);
      formData.append('middle_name', middleName);
      formData.append('last_name', lastName);
      formData.append('username', username);
      formData.append('contact_number', contactNumber);
      formData.append('birth_date', birthDate);
      formData.append('gender', gender);
      formData.append('civil_status', civilStatus);
      formData.append('religion', religion);
      formData.append('province', province);
      formData.append('municipality', municipality);
      formData.append('barangay', barangay);
      formData.append('address', address);
      formData.append('landmark', landmark);
      formData.append('bio', bio);
      formData.append('education_level', educationLevel);
      formData.append('experience_years', experienceYears);
      formData.append('employment_type', employmentType);
      formData.append('work_schedule', workSchedule);
      formData.append('expected_salary', expectedSalary);
      formData.append('salary_period', salaryPeriod);
      formData.append('availability_status', availabilityStatus);
      formData.append('skill_ids', JSON.stringify(selectedSkillIds));
      formData.append('language_ids', JSON.stringify(selectedLanguageIds));
      formData.append('job_ids', JSON.stringify(selectedJobIds));
      
      // Custom specifications
      formData.append('custom_jobs', JSON.stringify(customJobs));
      formData.append('custom_skills', JSON.stringify(customSkills));
      
      if (profileImage && imageChanged && !profileImage.startsWith('http')) {
        const fileName = profileImage.split('/').pop() || 'profile.jpg';
        
        if (Platform.OS === 'web') {
          // WEB: Fetch the blob from the URI
          try {
            const response = await fetch(profileImage);
            const blob = await response.blob();
            formData.append('profile_image', blob, fileName);
          } catch (err) {
            console.error('Error fetching image blob on web:', err);
            // Fallback to mobile format if fetch fails (unlikely on web)
            // @ts-ignore
            formData.append('profile_image', { uri: profileImage, name: fileName, type: 'image/jpeg' });
          }
        } else {
          // MOBILE: Standard React Native format
          // @ts-ignore
          formData.append('profile_image', { uri: profileImage, name: fileName, type: 'image/jpeg' });
        }
      }
      
      const response = await fetch(`${API_URL}/helper/update_profile.php`, {
        method: 'POST',
        body: formData,
      });
      
      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      if (data.success) {
        showNotification('Profile saved successfully!', 'success');
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

  // ============================================================================
  // SELECTION MODAL (Reusable)
  // ============================================================================

  const renderSelectionModal = (
    visible: boolean, onClose: () => void, title: string, data: any[],
    selectedIds: number[], onToggle: (id: number) => void,
    searchValue: string, onSearchChange: (text: string) => void,
    idKey: string, nameKey: string, showSearch: boolean = true,
    customData: string[] = [], onAddCustom?: (text: string) => void, onRemoveCustom?: (text: string) => void
  ) => (
    <Modal visible={visible} animationType="slide" transparent={isWeb} presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}>
      <View style={isWeb ? styles.webOverlay : { flex: 1 }}>
        <View style={[styles.modalContainer, isWeb && styles.webSmallContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {showSearch && (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#666" />
              <TextInput style={styles.searchInput} placeholder="Search..." value={searchValue} onChangeText={onSearchChange} />
              {onAddCustom && searchValue.trim() !== '' && !data.some(d => d[nameKey].toLowerCase() === searchValue.toLowerCase()) && (
                <TouchableOpacity 
                  style={styles.addCustomBtn}
                  onPress={() => { onAddCustom(searchValue); onSearchChange(''); }}
                >
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView style={{ flex: 1 }}>
            {customData.length > 0 && (
              <View style={styles.customSection}>
                <Text style={styles.customSectionTitle}>Your custom specifications:</Text>
                {customData.map((item, index) => (
                  <View key={`custom-${index}`} style={styles.listItem}>
                    <Text style={[styles.listItemText, { color: '#007AFF', fontWeight: '500' }]}>{item}</Text>
                    <TouchableOpacity onPress={() => onRemoveCustom && onRemoveCustom(item)}>
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {data.map((item) => {
              const isSelected = selectedIds.includes(item[idKey]);
              return (
                <TouchableOpacity key={String(item[idKey])} style={styles.listItem} onPress={() => onToggle(item[idKey])}>
                  <Text style={styles.listItemText}>{item[nameKey]}</Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                </TouchableOpacity>
              );
            })}
            
            {data.length === 0 && searchValue.trim() === '' && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No items found.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.selectedCount}>{selectedIds.length + customData.length} selected</Text>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={isWeb} presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}>
        <View style={isWeb ? styles.webOverlay : { flex: 1 }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={[styles.container, isWeb && styles.webContainer]}
          >
            
            <View style={[styles.header, isWeb && styles.headerWeb]}>
              <View>
                <Text style={styles.title}>Edit Profile</Text>
                <Text style={styles.subtitle}>Keep your information up to date</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Preparing your profile...</Text>
              </View>
            ) : (
              <>
                <ScrollView 
                  style={[styles.content, isWeb && styles.contentWeb]}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 40 }}
                >
                  
                  {/* Photo Section */}
                  <View style={styles.photoSection}>
                    <TouchableOpacity onPress={pickImage} style={styles.photoWrapper}>
                      <View style={styles.photoBorder}>
                        {profileImage ? (
                          <Image source={{ uri: profileImage }} style={styles.photo} />
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Ionicons name="person" size={50} color="#ADB5BD" />
                          </View>
                        )}
                      </View>
                      <View style={styles.cameraIconContainer}>
                        <Ionicons name="camera" size={18} color="#fff" />
                      </View>
                    </TouchableOpacity>
                    <Text style={styles.photoText}>Change Profile Photo</Text>
                  </View>

                  {/* Basic Info */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={styles.sectionIconBg}>
                        <Ionicons name="person" size={20} color="#007AFF" />
                      </View>
                      <Text style={styles.sectionTitleText}>Basic Information</Text>
                    </View>
                    
                    <View style={styles.inputGrid}>
                      <View style={styles.inputHalf}>
                        <LabeledInput label="First Name *" value={firstName} onChangeText={setFirstName} placeholder="Juan" />
                      </View>
                      <View style={styles.inputHalf}>
                        <LabeledInput label="Last Name *" value={lastName} onChangeText={setLastName} placeholder="Cruz" />
                      </View>
                    </View>
                    
                    <LabeledInput label="Middle Name" value={middleName} onChangeText={setMiddleName} placeholder="Dela" />
                    
                    <View style={styles.inputGrid}>
                      <View style={styles.inputHalf}>
                        <LabeledInput label="Username" value={username} onChangeText={setUsername} placeholder="juandelacruz" />
                      </View>
                      <View style={styles.inputHalf}>
                        <LabeledInput label="Contact Number *" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" placeholder="09XX XXX XXXX" />
                      </View>
                    </View>
                    
                    <LabeledInput label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" editable={false} placeholder="email@example.com" />
                    <LabeledInput label="Birth Date (YYYY-MM-DD) *" value={birthDate} onChangeText={setBirthDate} placeholder="2000-01-15" />
                    
                    <Text style={styles.label}>Gender *</Text>
                    <View style={styles.row}>
                      {['Male', 'Female'].map(opt => (
                        <TouchableOpacity key={opt} onPress={() => setGender(opt as any)} style={[styles.option, gender === opt && styles.optionActive]}>
                          <Text style={[styles.optionText, gender === opt && styles.optionTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Civil Status</Text>
                    <View style={styles.row}>
                      {['Single', 'Married', 'Widowed', 'Separated'].map(opt => (
                        <TouchableOpacity key={opt} onPress={() => setCivilStatus(opt)} style={[styles.option, civilStatus === opt && styles.optionActive]}>
                          <Text style={[styles.optionText, civilStatus === opt && styles.optionTextActive]}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <LabeledInput label="Religion" value={religion} onChangeText={setReligion} placeholder="Catholic, etc." />
                  </View>

                  {/* Address */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionIconBg, { backgroundColor: '#FFF4E5' }]}>
                        <Ionicons name="location" size={20} color="#FF9500" />
                      </View>
                      <Text style={styles.sectionTitleText}>Current Address</Text>
                    </View>
                    
                    {/* RESPONSIVE ROW FOR WEB */}
                    <View style={isWeb ? styles.webRow : undefined}>
                      <View style={isWeb ? { flex: 1, paddingRight: 12 } : undefined}>
                        <LabeledInput label="Province *" value={province} onChangeText={setProvince} placeholder="Leyte" />
                      </View>
                      
                      <View style={isWeb ? { flex: 2 } : undefined}>
                        <View style={styles.inputGrid}>
                          <View style={styles.inputHalf}>
                            <LabeledInput label="Municipality *" value={municipality} onChangeText={setMunicipality} placeholder="Isabel" />
                          </View>
                          <View style={styles.inputHalf}>
                            <LabeledInput label="Barangay *" value={barangay} onChangeText={setBarangay} placeholder="San Jose" />
                          </View>
                        </View>
                      </View>
                    </View>

                    <LabeledInput label="Landmark / Street" value={landmark} onChangeText={setLandmark} placeholder="Near church / Street name" />
                  </View>

                  {/* Specialties - The 3-Step Flow */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionIconBg, { backgroundColor: '#EBFBEE' }]}>
                        <Ionicons name="ribbon" size={20} color="#2ECC71" />
                      </View>
                      <Text style={styles.sectionTitleText}>Skills & Specialties</Text>
                    </View>
                    
                    <View style={styles.infoAlert}>
                      <Ionicons name="information-circle" size={20} color="#007AFF" />
                      <Text style={styles.infoAlertText}>
                        Complete all 3 steps for better job matching
                      </Text>
                    </View>

                    {/* STEP 1 */}
                    <View style={styles.stepContainer}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>1</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitle}>Nature of Work</Text>
                          <Text style={styles.stepSubtitle}>
                            {isGeneralHousehelpSelected 
                              ? 'General Househelp selected (All areas included)' 
                              : 'Select your primary work categories'}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.stepActionBtn}
                          onPress={() => setCategoryModalVisible(true)}
                        >
                          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.tagList}>
                        {selectedCategories.length > 0 ? (
                          selectedCategories.map(c => (
                            <View key={c.category_id} style={styles.tagBadge}>
                              <Text style={styles.tagBadgeText}>{c.category_name}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyTagText}>No categories selected</Text>
                        )}
                      </View>
                    </View>

                    {/* STEP 2 */}
                    <View style={[styles.stepContainer, selectedCategoryIds.length === 0 && styles.stepDisabled]}>
                      <View style={styles.stepHeader}>
                        <View style={[styles.stepNumberContainer, selectedCategoryIds.length === 0 && styles.stepNumberDisabled]}>
                          <Text style={styles.stepNumber}>2</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitle}>Specific Jobs</Text>
                          <Text style={styles.stepSubtitle}>What specific roles can you perform?</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.stepActionBtn}
                          onPress={() => selectedCategoryIds.length > 0 && setJobModalVisible(true)}
                          disabled={selectedCategoryIds.length === 0}
                        >
                          <Ionicons name="chevron-forward" size={20} color={selectedCategoryIds.length > 0 ? "#007AFF" : "#ADB5BD"} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.tagList}>
                        {selectedJobs.length > 0 || customJobs.length > 0 ? (
                          <>
                            {selectedJobs.map(j => (
                              <View key={j.job_id} style={styles.tagBadge}>
                                <Text style={styles.tagBadgeText}>{j.job_title}</Text>
                              </View>
                            ))}
                            {customJobs.map((job, idx) => (
                              <View key={`custom-job-${idx}`} style={[styles.tagBadge, styles.tagCustom]}>
                                <Ionicons name="star" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                                <Text style={[styles.tagBadgeText, styles.tagCustomText]}>{job}</Text>
                              </View>
                            ))}
                          </>
                        ) : (
                          <Text style={styles.emptyTagText}>
                            {selectedCategoryIds.length === 0 ? 'Select a category first' : 'No jobs selected'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* STEP 3 */}
                    <View style={[styles.stepContainer, selectedJobIds.length === 0 && customJobs.length === 0 && styles.stepDisabled]}>
                      <View style={styles.stepHeader}>
                        <View style={[styles.stepNumberContainer, (selectedJobIds.length === 0 && customJobs.length === 0) && styles.stepNumberDisabled]}>
                          <Text style={styles.stepNumber}>3</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitle}>Individual Skills</Text>
                          <Text style={styles.stepSubtitle}>Specific skills for your selected jobs</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.stepActionBtn}
                          onPress={() => (selectedJobIds.length > 0 || customJobs.length > 0) && setSkillModalVisible(true)}
                          disabled={selectedJobIds.length === 0 && customJobs.length === 0}
                        >
                          <Ionicons name="chevron-forward" size={20} color={(selectedJobIds.length > 0 || customJobs.length > 0) ? "#007AFF" : "#ADB5BD"} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.tagList}>
                        {selectedSkills.length > 0 || customSkills.length > 0 ? (
                          <>
                            {selectedSkills.map(s => (
                              <View key={s.skill_id} style={styles.tagBadge}>
                                <Text style={styles.tagBadgeText}>{s.skill_name}</Text>
                              </View>
                            ))}
                            {customSkills.map((skill, idx) => (
                              <View key={`custom-skill-${idx}`} style={[styles.tagBadge, styles.tagCustom]}>
                                <Ionicons name="star" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                                <Text style={[styles.tagBadgeText, styles.tagCustomText]}>{skill}</Text>
                              </View>
                            ))}
                          </>
                        ) : (
                          <Text style={styles.emptyTagText}>
                            {selectedJobIds.length === 0 && customJobs.length === 0 ? 'Select jobs first' : 'No skills selected'}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Languages */}
                    <View style={[styles.stepContainer, { borderBottomWidth: 0, marginBottom: 0 }]}>
                      <View style={styles.stepHeader}>
                        <View style={[styles.stepIconContainer]}>
                          <Ionicons name="language" size={18} color="#6C757D" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stepTitle}>Languages Spoken</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.stepActionBtn}
                          onPress={() => setLanguageModalVisible(true)}
                        >
                          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.tagList}>
                        {selectedLanguages.length > 0 ? (
                          selectedLanguages.map(l => (
                            <View key={l.language_id} style={[styles.tagBadge, { backgroundColor: '#F0F2F5', borderColor: '#D1D5DB' }]}>
                              <Text style={[styles.tagBadgeText, { color: '#4B5563' }]}>{l.language_name}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.emptyTagText}>No languages selected</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* About & Education */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionIconBg, { backgroundColor: '#F3E8FF' }]}>
                        <Ionicons name="book" size={20} color="#9333EA" />
                      </View>
                      <Text style={styles.sectionTitleText}>Professional Bio</Text>
                    </View>
                    
                    <LabeledInput 
                      label="Tell employers about yourself" 
                      value={bio} 
                      onChangeText={setBio} 
                      multiline 
                      numberOfLines={4} 
                      placeholder="Briefly describe your work history and strengths..."
                    />

                    <Text style={styles.label}>Educational Attainment</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                      <View style={styles.row}>
                        {['Elementary', 'High School Grad', 'College Grad', 'Vocational'].map(opt => (
                          <TouchableOpacity 
                            key={opt} 
                            onPress={() => setEducationLevel(opt)} 
                            style={[styles.option, educationLevel === opt && styles.optionActive]}
                          >
                            <Text style={[styles.optionText, educationLevel === opt && styles.optionTextActive]}>
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
                  </View>

                  {/* Work Preferences */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <View style={[styles.sectionIconBg, { backgroundColor: '#E1F5FE' }]}>
                        <Ionicons name="briefcase" size={20} color="#0288D1" />
                      </View>
                      <Text style={styles.sectionTitleText}>Work Preferences</Text>
                    </View>
                    
                    <Text style={styles.label}>Stay Arrangement</Text>
                    <View style={styles.row}>
                      {['Live-in', 'Live-out', 'Any'].map(opt => (
                        <TouchableOpacity 
                          key={opt} 
                          onPress={() => setEmploymentType(opt)} 
                          style={[styles.option, employmentType === opt && styles.optionActive]}
                        >
                          <Text style={[styles.optionText, employmentType === opt && styles.optionTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.label}>Work Hours</Text>
                    <View style={styles.row}>
                      {['Full-time', 'Part-time', 'Any'].map(opt => (
                        <TouchableOpacity 
                          key={opt} 
                          onPress={() => setWorkSchedule(opt)} 
                          style={[styles.option, workSchedule === opt && styles.optionActive]}
                        >
                          <Text style={[styles.optionText, workSchedule === opt && styles.optionTextActive]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={styles.salaryContainer}>
                      <LabeledInput 
                        label="Expected Salary (₱) *" 
                        value={expectedSalary} 
                        onChangeText={setExpectedSalary} 
                        keyboardType="numeric"
                        placeholder="6000"
                      />
                      <Text style={styles.salaryHint}>Recommended minimum: ₱6,000/month</Text>
                    </View>

                    <Text style={styles.label}>Current Availability</Text>
                    <View style={styles.row}>
                      {['Available', 'Employed', 'Not Available'].map(opt => (
                        <TouchableOpacity 
                          key={opt} 
                          onPress={() => setAvailabilityStatus(opt)} 
                          style={[styles.option, availabilityStatus === opt && styles.optionActive]}
                        >
                          <View style={styles.statusRow}>
                            <View style={[
                              styles.statusDot, 
                              opt === 'Available' ? styles.dotGreen : 
                              opt === 'Employed' ? styles.dotOrange : styles.dotRed
                            ]} />
                            <Text style={[styles.optionText, availabilityStatus === opt && styles.optionTextActive]}>
                              {opt}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ height: 100 }} />
                </ScrollView>

                <View style={styles.footer}>
                  <TouchableOpacity 
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
                    onPress={handleSave} 
                    disabled={saving}
                  >
                    {saving ? (
                      <View style={styles.savingRow}>
                        <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.saveText}>Saving Changes...</Text>
                      </View>
                    ) : (
                      <Text style={styles.saveText}>Save Profile</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      {renderSelectionModal(
        categoryModalVisible,
        () => setCategoryModalVisible(false),
        'Step 1: Select Category',
        availableCategories,
        selectedCategoryIds,
        toggleCategory,
        '',
        () => {},
        'category_id',
        'category_name',
        false
      )}

      {/* Job Selection Modal */}
      {renderSelectionModal(
        jobModalVisible,
        () => setJobModalVisible(false),
        'Step 2: Select Jobs',
        filteredJobs,
        selectedJobIds,
        toggleJob,
        jobSearch,
        setJobSearch,
        'job_id',
        'job_title',
        true,
        customJobs,
        (job) => setCustomJobs([...customJobs, job]),
        (job) => setCustomJobs(customJobs.filter(j => j !== job))
      )}

      {/* Skill Selection Modal */}
      {renderSelectionModal(
        skillModalVisible,
        () => setSkillModalVisible(false),
        'Step 3: Select Skills',
        filteredSkills,
        selectedSkillIds,
        toggleSkill,
        skillSearch,
        setSkillSearch,
        'skill_id',
        'skill_name',
        true,
        customSkills,
        (skill) => setCustomSkills([...customSkills, skill]),
        (skill) => setCustomSkills(customSkills.filter(s => s !== skill))
      )}

      {/* Language Selection Modal */}
      {renderSelectionModal(
        languageModalVisible,
        () => setLanguageModalVisible(false),
        'Languages',
        filteredLanguages,
        selectedLanguageIds,
        toggleLanguage,
        languageSearch,
        setLanguageSearch,
        'language_id',
        'language_name'
      )}

      <NotificationModal 
        visible={notifVisible} 
        message={notifMessage} 
        type={notifType} 
        onClose={() => {
          setNotifVisible(false);
          if (notifType === 'success') {
            onClose();
          }
        }}
      />
    </>
  );
}

// ============================================================================
// STYLES - SIMPLE & CLEAN
// ============================================================================

const styles = StyleSheet.create({
  // Responsive Web
  // --- RESPONSIVE WEB WRAPPERS ---
  webOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  webContainer: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '95%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA', // Assuming this is your background color
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  webSmallContainer: {
    width: '100%',
    maxWidth: 500, // Thinner for the pop-up selection modals
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  webRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  headerWeb: { paddingTop: 20 },
  contentWeb: { width: '100%' },
  footerWeb: { width: '100%' },

  // Standard Styles
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800',
    color: '#1A1C1E',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  inputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 8,
    marginTop: 16,
  },
  infoAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D1E9FF',
  },
  infoAlertText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  stepContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F5',
    marginBottom: 8,
  },
  stepDisabled: {
    opacity: 0.6,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberDisabled: {
    backgroundColor: '#ADB5BD',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  stepIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F3F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  stepSubtitle: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: 2,
  },
  stepActionBtn: {
    padding: 8,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 40,
  },
  tagBadge: {
    backgroundColor: '#EBF5FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1E9FF',
  },
  tagBadgeText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tagCustom: {
    backgroundColor: '#EBFBEE',
    borderColor: '#D3F9D8',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagCustomText: {
    color: '#2ECC71',
  },
  emptyTagText: {
    fontSize: 12,
    color: '#ADB5BD',
    fontStyle: 'italic',
  },
  horizontalScroll: {
    marginHorizontal: -4,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    backgroundColor: '#fff',
  },
  optionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: { backgroundColor: '#2ECC71' },
  dotOrange: { backgroundColor: '#FF9500' },
  dotRed: { backgroundColor: '#FF3B30' },
  salaryContainer: {
    marginTop: 8,
  },
  salaryHint: {
    fontSize: 12,
    color: '#6C757D',
    marginTop: -4,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  photoSection: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 8,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoBorder: {
    padding: 4,
    borderRadius: 60,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  photoText: {
    marginTop: 16,
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: {
    backgroundColor: '#ADB5BD',
    shadowOpacity: 0,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: 0.5,
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 50 : 0,
  },
  modalHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1C1E',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1C1E',
    fontWeight: '600',
  },
  addCustomBtn: {
    padding: 4,
  },
  customSection: {
    backgroundColor: '#F8F9FA',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
  },
  customSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007AFF',
    margin: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  emptyState: {
    padding: 80,
    alignItems: 'center',
  },
  emptyText: {
    color: '#ADB5BD',
    fontSize: 16,
    fontWeight: '600',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  listItemText: {
    fontSize: 16,
    color: '#1A1C1E',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F2',
    backgroundColor: '#fff',
  },
  selectedCount: {
    fontSize: 15,
    color: '#6C757D',
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  doneText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
});
