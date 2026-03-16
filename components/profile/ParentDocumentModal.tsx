// components/profile/ParentDocumentModal.tsx
// FIXED - Added Barangay Clearance, correct endpoint, responsive styles

import React, { useState, useEffect } from 'react';
import { 
  View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, 
  Image, Platform, ActivityIndicator, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import API_URL from '../../constants/api';

import { NotificationModal } from '../common';
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

const isWeb = Platform.OS === 'web';
const { width } = Dimensions.get('window');

export default function ParentDocumentModal({ 
  visible, 
  onClose, 
  onSaveSuccess 
}: ParentDocumentModalProps) {
  
  // STATE
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Document States
  const [validIdDoc, setValidIdDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [brgyClearanceDoc, setBrgyClearanceDoc] = useState<DocumentState>({ uri: null, name: null, type: null });

  // Existing documents
  const [existingDocs, setExistingDocs] = useState<any[]>([]);

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

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
        await fetchExistingDocuments(parsed.user_id);
      }
    } catch (error) {
      console.error("Failed to load user data", error);
      setNotifMessage("Failed to load user data. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    }
  };

  const fetchExistingDocuments = async (uid: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/parent/get_documents.php?user_id=${uid}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Handle both single object or array returns safely
        setExistingDocs(Array.isArray(data.documents) ? data.documents : (data.document ? [data.document] : []));
      }
    } catch (error) {
      console.error("Failed to fetch documents", error);
      // Don't show error if it's just "no documents" - that's expected for new users
    } finally {
      setLoading(false);
    }
  };

  const getDocStatus = (docType: string) => {
    const doc = existingDocs.find(d => d.document_type === docType);
    return doc ? doc.status : undefined;
  };

  const pickDocument = async (type: 'validId' | 'brgyClearance') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        let fileName = asset.name;
        const mimeType = asset.mimeType || '';
        
        if (!fileName.includes('.')) {
          if (mimeType.includes('pdf')) fileName += '.pdf';
          else if (mimeType.includes('png')) fileName += '.png';
          else fileName += '.jpg';
        }

        const docData = {
          uri: asset.uri,
          name: fileName,
          type: mimeType || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
        };

        if (type === 'validId') setValidIdDoc(docData);
        else setBrgyClearanceDoc(docData);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      setNotifMessage("Failed to pick document. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    }
  };

  const removeDocument = (type: 'validId' | 'brgyClearance') => {
    if (type === 'validId') setValidIdDoc({ uri: null, name: null, type: null });
    else setBrgyClearanceDoc({ uri: null, name: null, type: null });
  };

  const validateDocument = (): boolean => {
    if (!validIdDoc.uri && !brgyClearanceDoc.uri) {
      setNotifMessage("Please select at least one document to upload.");
      setNotifType('error');
      setNotifVisible(true);
      return false;
    }
    return true;
  };

  const handleUpload = async () => {
    if (!validateDocument()) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', userId || '');

      // Add Valid ID
      if (validIdDoc.uri) {
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(validIdDoc.uri);
            const blob = await response.blob();
            formData.append('valid_id', blob, validIdDoc.name || 'valid_id.jpg');
          } catch (err) {
            console.error('Error fetching document blob on web:', err);
            // @ts-ignore
            formData.append('valid_id', {
              uri: validIdDoc.uri,
              name: validIdDoc.name || 'valid_id.jpg',
              type: validIdDoc.type || 'application/octet-stream',
            });
          }
        } else {
          // MOBILE
          // @ts-ignore
          formData.append('valid_id', {
            uri: validIdDoc.uri,
            name: validIdDoc.name || 'valid_id.jpg',
            type: validIdDoc.type || 'application/octet-stream',
          });
        }
      }

      // Add Barangay Clearance
      if (brgyClearanceDoc.uri) {
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(brgyClearanceDoc.uri);
            const blob = await response.blob();
            formData.append('barangay_clearance', blob, brgyClearanceDoc.name || 'brgy_clearance.jpg');
          } catch (err) {
            console.error('Error fetching document blob on web:', err);
            // @ts-ignore
            formData.append('barangay_clearance', {
              uri: brgyClearanceDoc.uri,
              name: brgyClearanceDoc.name || 'brgy_clearance.jpg',
              type: brgyClearanceDoc.type || 'application/octet-stream',
            });
          }
        } else {
          // MOBILE
          // @ts-ignore
          formData.append('barangay_clearance', {
            uri: brgyClearanceDoc.uri,
            name: brgyClearanceDoc.name || 'brgy_clearance.jpg',
            type: brgyClearanceDoc.type || 'application/octet-stream',
          });
        }
      }

      const response = await fetch(`${API_URL}/parent/upload_documents.php`, {
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
        setNotifMessage(data.message || "Documents uploaded successfully!");
        setNotifType('success');
        setNotifVisible(true);

        // Reset selections
        setValidIdDoc({ uri: null, name: null, type: null });
        setBrgyClearanceDoc({ uri: null, name: null, type: null });

        // Call success callback
        if (onSaveSuccess) {
          setTimeout(() => onSaveSuccess(), 1500);
        }
      } else {
        setNotifMessage(data.message || "Failed to upload document. Please try again.");
        setNotifType('error');
        setNotifVisible(true);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setNotifMessage(error.message || "Network error occurred. Please try again.");
      setNotifType('error');
      setNotifVisible(true);
    } finally {
      setUploading(false);
    }
  };

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
          <View style={[styles.modalContainer, isWeb && styles.modalContainerWeb]}>
            
            {/* HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Documents</Text>
              <TouchableOpacity onPress={onClose} disabled={uploading}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              
              {/* INSTRUCTIONS */}
              <View style={styles.instructionCard}>
                <Ionicons name="information-circle" size={24} color="#007AFF" />
                <View style={styles.instructionText}>
                  <Text style={styles.instructionTitle}>Required Documents</Text>
                  <Text style={styles.instructionBody}>
                    Please upload a valid government-issued ID and your Barangay Clearance. 
                    These help us verify your account and ensure a safe community.
                  </Text>
                </View>
              </View>

              {/* EXISTING DOCUMENT STATUS */}
              {existingDocs.length > 0 && (
                <View style={styles.existingDocsCard}>
                  <Text style={styles.instructionTitle}>Current Document Status</Text>
                  <DocumentStatusSummary 
                    title="Valid ID"
                    hasDocument={!!getDocStatus('Valid ID')}
                    status={getDocStatus('Valid ID')}
                  />
                  <DocumentStatusSummary 
                    title="Barangay Clearance"
                    hasDocument={!!getDocStatus('Barangay Clearance')}
                    status={getDocStatus('Barangay Clearance')}
                  />
                </View>
              )}

              {/* UPLOAD SECTION 1: VALID ID */}
              <View style={styles.documentSection}>
                <Text style={styles.sectionLabel}>
                  Valid Government ID <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionHelper}>
                  Upload a clear photo or PDF of your government-issued ID
                </Text>

                {!validIdDoc.uri ? (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickDocument('validId')}
                    >
                      <Ionicons name="camera-outline" size={20} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DocumentPreview doc={validIdDoc} onRemove={() => removeDocument('validId')} />
                )}
              </View>

              {/* UPLOAD SECTION 2: BARANGAY CLEARANCE */}
              <View style={styles.documentSection}>
                <Text style={styles.sectionLabel}>
                  Barangay Clearance <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.sectionHelper}>
                  Upload a clear photo or PDF of your recent Barangay Clearance
                </Text>

                {!brgyClearanceDoc.uri ? (
                  <View style={styles.uploadButtons}>
                    <TouchableOpacity 
                      style={styles.uploadBtn}
                      onPress={() => pickDocument('brgyClearance')}
                    >
                      <Ionicons name="document-outline" size={20} color="#007AFF" />
                      <Text style={styles.uploadBtnText}>Choose File</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DocumentPreview doc={brgyClearanceDoc} onRemove={() => removeDocument('brgyClearance')} />
                )}
              </View>

              {/* NOTE */}
              <View style={styles.noteCard}>
                <Ionicons name="shield-checkmark" size={20} color="#28a745" />
                <Text style={styles.noteText}>
                  Your documents are encrypted and securely stored. They will only be used for verification purposes.
                </Text>
              </View>

              <View style={{height: 40}} />
            </ScrollView>

            {/* FOOTER */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[
                  styles.uploadButton, 
                  uploading && styles.uploadButtonDisabled,
                  isWeb && styles.uploadButtonWeb
                ]}
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

      <LoadingSpinner visible={uploading} message="Uploading your documents..." />

      <NotificationModal 
        visible={notifVisible}
        message={notifMessage}
        type={notifType}
        onClose={handleCloseNotification}
      />
    </>
  );
}

// HELPER COMPONENTS
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

interface DocumentStatusSummaryProps {
  title: string;
  hasDocument: boolean;
  status?: string;
}

function DocumentStatusSummary({ title, hasDocument, status }: DocumentStatusSummaryProps) {
  const getStatusIcon = () => {
    if (!hasDocument) return { name: 'close-circle', color: '#dc3545' };
    if (status === 'Verified') return { name: 'checkmark-circle', color: '#28a745' };
    if (status === 'Pending' || status === 'Pending Review') return { name: 'time', color: '#ffc107' };
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

// STYLES
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    width: '100%',
    height: '95%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalContainerWeb: {
    width: 600,
    height: '90%',
    borderRadius: 16,
    marginBottom: '2%',
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
  uploadButtonWeb: {
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
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