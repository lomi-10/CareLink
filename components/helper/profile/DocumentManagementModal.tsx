// components/profile/DocumentManagementModal.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

import { FormModalLayout, NotificationModal } from '@/components/shared';

interface DocumentManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

/**
 * NEW DATABASE DOCUMENT TYPES:
 * - Barangay Clearance (REQUIRED)
 * - Valid ID (REQUIRED - PhilSys, Passport, Driver's License, etc.)
 * - Police Clearance (OPTIONAL)
 * - TESDA NC2 (OPTIONAL)
 */

interface DocumentState {
  uri: string | null;
  name: string | null;
  type: string | null;
}

export default function DocumentManagementModal({ 
  visible, 
  onClose, 
  onSaveSuccess 
}: DocumentManagementModalProps) {
  
  // State
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Documents
  const [barangayDoc, setBarangayDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [validIdDoc, setValidIdDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [policeDoc, setPoliceDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [tesdaDoc, setTesdaDoc] = useState<DocumentState>({ uri: null, name: null, type: null });

  // Valid ID type (PhilSys, Passport, Driver's License, etc.)
  const [idType, setIdType] = useState('PhilSys (recommended)');
  const [idTypeModalVisible, setIdTypeModalVisible] = useState(false);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // ID Type options
  const idTypes = [
    'PhilSys (recommended)',
    'Passport',
    'Driver\'s License',
    'Voter\'s ID',
    'PRC ID',
    'SSS ID',
    'GSIS ID',
    'Postal ID',
    'Other'
  ];

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

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
      }
    } catch (error) {
      console.error("Failed to load user data", error);
    }
  };

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotifMessage(msg);
    setNotifType(type);
    setNotifVisible(true);
  };

  // ============================================================================
  // DOCUMENT PICKER
  // ============================================================================

  const pickDocument = async (
    docType: 'barangay' | 'valid_id' | 'police' | 'tesda',
    setDoc: React.Dispatch<React.SetStateAction<DocumentState>>
  ) => {
    try {
      // Create an option menu or just use DocumentPicker which is more flexible
      // For images and PDFs, DocumentPicker is often better if we want both
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // Ensure name has an extension, especially for web/blob URIs
        let fileName = asset.name;
        const mimeType = asset.mimeType || '';
        
        if (!fileName.includes('.')) {
          if (mimeType.includes('pdf')) fileName += '.pdf';
          else if (mimeType.includes('png')) fileName += '.png';
          else fileName += '.jpg';
        }

        setDoc({
          uri: asset.uri,
          name: fileName,
          type: mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        });
      }
    } catch (error) {
      console.error('Document pick error:', error);
      showNotification('Failed to pick document', 'error');
    }
  };

  const removeDocument = (
    setDoc: React.Dispatch<React.SetStateAction<DocumentState>>
  ) => {
    setDoc({ uri: null, name: null, type: null });
  };

  // ============================================================================
  // UPLOAD
  // ============================================================================

  const handleUpload = async () => {
    if (!barangayDoc.uri) return showNotification('Barangay Clearance is required.', 'error');
    if (!validIdDoc.uri)  return showNotification('Valid ID is required.', 'error');

    if (!userId) {
      return showNotification('User ID not found', 'error');
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('id_type', idType); // For Valid ID

      // Function to prepare document for upload
      const prepareDoc = async (doc: DocumentState, fieldName: string) => {
        if (!doc.uri) return;
        
        if (Platform.OS === 'web') {
          try {
            const res = await fetch(doc.uri);
            const blob = await res.blob();
            formData.append(fieldName, blob, doc.name || 'file');
          } catch (err) {
            console.error(`Error fetching blob for ${fieldName}:`, err);
            // Fallback for some web cases
            // @ts-ignore
            formData.append(fieldName, { uri: doc.uri, name: doc.name || 'file', type: doc.type || 'application/octet-stream' });
          }
        } else {
          // @ts-ignore
          formData.append(fieldName, { uri: doc.uri, name: doc.name || 'file', type: doc.type || 'application/octet-stream' });
        }
      };

      // Add all documents to FormData
      await prepareDoc(barangayDoc, 'barangay_clearance');
      await prepareDoc(validIdDoc, 'valid_id');
      await prepareDoc(policeDoc, 'police_clearance');
      await prepareDoc(tesdaDoc, 'tesda_nc2');

      const response = await fetch(`${API_URL}/helper/upload_documents.php`, {
        method: 'POST',
        body: formData,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Server response was not JSON:', text);
        throw new Error('Server sent an invalid response format.');
      }

      if (data.success) {
        showNotification(data.message || 'Documents uploaded successfully!', 'success');
        
        // Reset
        setBarangayDoc({ uri: null, name: null, type: null });
        setValidIdDoc({ uri: null, name: null, type: null });
        setPoliceDoc({ uri: null, name: null, type: null });
        setTesdaDoc({ uri: null, name: null, type: null });

        if (onSaveSuccess) {
          setTimeout(() => {
            onSaveSuccess();
            onClose(); // Close after success
          }, 1500);
        } else {
          setTimeout(() => onClose(), 1500);
        }
      } else {
        showNotification(data.message || 'Upload failed', 'error');
      }
    } catch (error: any) {
      console.error('Upload Error:', error);
      showNotification(`${error.message || 'An error occurred during upload'}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <FormModalLayout
        visible={visible}
        onClose={onClose}
        title="Upload Documents"
        subtitle="Required for PESO verification · JPG, PNG, or PDF"
        accent="helper"
        variant="wide"
        scrollContentStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        footer={
          <TouchableOpacity
            style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Submit Documents</Text>
            )}
          </TouchableOpacity>
        }
      >
            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#059669" />
              <Text style={styles.infoText}>
                Upload clear photos. Accepted: JPG, PNG, PDF
              </Text>
            </View>

            {/* Barangay Clearance - REQUIRED */}
            <View style={styles.docCard}>
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docTitle}>
                    Barangay Clearance <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <Text style={styles.docSubtitle}>Required by PESO</Text>
                </View>
                {barangayDoc.uri ? (
                  <View style={styles.docActions}>
                    <TouchableOpacity onPress={() => removeDocument(setBarangayDoc)}>
                      <Ionicons name="trash" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => pickDocument('barangay', setBarangayDoc)}
                  >
                    <Ionicons name="cloud-upload" size={18} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
              {barangayDoc.uri && (
                <View style={styles.docPreview}>
                  <Ionicons name="document" size={16} color="#007AFF" />
                  <Text style={styles.docName} numberOfLines={1}>
                    {barangayDoc.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Valid ID - REQUIRED */}
            <View style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle}>
                    Valid ID <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <Text style={styles.docSubtitle}>PhilSys, Passport, etc.</Text>
                  
                  {/* ID Type Selector */}
                  <TouchableOpacity 
                    style={styles.idTypeBtn}
                    onPress={() => setIdTypeModalVisible(true)}
                  >
                    <Text style={styles.idTypeText}>Type: {idType}</Text>
                    <Ionicons name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
                {validIdDoc.uri ? (
                  <TouchableOpacity onPress={() => removeDocument(setValidIdDoc)}>
                    <Ionicons name="trash" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.uploadBtn} 
                    onPress={() => pickDocument('valid_id', setValidIdDoc)}
                  >
                    <Ionicons name="cloud-upload" size={18} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
              {validIdDoc.uri && (
                <View style={styles.docPreview}>
                  <Ionicons name="document" size={16} color="#007AFF" />
                  <Text style={styles.docName} numberOfLines={1}>
                    {validIdDoc.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Police Clearance - OPTIONAL */}
            <View style={styles.docCard}>
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docTitle}>Police Clearance</Text>
                  <Text style={styles.docSubtitle}>Optional (recommended)</Text>
                </View>
                {policeDoc.uri ? (
                  <TouchableOpacity onPress={() => removeDocument(setPoliceDoc)}>
                    <Ionicons name="trash" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.uploadBtn, styles.uploadBtnSecondary]} 
                    onPress={() => pickDocument('police', setPoliceDoc)}
                  >
                    <Ionicons name="cloud-upload" size={18} color="#007AFF" />
                    <Text style={styles.uploadBtnTextSecondary}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
              {policeDoc.uri && (
                <View style={styles.docPreview}>
                  <Ionicons name="document" size={16} color="#007AFF" />
                  <Text style={styles.docName} numberOfLines={1}>
                    {policeDoc.name}
                  </Text>
                </View>
              )}
            </View>

            {/* TESDA NC2 - OPTIONAL */}
            <View style={styles.docCard}>
              <View style={styles.docHeader}>
                <View>
                  <Text style={styles.docTitle}>TESDA NC2</Text>
                  <Text style={styles.docSubtitle}>Optional (good to have)</Text>
                </View>
                {tesdaDoc.uri ? (
                  <TouchableOpacity onPress={() => removeDocument(setTesdaDoc)}>
                    <Ionicons name="trash" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.uploadBtn, styles.uploadBtnSecondary]} 
                    onPress={() => pickDocument('tesda', setTesdaDoc)}
                  >
                    <Ionicons name="cloud-upload" size={18} color="#007AFF" />
                    <Text style={styles.uploadBtnTextSecondary}>Upload</Text>
                  </TouchableOpacity>
                )}
              </View>
              {tesdaDoc.uri && (
                <View style={styles.docPreview}>
                  <Ionicons name="document" size={16} color="#007AFF" />
                  <Text style={styles.docName} numberOfLines={1}>
                    {tesdaDoc.name}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 48 }} />
      </FormModalLayout>

      {/* ID Type Selection Modal */}
      <Modal visible={idTypeModalVisible} animationType="slide" transparent>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setIdTypeModalVisible(false)}
        >
          <View style={styles.idTypeModal}>
            <Text style={styles.idTypeModalTitle}>Select ID Type</Text>
            {idTypes.map((type) => (
              <TouchableOpacity 
                key={type}
                style={styles.idTypeOption}
                onPress={() => {
                  setIdType(type);
                  setIdTypeModalVisible(false);
                }}
              >
                <Text style={styles.idTypeOptionText}>{type}</Text>
                {idType === type && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

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
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
  },
  docCard: {
    backgroundColor: '#f8f8f8',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requiredMark: {
    color: '#FF3B30',
    fontWeight: '700',
  },
  docSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  docActions: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 6,
  },
  uploadBtnSecondary: {
    backgroundColor: '#E3F2FD',
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  uploadBtnTextSecondary: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '500',
  },
  docPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    gap: 8,
  },
  docName: {
    flex: 1,
    fontSize: 13,
    color: '#333',
  },
  idTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  idTypeText: {
    fontSize: 13,
    color: '#333',
  },
  submitBtn: {
    alignSelf: 'stretch',
    backgroundColor: theme.color.helper,
    padding: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  idTypeModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  idTypeModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  idTypeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  idTypeOptionText: {
    fontSize: 15,
    color: '#333',
  },
});
