// components/profile/DocumentManagementModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, Alert, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API_URL from '../../constants/api';

import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface DocumentManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

/**
 * DOCUMENT TYPES
 * These are the three required documents for helper verification
 */
type DocumentType = 'philsys' | 'barangay' | 'nbi_police';

interface DocumentState {
  uri: string | null;
  name: string | null;
  type: string | null;
  base64?: string | null;
}

export default function DocumentManagementModal({ 
  visible, 
  onClose, 
  onSaveSuccess 
}: DocumentManagementModalProps) {
  
  // --- STATE MANAGEMENT ---
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Document States
  const [philsysDoc, setPhilsysDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [barangayDoc, setBarangayDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [nbiPoliceDoc, setNbiPoliceDoc] = useState<DocumentState>({ uri: null, name: null, type: null });

  // Existing documents from server
  const [existingDocs, setExistingDocs] = useState<any>(null);

  // Notification state
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  // --- LIFECYCLE ---
  useEffect(() => {
    if (visible) {
      loadUserData();
    }
  }, [visible]);

  /**
   * Load user ID and fetch existing documents
   */
  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserId(parsed.user_id);
        await fetchExistingDocuments(parsed.user_id);
      }
    } catch (error) {
      console.error("Failed to load user data", error);
    }
  };

  /**
   * Fetch existing documents from server
   */
  const fetchExistingDocuments = async (uid: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/helper/get_documents.php?user_id=${uid}`);
      const data = await response.json();
      
      if (data.success) {
        setExistingDocs(data.documents);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * PICK IMAGE FROM GALLERY
   * Users can select images (photos of their documents)
   */
  const pickImage = async (docType: DocumentType) => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload documents.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8, // Compress to reduce file size
        base64: true, // Get base64 for easier upload
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        
        // Update appropriate state
        const docState: DocumentState = {
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'document.jpg',
          type: 'image/jpeg',
          base64: asset.base64 || null,
        };

        switch (docType) {
          case 'philsys':
            setPhilsysDoc(docState);
            break;
          case 'barangay':
            setBarangayDoc(docState);
            break;
          case 'nbi_police':
            setNbiPoliceDoc(docState);
            break;
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  /**
   * PICK DOCUMENT/FILE
   * Alternative to image picker - allows PDF uploads
   */
  const pickDocument = async (docType: DocumentType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const docState: DocumentState = {
          uri: result.uri,
          name: result.name,
          type: result.mimeType || 'application/pdf',
        };

        switch (docType) {
          case 'philsys':
            setPhilsysDoc(docState);
            break;
          case 'barangay':
            setBarangayDoc(docState);
            break;
          case 'nbi_police':
            setNbiPoliceDoc(docState);
            break;
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  /**
   * REMOVE SELECTED DOCUMENT
   */
  const removeDocument = (docType: DocumentType) => {
    switch (docType) {
      case 'philsys':
        setPhilsysDoc({ uri: null, name: null, type: null });
        break;
      case 'barangay':
        setBarangayDoc({ uri: null, name: null, type: null });
        break;
      case 'nbi_police':
        setNbiPoliceDoc({ uri: null, name: null, type: null });
        break;
    }
  };

  /**
   * VALIDATE DOCUMENTS
   * Check if at least one document is selected
   */
  const validateDocuments = (): boolean => {
    if (!philsysDoc.uri && !barangayDoc.uri && !nbiPoliceDoc.uri) {
      setNotifMessage("Please select at least one document to upload.");
      setNotifType('error');
      setNotifVisible(true);
      return false;
    }
    return true;
  };

  /**
   * UPLOAD DOCUMENTS TO SERVER
   */
  const handleUpload = async () => {
    // Validate
    if (!validateDocuments()) return;

    setUploading(true);

    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append('user_id', userId || '');

      // Add PhilSys ID if selected
      if (philsysDoc.uri) {
        const philsysFile: any = {
          uri: philsysDoc.uri,
          name: philsysDoc.name || 'philsys.jpg',
          type: philsysDoc.type || 'image/jpeg',
        };
        formData.append('philsys_id', philsysFile);
      }

      // Add Barangay Clearance if selected
      if (barangayDoc.uri) {
        const barangayFile: any = {
          uri: barangayDoc.uri,
          name: barangayDoc.name || 'barangay.jpg',
          type: barangayDoc.type || 'image/jpeg',
        };
        formData.append('barangay_clearance', barangayFile);
      }

      // Add NBI/Police Clearance if selected
      if (nbiPoliceDoc.uri) {
        const nbiFile: any = {
          uri: nbiPoliceDoc.uri,
          name: nbiPoliceDoc.name || 'nbi.jpg',
          type: nbiPoliceDoc.type || 'image/jpeg',
        };
        formData.append('nbi_police_clearance', nbiFile);
      }

      // Upload to server
      const response = await fetch(`${API_URL}/helper/upload_documents.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.success) {
        setNotifMessage("Documents uploaded successfully! Your profile will be reviewed by PESO.");
        setNotifType('success');
        setNotifVisible(true);

        // Reset selections
        setPhilsysDoc({ uri: null, name: null, type: null });
        setBarangayDoc({ uri: null, name: null, type: null });
        setNbiPoliceDoc({ uri: null, name: null, type: null });

        // Call success callback
        if (onSaveSuccess) {
          setTimeout(() => onSaveSuccess(), 500);
        }
      } else {
        setNotifMessage(data.message || "Failed to upload documents. Please try again.");
        setNotifType('error');
        setNotifVisible(true);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setNotifMessage("Network error. Please check your connection and try again.");
      setNotifType('error');
      setNotifVisible(true);
    } finally {
      setUploading(false);
    }
  };

  /**
   * CLOSE NOTIFICATION
   */
  const handleCloseNotification = () => {
    setNotifVisible(false);
    if (notifType === 'success') {
      onClose(); // Close modal on success
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Documents</Text>
              <TouchableOpacity onPress={onClose} disabled={uploading}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* CONTENT */}
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              
              {/* INSTRUCTIONS */}
              <View style={styles.instructionCard}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <View style={styles.instructionText}>
                  <Text style={styles.instructionTitle}>Document Requirements</Text>
                  <Text style={styles.instructionBody}>
                    Please upload clear photos or scans of your documents. Accepted formats: JPG, PNG, PDF.
                  </Text>
                </View>
              </View>

              {/* EXISTING DOCUMENTS SUMMARY */}
              {existingDocs && (
                <View style={styles.existingDocsCard}>
                  <Text style={styles.sectionLabel}>Current Documents Status</Text>
                  <DocumentStatusSummary 
                    title="PhilSys ID"
                    hasDocument={existingDocs.philsys_id}
                    status={existingDocs.philsys_status}
                  />
                  <DocumentStatusSummary 
                    title="Barangay Clearance"
                    hasDocument={existingDocs.barangay_clearance}
                    status={existingDocs.barangay_status}
                  />
                  <DocumentStatusSummary 
                    title="NBI/Police Clearance"
                    hasDocument={existingDocs.nbi_police_clearance}
                    status={existingDocs.nbi_status}
                  />
                </View>
              )}

              {/* 1. PHILSYS ID */}
              <View style={styles.documentSection}>
                <Text style={styles.sectionLabel}>
                  1. PhilSys ID <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionHelper}>
                  Your valid Philippine Identification System ID
                </Text>

                {philsysDoc.uri ? (
                  <DocumentPreview 
                    doc={philsysDoc}
                    onRemove={() => removeDocument('philsys')}
                  />
                ) : (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickImage('philsys')}
                      disabled={uploading}
                    >
                      <Ionicons name="camera-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickDocument('philsys')}
                      disabled={uploading}
                    >
                      <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 2. BARANGAY CLEARANCE */}
              <View style={styles.documentSection}>
                <Text style={styles.sectionLabel}>
                  2. Barangay Clearance <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionHelper}>
                  Certificate of good moral character from your barangay
                </Text>

                {barangayDoc.uri ? (
                  <DocumentPreview 
                    doc={barangayDoc}
                    onRemove={() => removeDocument('barangay')}
                  />
                ) : (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickImage('barangay')}
                      disabled={uploading}
                    >
                      <Ionicons name="camera-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickDocument('barangay')}
                      disabled={uploading}
                    >
                      <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* 3. NBI/POLICE CLEARANCE */}
              <View style={styles.documentSection}>
                <Text style={styles.sectionLabel}>
                  3. NBI or Police Clearance <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionHelper}>
                  Valid NBI clearance or Police clearance certificate
                </Text>

                {nbiPoliceDoc.uri ? (
                  <DocumentPreview 
                    doc={nbiPoliceDoc}
                    onRemove={() => removeDocument('nbi_police')}
                  />
                ) : (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickImage('nbi_police')}
                      disabled={uploading}
                    >
                      <Ionicons name="camera-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickDocument('nbi_police')}
                      disabled={uploading}
                    >
                      <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* IMPORTANT NOTE */}
              <View style={styles.noteCard}>
                <Ionicons name="shield-checkmark" size={20} color="#28a745" />
                <Text style={styles.noteText}>
                  Your documents will be securely reviewed by PESO officials for verification.
                </Text>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* FOOTER */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                    <Text style={styles.uploadButtonText}>Upload Documents</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* LOADING SPINNER */}
      <LoadingSpinner visible={uploading} message="Uploading your documents..." />

      {/* NOTIFICATION MODAL */}
      <NotificationModal 
        visible={notifVisible}
        message={notifMessage}
        type={notifType}
        onClose={handleCloseNotification}
      />
    </>
  );
}

