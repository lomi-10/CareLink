// components/profile/ParentDocumentModal.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API_URL from '../../constants/api';

import NotificationModal from '../common/NotificationModal';
import LoadingSpinner from '../common/LoadingSpinner';

interface ParentDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

interface DocumentState {
  uri: string | null;
  name: string | null;
  type: string | null;
  base64?: string | null;
}

export default function ParentDocumentModal({ 
  visible, 
  onClose, 
  onSaveSuccess 
}: ParentDocumentModalProps) {
  
  // --- STATE ---
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Document State
  const [validIdDoc, setValidIdDoc] = useState<DocumentState>({ uri: null, name: null, type: null });

  // Existing document
  const [existingDoc, setExistingDoc] = useState<any>(null);

  // Notification
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
      setNotifMessage("Failed to load user data. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    }
  };

  /**
   * Fetch existing documents from server
   */
  const fetchExistingDocuments = async (uid: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/parent/get_documents.php?user_id=${uid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setExistingDoc(data.document);
      } else {
        setNotifMessage(data.message || "Failed to fetch documents");
        setNotifType('error');
        setNotifVisible(true);
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
      setNotifMessage("Network error while fetching documents. Please check your connection.");
      setNotifType('error');
      setNotifVisible(true);
    } finally {
      setLoading(false);
    }
  };

  /**
   * PICK IMAGE FROM GALLERY
   */
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setNotifMessage("Camera roll permission is required to upload documents.");
        setNotifType('error');
        setNotifVisible(true);
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        
        setValidIdDoc({
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'document.jpg',
          type: 'image/jpeg',
          base64: asset.base64 || null,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setNotifMessage("Failed to pick image. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    }
  };

  /**
   * PICK DOCUMENT/FILE
   */
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        setValidIdDoc({
          uri: result.uri,
          name: result.name,
          type: result.mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      setNotifMessage("Failed to pick document. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    }
  };

  /**
   * REMOVE SELECTED DOCUMENT
   */
  const removeDocument = () => {
    setValidIdDoc({ uri: null, name: null, type: null });
  };

  /**
   * VALIDATE DOCUMENT
   */
  const validateDocument = (): boolean => {
    if (!validIdDoc.uri) {
      setNotifMessage("Please select a document to upload.");
      setNotifType('error');
      setNotifVisible(true);
      return false;
    }
    return true;
  };

  /**
   * UPLOAD DOCUMENT TO SERVER
   */
  const handleUpload = async () => {
    // Validate
    if (!validateDocument()) return;

    setUploading(true);

    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append('user_id', userId || '');

      // Add Valid ID
      if (validIdDoc.uri) {
        const file: any = {
          uri: validIdDoc.uri,
          name: validIdDoc.name || 'valid_id.jpg',
          type: validIdDoc.type || 'image/jpeg',
        };
        formData.append('valid_id', file);
      }

      // Upload to server
      const response = await fetch(`${API_URL}/parent/upload_document.php`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNotifMessage("Document uploaded successfully! Your profile will be reviewed.");
        setNotifType('success');
        setNotifVisible(true);

        // Reset selection
        setValidIdDoc({ uri: null, name: null, type: null });

        // Call success callback
        if (onSaveSuccess) {
          setTimeout(() => onSaveSuccess(), 500);
        }
      } else {
        setNotifMessage(data.message || "Failed to upload document. Please try again.");
        setNotifType('error');
        setNotifVisible(true);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setNotifMessage("Network error occurred. Please check your connection and try again.");
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
      onClose();
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Document</Text>
              <TouchableOpacity onPress={onClose} disabled={uploading}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              
              {/* INSTRUCTIONS */}
              <View style={styles.instructionCard}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <View style={styles.instructionText}>
                  <Text style={styles.instructionTitle}>Document Requirement</Text>
                  <Text style={styles.instructionBody}>
                    Please upload a clear photo or scan of your valid government-issued ID. Accepted formats: JPG, PNG, PDF.
                  </Text>
                </View>
              </View>

              {/* EXISTING DOCUMENT SUMMARY */}
              {existingDoc && (
                <View style={styles.existingDocsCard}>
                  <Text style={styles.sectionLabel}>Current Document Status</Text>
                  <DocumentStatusSummary 
                    title="Valid ID"
                    hasDocument={existingDoc.has_document}
                    status={existingDoc.status}
                  />
                </View>
              )}

              {/* VALID ID UPLOAD */}
              <View style={styles.documentSection}>
                <Text style={styles.sectionLabel}>
                  Valid Government ID <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionHelper}>
                  PhilSys ID, Driver's License, Passport, or any government-issued ID
                </Text>

                {validIdDoc.uri ? (
                  <DocumentPreview 
                    doc={validIdDoc}
                    onRemove={removeDocument}
                  />
                ) : (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={pickImage}
                      disabled={uploading}
                    >
                      <Ionicons name="camera-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={pickDocument}
                      disabled={uploading}
                    >
                      <Ionicons name="folder-open-outline" size={24} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* NOTE */}
              <View style={styles.noteCard}>
                <Ionicons name="shield-checkmark" size={20} color="#28a745" />
                <Text style={styles.noteText}>
                  Your document will be securely reviewed for verification purposes only.
                </Text>
              </View>

              <View style={{height: 40}} />
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
                    <Text style={styles.uploadButtonText}>Upload Document</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      <LoadingSpinner visible={uploading} message="Uploading your document..." />

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

// --- STYLES (Same as DocumentManagementModal) ---
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