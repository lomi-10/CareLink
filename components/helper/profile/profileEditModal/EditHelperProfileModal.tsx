// components/helper/profile/profileEditModal/EditHelperProfileModal.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import API_URL from "@/constants/api";
import { NotificationModal } from '@/components/common';

// Import our modular UI blocks
import { styles, 
  SelectionModal, 
  WorkPreferencesSection, 
  PhotoSection, 
  BasicInfoSection, 
  AddressSection, 
  SpecialtiesSection, 
  AboutSection 
} from '.';

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
  
  // STEP 1: Categories
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  // STEP 2: Jobs 
  const [selectedJobIds, setSelectedJobIds] = useState<number[]>([]);
  // STEP 3: Skills 
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
  // COMPUTED VALUES (The Magic of the 3-Step Process)
  // ============================================================================
  useEffect(() => {
    const parts = [barangay, municipality, province].filter(p => p && p.trim() !== '');
    if (parts.length > 0) setAddress(parts.join(', '));
  }, [barangay, municipality, province]);

  const isGeneralHousehelpSelected = selectedCategoryIds.includes(1);

  const availableJobsForSelection = useMemo(() => {
    if (isGeneralHousehelpSelected) return availableJobs;
    if (selectedCategoryIds.length === 0) return [];
    return availableJobs.filter(j => selectedCategoryIds.includes(j.category_id));
  }, [availableJobs, selectedCategoryIds, isGeneralHousehelpSelected]);

  const availableSkillsForSelection = useMemo(() => {
    if (selectedJobIds.length === 0) return [];
    return availableSkills.filter(s => selectedJobIds.includes(s.job_id));
  }, [availableSkills, selectedJobIds]);

  const filteredJobs = useMemo(() => 
    availableJobsForSelection.filter(j => j.job_title.toLowerCase().includes(jobSearch.toLowerCase())),
    [availableJobsForSelection, jobSearch]
  );
  
  const filteredSkills = useMemo(() => 
    availableSkillsForSelection.filter(s => s.skill_name.toLowerCase().includes(skillSearch.toLowerCase())),
    [availableSkillsForSelection, skillSearch]
  );
  
  const filteredLanguages = useMemo(() => 
    availableLanguages.filter(l => l.language_name.toLowerCase().includes(languageSearch.toLowerCase())),
    [availableLanguages, languageSearch]
  );

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
  // LIFECYCLE & DATA FETCHING
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
      
      if (data.user) {
        setFirstName(data.user.first_name || '');
        setMiddleName(data.user.middle_name || '');
        setLastName(data.user.last_name || '');
        setUsername(data.user.username || '');
        setEmail(data.user.email || '');
      }
      
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
  // ACTIONS & TOGGLES
  // ============================================================================
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return showNotification('Camera permission needed', 'error');
    
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
    const isGeneralHousehelpId = categoryId === 1;
    const allOtherCategoryIds = availableCategories.filter(c => c.category_id !== 1).map(c => c.category_id);

    if (selectedCategoryIds.includes(categoryId)) {
      if (isGeneralHousehelpId) {
        setSelectedCategoryIds([]);
        setSelectedJobIds([]);
        setSelectedSkillIds([]);
      } else {
        const newSelected = selectedCategoryIds.filter(id => id !== categoryId && id !== 1);
        setSelectedCategoryIds(newSelected);
        const jobsToRemove = availableJobs.filter(j => j.category_id === categoryId).map(j => j.job_id);
        setSelectedJobIds(selectedJobIds.filter(id => !jobsToRemove.includes(id)));
        const skillsToRemove = availableSkills.filter(s => jobsToRemove.includes(s.job_id)).map(s => s.skill_id);
        setSelectedSkillIds(selectedSkillIds.filter(id => !skillsToRemove.includes(id)));
      }
    } else {
      if (isGeneralHousehelpId) {
        setSelectedCategoryIds(availableCategories.map(c => c.category_id));
      } else {
        const newSelected = [...selectedCategoryIds, categoryId];
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
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
      const skillsToRemove = availableSkills.filter(s => s.job_id === jobId).map(s => s.skill_id);
      setSelectedSkillIds(selectedSkillIds.filter(id => !skillsToRemove.includes(id)));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
    }
  };

  const toggleSkill = (skillId: number) => {
    if (selectedSkillIds.includes(skillId)) setSelectedSkillIds(selectedSkillIds.filter(id => id !== skillId));
    else setSelectedSkillIds([...selectedSkillIds, skillId]);
  };

  const toggleLanguage = (langId: number) => {
    if (selectedLanguageIds.includes(langId)) setSelectedLanguageIds(selectedLanguageIds.filter(id => id !== langId));
    else setSelectedLanguageIds([...selectedLanguageIds, langId]);
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) return showNotification('Name is required', 'error');
    if (!contactNumber.trim()) return showNotification('Contact number is required', 'error');
    if (!birthDate) return showNotification('Birth date is required', 'error');
    if (!province || !municipality || !barangay) return showNotification('Complete address is required', 'error');
    if (!expectedSalary || parseFloat(expectedSalary) < 6000) return showNotification('Salary must be at least ₱6,000', 'error');
    if (selectedCategoryIds.length === 0) return showNotification('Select at least one job category', 'error');
    if (selectedJobIds.length === 0) return showNotification('Select at least one job specialty', 'error');
    if (selectedSkillIds.length === 0) return showNotification('Select at least one skill', 'error');
    if (selectedLanguageIds.length === 0) return showNotification('Select at least one language', 'error');
    
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
      formData.append('custom_jobs', JSON.stringify(customJobs));
      formData.append('custom_skills', JSON.stringify(customSkills));
      
      if (profileImage && imageChanged && !profileImage.startsWith('http')) {
        const fileName = profileImage.split('/').pop() || 'profile.jpg';
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(profileImage);
            const blob = await response.blob();
            formData.append('profile_image', blob, fileName);
          } catch (err) {
            // @ts-ignore
            formData.append('profile_image', { uri: profileImage, name: fileName, type: 'image/jpeg' });
          }
        } else {
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
  // RENDER
  // ============================================================================
  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={isWeb} presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}>
        <View style={isWeb ? styles.webOverlay : { flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, isWeb && styles.webContainer]}>
            
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
                <ScrollView style={[styles.content, isWeb && styles.contentWeb]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                  
                  <PhotoSection profileImage={profileImage} pickImage={pickImage} />
                  
                  <BasicInfoSection 
                    firstName={firstName} setFirstName={setFirstName} lastName={lastName} setLastName={setLastName} 
                    middleName={middleName} setMiddleName={setMiddleName} username={username} setUsername={setUsername} 
                    contactNumber={contactNumber} setContactNumber={setContactNumber} email={email} setEmail={setEmail} 
                    birthDate={birthDate} setBirthDate={setBirthDate} gender={gender} setGender={setGender} 
                    civilStatus={civilStatus} setCivilStatus={setCivilStatus} religion={religion} setReligion={setReligion}
                  />
                  
                  <AddressSection 
                    isWeb={isWeb} province={province} setProvince={setProvince} municipality={municipality} 
                    setMunicipality={setMunicipality} barangay={barangay} setBarangay={setBarangay} 
                    landmark={landmark} setLandmark={setLandmark}
                  />
                  
                  <SpecialtiesSection 
                    selectedCategories={selectedCategories} selectedCategoryIds={selectedCategoryIds}
                    selectedJobs={selectedJobs} selectedJobIds={selectedJobIds} customJobs={customJobs}
                    selectedSkills={selectedSkills} customSkills={customSkills}
                    selectedLanguages={selectedLanguages}
                    setCategoryModalVisible={setCategoryModalVisible} setJobModalVisible={setJobModalVisible} 
                    setSkillModalVisible={setSkillModalVisible} setLanguageModalVisible={setLanguageModalVisible}
                    isGeneralHousehelpSelected={isGeneralHousehelpSelected}
                  />
                  
                  <AboutSection 
                    bio={bio} setBio={setBio} educationLevel={educationLevel} setEducationLevel={setEducationLevel} 
                    experienceYears={experienceYears} setExperienceYears={setExperienceYears}
                  />
                  
                  <WorkPreferencesSection 
                    employmentType={employmentType} setEmploymentType={setEmploymentType} 
                    workSchedule={workSchedule} setWorkSchedule={setWorkSchedule} 
                    expectedSalary={expectedSalary} setExpectedSalary={setExpectedSalary} 
                    availabilityStatus={availabilityStatus} setAvailabilityStatus={setAvailabilityStatus}
                  />

                  <View style={{ height: 100 }} />
                </ScrollView>

                <View style={styles.footer}>
                  <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
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

      {/* Render Selection Modals */}
      <SelectionModal 
        visible={categoryModalVisible} onClose={() => setCategoryModalVisible(false)} title="Step 1: Select Category"
        data={availableCategories} selectedIds={selectedCategoryIds} onToggle={toggleCategory}
        searchValue="" onSearchChange={() => {}} idKey="category_id" nameKey="category_name" showSearch={false}
      />

      <SelectionModal 
        visible={jobModalVisible} onClose={() => setJobModalVisible(false)} title="Step 2: Select Jobs"
        data={filteredJobs} selectedIds={selectedJobIds} onToggle={toggleJob}
        searchValue={jobSearch} onSearchChange={setJobSearch} idKey="job_id" nameKey="job_title" showSearch={true}
        customData={customJobs} onAddCustom={(job: string) => setCustomJobs([...customJobs, job])} 
        onRemoveCustom={(job: string) => setCustomJobs(customJobs.filter(j => j !== job))}
      />

      <SelectionModal 
        visible={skillModalVisible} onClose={() => setSkillModalVisible(false)} title="Step 3: Select Skills"
        data={filteredSkills} selectedIds={selectedSkillIds} onToggle={toggleSkill}
        searchValue={skillSearch} onSearchChange={setSkillSearch} idKey="skill_id" nameKey="skill_name" showSearch={true}
        customData={customSkills} onAddCustom={(skill: string) => setCustomSkills([...customSkills, skill])} 
        onRemoveCustom={(skill: string) => setCustomSkills(customSkills.filter(s => s !== skill))}
      />

      <SelectionModal 
        visible={languageModalVisible} onClose={() => setLanguageModalVisible(false)} title="Languages"
        data={filteredLanguages} selectedIds={selectedLanguageIds} onToggle={toggleLanguage}
        searchValue={languageSearch} onSearchChange={setLanguageSearch} idKey="language_id" nameKey="language_name"
      />

      <NotificationModal visible={notifVisible} message={notifMessage} type={notifType} onClose={() => { setNotifVisible(false); if (notifType === 'success') onClose(); }} />
    </>
  );
}