/**
 * HELPER COMPONENT: Document Preview
 * Shows selected document with option to remove
 */
interface DocumentPreviewProps {
  doc: DocumentState;
  onRemove: () => void;
}

function DocumentPreview({ doc, onRemove }: DocumentPreviewProps) {
  const isImage = doc.type?.startsWith('image/');

  return (
    <View style={styles.previewContainer}>
      {isImage && doc.uri ? (
        <Image source={{ uri: doc.uri }} style={styles.previewImage} />
      ) : (
        <View style={styles.previewPlaceholder}>
          <Ionicons name="document-text" size={40} color="#007AFF" />
          <Text style={styles.previewFileName}>{doc.name}</Text>
        </View>
      )}
      
      <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
        <Ionicons name="close-circle" size={24} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * HELPER COMPONENT: Document Status Summary
 * Shows existing document status
 */
interface DocumentStatusSummaryProps {
  title: string;
  hasDocument: boolean;
  status?: string;
}

function DocumentStatusSummary({ title, hasDocument, status }: DocumentStatusSummaryProps) {
  const getStatusIcon = () => {
    if (!hasDocument) return { name: 'close-circle', color: '#dc3545' };
    if (status === 'verified') return { name: 'checkmark-circle', color: '#28a745' };
    if (status === 'pending') return { name: 'time', color: '#ffc107' };
    return { name: 'alert-circle', color: '#6c757d' };
  };

  const icon = getStatusIcon();

  return (
    <View style={styles.statusSummaryRow}>
      <Ionicons name={icon.name as any} size={20} color={icon.color} />
      <Text style={styles.statusSummaryText}>{title}</Text>
      <Text style={[styles.statusSummaryLabel, { color: icon.color }]}>
        {hasDocument ? (status || 'Uploaded') : 'Not Uploaded'}
      </Text>
    </View>
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
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // INSTRUCTION CARD
  instructionCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  instructionText: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructionBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },

  // EXISTING DOCS
  existingDocsCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  statusSummaryText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  statusSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // DOCUMENT SECTION
  documentSection: {
    marginBottom: 30,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  required: {
    color: '#FF3B30',
  },
  sectionHelper: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    lineHeight: 18,
  },

  // UPLOAD BUTTONS
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  // PREVIEW
  previewContainer: {
    position: 'relative',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#28a745',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  previewPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  previewFileName: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // NOTE CARD
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 10,
    gap: 10,
    alignItems: 'center',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#28a745',
    lineHeight: 18,
  },

  // FOOTER
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});