import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API_URL from "../../constants/api";

import LoadingSpinner from '../common/LoadingSpinner';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function EditProfileModal({ visible, onClose, onSaveSuccess }: EditProfileModalProps) {
  
  // --- STATE ---
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 1. Account & Personal Info
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [birthdate, setBirthdate] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState(''); // Male, Female
  const [civilStatus, setCivilStatus] = useState(''); // Single, Married, etc.
  
  // 2. Location
  const [barangay, setBarangay] = useState('');
  const [municipality, setMunicipality] = useState('');

  // 3. Professional Info
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState(''); // Elementary, High School, etc.
  const [workType, setWorkType] = useState(''); // Stay-in, Stay-out
  const [experienceYears, setExperienceYears] = useState('');
  const [languages, setLanguages] = useState(''); // Comma separated
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  
  // 4. Skills Management
  const [availableSkills, setAvailableSkills] = useState<any[]>([]); 
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillText, setCustomSkillText] = useState(''); 

  // --- OPTIONS FOR SELECTORS ---
  const genderOptions = ['Male', 'Female'];
  const civilStatusOptions = ['Single', 'Married', 'Widowed', 'Separated'];
  const workTypeOptions = ['Stay-in', 'Stay-out', 'On-call'];
  const educationOptions = ['Elementary', 'High School Grad', 'College Undergrad', 'College Grad', 'Vocational'];

  // --- LIFECYCLE ---
  useEffect(() => {
    if (visible) {
      loadInitialData();
    }
  }, [visible]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserId(parsed.user_id);
        
        await Promise.all([
            fetchProfileData(parsed.user_id),
            fetchReferenceSkills()
        ]);
      }
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileData = async (uid: string) => {
    try {
      const response = await fetch(`${API_URL}/helper/get_profile.php?user_id=${uid}`);
      const data = await response.json();

      if (data.success) {
        const p = data.profile || {};
        const u = data.user || {};

        // 1. Personal
        setProfileImage(p.profile_image || null);
        setUsername(u.username || '');
        setContactNumber(u.contact || p.contact_number || ''); 
        setBirthdate(p.birthdate || '');
        setGender(p.gender || '');
        setCivilStatus(p.civil_status || 'Single');
        
        // 2. Location
        setBarangay(p.barangay || '');
        setMunicipality(p.municipality || '');

        // 3. Professional
        setBio(p.bio || '');
        setEducation(p.education_level || '');
        setWorkType(p.work_type_preference || 'Stay-out');
        setExperienceYears(p.experience_years ? p.experience_years.toString() : '');
        setLanguages(p.languages_spoken || '');
        setSalaryMin(p.expected_salary_min ? p.expected_salary_min.toString() : '');
        setSalaryMax(p.expected_salary_max ? p.expected_salary_max.toString() : '');

        // 4. Skills
        const userSkills = data.skills || [];
        const userSkillNames = userSkills.map((s: any) => s.skill_name);
        setSelectedSkills(userSkillNames);
      }
    } catch (error) {
      console.error("Fetch profile error", error);
    }
  };

  const fetchReferenceSkills = async () => {
    try {
      const response = await fetch(`${API_URL}/helper/get_ref_skills.php`);
      const data = await response.json();
      if (data.success) {
        setAvailableSkills(data.data);
      }
    } catch (e) {
      console.log("Ref skills error", e);
    }
  };

  // --- ACTIONS ---

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
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

  const addCustomSkill = () => {
    const trimmed = customSkillText.trim();
    if (trimmed.length > 0) {
      if (!selectedSkills.includes(trimmed)) {
        setSelectedSkills([...selectedSkills, trimmed]);
      }
      setCustomSkillText(''); 
    }
  };

  const handleSave = async () => {
    if (!username || !contactNumber || !barangay || !municipality) {
      Alert.alert("Missing Info", "Please fill in all required personal information.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('user_id', userId || '');
      
      // Personal
      formData.append('username', username);
      formData.append('contact_number', contactNumber);
      formData.append('birthdate', birthdate);
      formData.append('gender', gender);
      formData.append('civil_status', civilStatus);
      
      // Location
      formData.append('barangay', barangay);
      formData.append('municipality', municipality);

      // Professional
      formData.append('bio', bio);
      formData.append('education_level', education);
      formData.append('work_type_preference', workType);
      formData.append('experience_years', experienceYears);
      formData.append('languages_spoken', languages);
      formData.append('expected_salary_min', salaryMin);
      formData.append('expected_salary_max', salaryMax || salaryMin); 
      formData.append('skills', JSON.stringify(selectedSkills));

      // Image
      if (profileImage && !profileImage.startsWith('http')) {
        const fileName = profileImage.split('/').pop() || 'profile.jpg';
        // @ts-ignore
        formData.append('profile_image', {
          uri: profileImage,
          name: fileName,
          type: 'image/jpeg',
        });
      }

      const response = await fetch(`${API_URL}/helper/update_profile.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Success", "Profile updated successfully!");
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        Alert.alert("Error", data.message || "Failed to update profile.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to render selection chips
  const renderChips = (options: string[], selected: string, setSelected: (val: string) => void) => (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, selected === opt && styles.chipActive]}
          onPress={() => setSelected(opt)}
        >
          <Text style={[styles.chipText, selected === opt && styles.chipTextActive]}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingSpinner visible={true} message="Loading..." />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* PHOTO SECTION */}
            <View style={styles.photoSection}>
              <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.photo} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={30} color="#007AFF" />
                  </View>
                )}
                <View style={styles.editIconBadge}>
                  <Ionicons name="pencil" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.photoLabel}>Change Photo</Text>
            </View>

            {/* 1. PERSONAL INFORMATION */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Personal Information</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Username <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={username} onChangeText={setUsername} />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Contact Number <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Birthdate (YYYY-MM-DD)</Text>
                  <TextInput style={styles.input} value={birthdate} onChangeText={setBirthdate} placeholder="1995-01-30" />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Gender</Text>
                   {/* Compact Gender Select */}
                   <View style={styles.compactRow}>
                    {genderOptions.map(g => (
                      <TouchableOpacity key={g} onPress={() => setGender(g)} style={[styles.miniChip, gender === g && styles.chipActive]}>
                        <Text style={[styles.miniChipText, gender === g && styles.chipTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                   </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Civil Status</Text>
                {renderChips(civilStatusOptions, civilStatus, setCivilStatus)}
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Barangay <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.input} value={barangay} onChangeText={setBarangay} />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Municipality <Text style={styles.required}>*</Text></Text>
                  <TextInput style={styles.input} value={municipality} onChangeText={setMunicipality} />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* 2. PROFESSIONAL DETAILS */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Professional Details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Work Preference</Text>
                {renderChips(workTypeOptions, workType, setWorkType)}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Education Level</Text>
                {renderChips(educationOptions, education, setEducation)}
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Experience (Years)</Text>
                  <TextInput style={styles.input} value={experienceYears} onChangeText={setExperienceYears} keyboardType="numeric" />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                   <Text style={styles.label}>Monthly Salary (₱)</Text>
                   <TextInput style={styles.input} value={salaryMin} onChangeText={setSalaryMin} keyboardType="numeric" placeholder="Minimum" />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Languages Spoken</Text>
                <TextInput style={styles.input} value={languages} onChangeText={setLanguages} placeholder="e.g. Tagalog, English, Bisaya" />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Bio / Introduction</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell families why they should hire you..."
                  multiline numberOfLines={4} value={bio} onChangeText={setBio}
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* 3. SKILLS */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Skills & Specialties</Text>
              
              <View style={styles.skillsContainer}>
                {availableSkills.map((skill: any) => {
                  const isSelected = selectedSkills.includes(skill.skill_name);
                  return (
                    <TouchableOpacity 
                      key={skill.skill_id} 
                      style={[styles.skillChip, isSelected && styles.skillChipSelected]}
                      onPress={() => toggleSkill(skill.skill_name)}
                    >
                      <Text style={[styles.skillText, isSelected && styles.skillTextSelected]}>
                        {skill.skill_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 15 }]}>Add Other Skill:</Text>
              <View style={styles.addSkillRow}>
                <TextInput
                  style={styles.addSkillInput} placeholder="e.g. Driving, Cooking"
                  value={customSkillText} onChangeText={setCustomSkillText}
                />
                <TouchableOpacity style={styles.addSkillBtn} onPress={addCustomSkill}>
                  <Text style={styles.addSkillBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: 10 }}>
                 <Text style={styles.subLabel}>Selected Skills:</Text>
                 <View style={styles.skillsContainer}>
                    {selectedSkills.map((skill, index) => (
                      <View key={index} style={[styles.skillChip, styles.skillChipSelected]}>
                        <Text style={styles.skillTextSelected}>{skill}</Text>
                        <TouchableOpacity onPress={() => toggleSkill(skill)} style={styles.removeSkillBtn}>
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                 </View>
              </View>
            </View>

            <View style={{ height: 60 }} />
          </ScrollView>
        )}

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveBtn, saving && styles.disabledBtn]} 
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

      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 10
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  cancelText: { fontSize: 16, color: '#666' },
  content: { padding: 20 },

  photoSection: { alignItems: 'center', marginBottom: 25 },
  photoContainer: { position: 'relative', marginBottom: 10 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { 
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0F2F5',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc'
  },
  editIconBadge: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#007AFF',
    width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff'
  },
  photoLabel: { color: '#007AFF', fontSize: 14, fontWeight: '500' },

  section: { marginBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  
  formGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  required: { color: '#dc3545' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#333',
    backgroundColor: '#FAFAFA'
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  compactRow: { flexDirection: 'row', gap: 5 },

  // CHIPS
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc',
  },
  chipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  miniChip: {
    flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA'
  },
  miniChipText: { fontSize: 14, color: '#333' },

  // SKILLS
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#F0F2F5', borderWidth: 1, borderColor: '#E0E0E0'
  },
  skillChipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  skillText: { fontSize: 14, color: '#333' },
  skillTextSelected: { color: '#fff', fontWeight: '500' },
  removeSkillBtn: { marginLeft: 6 },
  subLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },

  addSkillRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  addSkillInput: { 
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, 
    paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FAFAFA' 
  },
  addSkillBtn: { 
    backgroundColor: '#28a745', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' 
  },
  addSkillBtnText: { color: '#fff', fontWeight: '600' },

  footer: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#fff'
  },
  saveBtn: {
    backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center'
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { backgroundColor: '#ccc' },
});