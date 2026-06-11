// components/parent/profile/ParentDocumentModal.tsx
// Upload Valid ID and Barangay Clearance for parent (PESO) verification.
// PHP: parent/get_documents.php (status check), parent/upload_documents.php (upload)

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';

import { FormModalLayout, NotificationModal } from '@/components/shared';

interface ParentDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

interface DocumentState {
  uri: string | null;
  name: string | null;
  type: string | null;
}

const DOC_VALID_ID = 'Valid ID';
const DOC_BRGY = 'Barangay Clearance';

function mergeLatestDocsPerType(docs: any[]): any[] {
  const m = new Map<string, any>();
  for (const d of docs) {
    const t = d.document_type as string;
    const cur = m.get(t);
    if (!cur || Number(d.document_id) > Number(cur.document_id)) m.set(t, d);
  }
  return Array.from(m.values());
}

function isLockedDocStatus(status?: string): boolean {
  const s = (status || '').trim();
  return s === 'Verified' || s === 'Pending';
}

function LockedParentDocCard({
  title,
  subtitle,
  status,
  fileUrl,
}: {
  title: string;
  subtitle: string;
  status: string;
  fileUrl?: string;
}) {
  const open = () => {
    if (fileUrl) Linking.openURL(fileUrl).catch(() => {});
  };
  return (
    <View style={styles.lockedCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text style={styles.docSubtitle}>{subtitle}</Text>
        <Text style={styles.lockedStatus}>{status}</Text>
      </View>
      {fileUrl ? (
        <TouchableOpacity onPress={open} style={styles.openLink}>
          <Ionicons name="open-outline" size={18} color="#007AFF" />
          <Text style={styles.openLinkText}>Open</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function ParentDocumentModal({
  visible,
  onClose,
  onSaveSuccess,
}: ParentDocumentModalProps) {

  // STATE
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);

  // Document States
  const [brgyDoc, setBrgyDoc] = useState<DocumentState>({ uri: null, name: null, type: null });
  const [validIdDoc, setValidIdDoc] = useState<DocumentState>({ uri: null, name: null, type: null });

  // Notification
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (visible) {
      setBrgyDoc({ uri: null, name: null, type: null });
      setValidIdDoc({ uri: null, name: null, type: null });
      loadUserData();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (userData) {
        const parsed = JSON.parse(userData);
        const uid = String(parsed.user_id);
        setUserId(uid);
        await fetchExistingDocuments(uid);
      }
    } catch (error) {
      console.error('Failed to load user data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingDocuments = async (uid: string) => {
    try {
      const res = await fetch(`${API_URL}/parent/get_documents.php?user_id=${encodeURIComponent(uid)}`);
      const data = await res.json();
      const raw = Array.isArray(data.documents) ? data.documents : data.document ? [data.document] : [];
      setExistingDocs(mergeLatestDocsPerType(raw));
    } catch (e) {
      console.error('fetchExistingDocuments', e);
      setExistingDocs([]);
    }
  };

  const getDoc = (documentType: string) => existingDocs.find((d) => d.document_type === documentType);

  const brgyRec = getDoc(DOC_BRGY);
  const validRec = getDoc(DOC_VALID_ID);

  const needsBrgyUpload = !brgyRec || brgyRec.status === 'Rejected';
  const needsValidUpload = !validRec || validRec.status === 'Rejected';
  const nothingToSubmit = !needsBrgyUpload && !needsValidUpload;

  const showNotification = (msg: string, type: 'success' | 'error') => {
    setNotifMessage(msg);
    setNotifType(type);
    setNotifVisible(true);
  };

  // ============================================================================
  // DOCUMENT PICKER
  // ============================================================================

  const pickDocument = async (
    setDoc: React.Dispatch<React.SetStateAction<DocumentState>>
  ) => {
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
    if (!userId) {
      return showNotification('User ID not found', 'error');
    }
    if (needsBrgyUpload && !brgyDoc.uri) {
      return showNotification('Please choose a Barangay Clearance file to upload.', 'error');
    }
    if (needsValidUpload && !validIdDoc.uri) {
      return showNotification('Please choose a Valid ID file to upload.', 'error');
    }
    if (!brgyDoc.uri && !validIdDoc.uri) {
      return showNotification('Select at least one file to upload.', 'error');
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('user_id', userId);

      const prepareDoc = async (doc: DocumentState, fieldName: string) => {
        if (!doc.uri) return;

        if (Platform.OS === 'web') {
          try {
            const res = await fetch(doc.uri);
            const blob = await res.blob();
            formData.append(fieldName, blob, doc.name || 'file');
          } catch (err) {
            console.error(`Error fetching blob for ${fieldName}:`, err);
            // @ts-ignore
            formData.append(fieldName, { uri: doc.uri, name: doc.name || 'file', type: doc.type || 'application/octet-stream' });
          }
        } else {
          // @ts-ignore
          formData.append(fieldName, { uri: doc.uri, name: doc.name || 'file', type: doc.type || 'application/octet-stream' });
        }
      };

      await prepareDoc(brgyDoc, 'barangay_clearance');
      await prepareDoc(validIdDoc, 'valid_id');

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
        showNotification(data.message || 'Documents uploaded successfully!', 'success');

        // Reset
        setBrgyDoc({ uri: null, name: null, type: null });
        setValidIdDoc({ uri: null, name: null, type: null });

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
        accent="parent"
        variant="wide"
        loading={loading}
        loadingText="Loading your documents..."
        scrollContentStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        footer={
          !loading ? (
            nothingToSubmit ? (
              <View style={styles.footerAllSet}>
                <Ionicons name="checkmark-circle" size={22} color="#15803d" />
                <Text style={styles.footerAllSetText}>
                  All documents are on file. You only need to return here if PESO rejects a file or you want to add a replacement later.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Submit upload</Text>
                )}
              </TouchableOpacity>
            )
          ) : null
        }
      >
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <Text style={styles.infoText}>
                {nothingToSubmit
                  ? 'Your documents are on file (verified or pending). Upload only files PESO rejected.'
                  : 'Upload clear photos. Accepted: JPG, PNG, PDF. You can submit only the document(s) that need replacing.'}
              </Text>
            </View>

            {/* Barangay Clearance — on file or replace */}
            {brgyRec && isLockedDocStatus(brgyRec.status) ? (
              <LockedParentDocCard
                title="Barangay Clearance"
                subtitle="Required · on file"
                status={brgyRec.status}
                fileUrl={brgyRec.file_url}
              />
            ) : (
              <View style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>
                      Barangay Clearance <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <Text style={styles.docSubtitle}>
                      {brgyRec?.status === 'Rejected'
                        ? 'PESO rejected this file — upload a replacement.'
                        : 'Required by PESO'}
                    </Text>
                    {brgyRec?.status === 'Rejected' && brgyRec.rejection_reason ? (
                      <Text style={styles.rejectHint}>{String(brgyRec.rejection_reason)}</Text>
                    ) : null}
                  </View>
                  {!brgyDoc.uri ? (
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={() => pickDocument(setBrgyDoc)}
                    >
                      <Ionicons name="cloud-upload" size={18} color="#fff" />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => removeDocument(setBrgyDoc)}>
                      <Ionicons name="trash" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
                {brgyDoc.uri ? (
                  <View style={styles.docPreview}>
                    <Ionicons name="document" size={16} color="#007AFF" />
                    <Text style={styles.docName} numberOfLines={1}>
                      {brgyDoc.name}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Valid ID — on file or replace */}
            {validRec && isLockedDocStatus(validRec.status) ? (
              <LockedParentDocCard
                title="Valid ID"
                subtitle={validRec.id_type ? String(validRec.id_type) : 'Required · on file'}
                status={validRec.status}
                fileUrl={validRec.file_url}
              />
            ) : (
              <View style={styles.docCard}>
                <View style={styles.docHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>
                      Valid ID <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <Text style={styles.docSubtitle}>
                      {validRec?.status === 'Rejected'
                        ? 'PESO rejected this file — upload a replacement.'
                        : "PhilSys, Passport, Driver's License, etc."}
                    </Text>
                    {validRec?.status === 'Rejected' && validRec.rejection_reason ? (
                      <Text style={styles.rejectHint}>{String(validRec.rejection_reason)}</Text>
                    ) : null}
                  </View>
                  {!validIdDoc.uri ? (
                    <TouchableOpacity
                      style={styles.uploadBtn}
                      onPress={() => pickDocument(setValidIdDoc)}
                    >
                      <Ionicons name="cloud-upload" size={18} color="#fff" />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => removeDocument(setValidIdDoc)}>
                      <Ionicons name="trash" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
                {validIdDoc.uri ? (
                  <View style={styles.docPreview}>
                    <Ionicons name="document" size={16} color="#007AFF" />
                    <Text style={styles.docName} numberOfLines={1}>
                      {validIdDoc.name}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={{ height: 48 }} />
      </FormModalLayout>

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
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 10,
  },
  lockedStatus: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  openLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  openLinkText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  rejectHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#b91c1c',
    lineHeight: 16,
  },
  footerAllSet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  footerAllSetText: { flex: 1, fontSize: 13, color: '#14532d', lineHeight: 18 },
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
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 6,
  },
  uploadBtnText: {
    color: '#fff',
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
  submitBtn: {
    alignSelf: 'stretch',
    backgroundColor: theme.color.parent,
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
});
