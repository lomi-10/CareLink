import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import API_URL from "../../constants/api";

import LabeledInput from '../common/LabeledInput';
import NotificationModal from '../common/NotificationModal'; // IMPORT THE NEW MODAL

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  
  // --- STATE ---
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [salary, setSalary] = useState('');
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // To show spinner while fetching

  // Notification State
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // --- FETCH SKILLS ON LOAD ---
  useEffect(() => {
    if (visible) {
        fetchSkills();
    }
  }, [visible]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      // Correct URL construction
      const response = await fetch(`${API_URL}/profile_setup/get_skills.php`);
      const data = await response.json();
      
      
      if (Array.isArray(data)) {
        setAvailableSkills(data);
      } else {
        console.error("Format error: Expected array", data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSave = () => {
    // Validation: Simple check
    if (selectedSkills.length === 0) {
        setNotifMessage("Please select at least one specialty.");
        setNotifType('error');
        setNotifVisible(true);
        return;
    }

    // TODO: Add your API Save logic here
    
    // Show Success Modal
    setNotifMessage("Profile details updated successfully!");
    setNotifType('success');
    setNotifVisible(true);
  };

  // When closing notification, check if it was success or error
  const handleCloseNotification = () => {
    setNotifVisible(false);
    if (notifType === 'success') {
        onClose(); // Close the Edit Modal too
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Edit Profile</Text>
             <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
             </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            
            {/* 1. Profile Picture Upload */}
            <View style={styles.centerUpload}>
              <TouchableOpacity onPress={pickImage} style={styles.uploadCircle}>
                {profileImage ? (
                   <Image source={{ uri: profileImage }} style={styles.imagePreview} />
                ) : (
                   <Ionicons name="camera-outline" size={40} color="#007AFF" />
                )}
              </TouchableOpacity>
              <Text style={styles.uploadLabel}>Change Profile Photo</Text>
            </View>

            {/* 2. Bio */}
            <LabeledInput 
              label="Bio (About Me)" 
              value={bio} 
              onChangeText={setBio} 
              placeholder="Tell us about yourself..." 
            />
            
            {/* 3. Salary */}
            <LabeledInput 
              label="Expected Salary (Monthly)" 
              value={salary} 
              onChangeText={setSalary} 
              keyboardType="numeric" 
              placeholder="e.g. 8000" 
            />

            {/* 4. Skills Selector */}
            <Text style={styles.sectionLabel}>Select Specialties</Text>
            
            {loading ? (
                <ActivityIndicator color="#007AFF" />
            ) : (
                <View style={styles.skillsGrid}>
                {availableSkills.map((skill, index) => (
                    <TouchableOpacity 
                    key={index}
                    style={[
                        styles.skillBtn, 
                        selectedSkills.includes(skill) && styles.skillBtnActive
                    ]}
                    onPress={() => toggleSkill(skill)}
                    >
                    <Text style={[
                        styles.skillBtnText,
                        selectedSkills.includes(skill) && styles.skillBtnTextActive
                    ]}>{skill}</Text>
                    </TouchableOpacity>
                ))}
                </View>
            )}

            {/* 5. Documents Button */}
            <TouchableOpacity style={styles.docButton}>
               <Ionicons name="cloud-upload-outline" size={20} color="#555" />
               <Text style={styles.docButtonText}>Manage Documents</Text>
            </TouchableOpacity>

            <View style={{height: 40}} /> 
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.modalFooter}>
             <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
               <Text style={styles.saveBtnText}>Save Changes</Text>
             </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* --- NOTIFICATION MODAL --- */}
      <NotificationModal 
        visible={notifVisible}
        message={notifMessage}
        type={notifType}
        onClose={handleCloseNotification}
      />

    </Modal>
  );
}

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
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalContent: { padding: 20 },
  centerUpload: { alignItems: 'center', marginBottom: 20 },
  uploadCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F0F8FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#007AFF', borderStyle: 'dashed',
  },
  imagePreview: { width: 100, height: 100, borderRadius: 50 },
  uploadLabel: { color: '#007AFF', marginTop: 8, fontSize: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 10 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  skillBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1, borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  skillBtnActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  skillBtnText: { color: '#555' },
  skillBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  docButton: {
    marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    backgroundColor: '#fafafa', gap: 10,
  },
  docButtonText: { color: '#333', fontWeight: '500' },
  modalFooter: {
    padding: 20, borderTopWidth: 1, borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  saveBtn: {
    backgroundColor: '#007AFF', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});