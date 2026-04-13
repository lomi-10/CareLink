// components/helper/jobs/ParentProfileModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ParentProfileModalProps {
  visible: boolean;
  onClose: () => void;
  parentData: any;
}

export function ParentProfileModal({ visible, onClose, parentData }: ParentProfileModalProps) {
  const [docToView, setDocToView] = useState<{title: string, url: string} | null>(null);

  if (!parentData) return null;

  // URL Formatters for local testing
  const BASE_API_URL = 'http://localhost/carelink_api';

  const getDocUrl = (filename: string | null | undefined) => {
    if (!filename) return null;
    if (filename.includes('http')) return filename; 
    return `${BASE_API_URL}/uploads/documents/${filename}`;
  };

  const getProfileUrl = (filename: string | null | undefined) => {
    if (!filename) return null;
    if (filename.includes('http')) return filename;
    return `${BASE_API_URL}/uploads/profiles/${filename}`;
  };

  const validIdUrl = getDocUrl(parentData.parent_valid_id);
  const proofOfBillingUrl = getDocUrl(parentData.parent_proof_of_billing);
  const hasDocuments = validIdUrl || proofOfBillingUrl;

  const getInitials = (name: string) => {
    if (!name) return 'E';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  const fullAddress = `${parentData.parent_barangay ? parentData.parent_barangay + ', ' : ''}${parentData.parent_municipality || 'N/A'}, ${parentData.parent_province || 'N/A'}`;

  const DocumentItem = ({ title, url, icon }: { title: string, url: string | null, icon: string }) => {
    if (!url) return null;
    return (
      <TouchableOpacity style={styles.docItem} onPress={() => setDocToView({ title, url })}>
        <View style={styles.docIconBox}>
          <Ionicons name={icon as any} size={20} color="#1D4ED8" />
        </View>
        <Text style={styles.docTitle}>{title}</Text>
        <Ionicons name="eye-outline" size={20} color="#6B7280" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Employer Profile</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              
              <View style={styles.heroSection}>
                <View style={styles.avatarWrapper}>
                  {parentData.parent_profile_image ? (
                    <Image source={{ uri: getProfileUrl(parentData.parent_profile_image) as string }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{getInitials(parentData.parent_name)}</Text>
                    </View>
                  )}
                  {parentData.parent_verified && (
                    <View style={styles.verifiedBadgeIcon}>
                      <Ionicons name="checkmark-circle" size={28} color="#059669" />
                    </View>
                  )}
                </View>

                <Text style={styles.parentName}>{parentData.parent_name}</Text>
                
                <View style={styles.heroBadges}>
                  {parentData.parent_verified ? (
                    <View style={[styles.badge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Ionicons name="shield-checkmark" size={12} color="#059669" />
                      <Text style={[styles.badgeText, { color: '#059669' }]}>PESO Verified Employer</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                      <Ionicons name="warning" size={12} color="#DC2626" />
                      <Text style={[styles.badgeText, { color: '#DC2626' }]}>Unverified Employer</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* EMPLOYER BIO */}
              {parentData.parent_bio ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About the Employer</Text>
                  <View style={styles.bioBox}>
                    <Text style={styles.bioText}>{parentData.parent_bio}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Employer Contact</Text>
                <View style={styles.detailsList}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{parentData.parent_email || 'Hidden'}</Text>
                  </View>
                  <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>Contact No.</Text>
                    <Text style={styles.detailValue}>{parentData.parent_contact_number || 'Hidden'}</Text>
                  </View>
                </View>
              </View>

              {/* LOCATION DETAILS */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Household Location</Text>
                <View style={styles.detailsList}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>General Area</Text>
                    <Text style={[styles.detailValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={2}>
                      {fullAddress}
                    </Text>
                  </View>
                  {parentData.parent_address && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Exact Address</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={2}>
                        {parentData.parent_address}
                      </Text>
                    </View>
                  )}
                  {parentData.parent_landmark && (
                    <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                      <Text style={styles.detailLabel}>Landmark</Text>
                      <Text style={[styles.detailValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]}>
                        {parentData.parent_landmark}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {hasDocuments ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Verified Documents</Text>
                  <View style={styles.docsContainer}>
                    <DocumentItem title="Employer Valid ID" url={validIdUrl} icon="id-card" />
                    <DocumentItem title="Proof of Billing" url={proofOfBillingUrl} icon="document-text" />
                  </View>
                </View>
              ) : null}

              <View style={{ height: 20 }} />

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DOCUMENT VIEWER MODAL */}
      {docToView && (
        <Modal visible={!!docToView} animationType="fade" transparent={true} onRequestClose={() => setDocToView(null)}>
          <SafeAreaView style={styles.docViewerOverlay}>
            <View style={styles.docViewerHeader}>
              <Text style={styles.docViewerTitle}>{docToView.title}</Text>
              <TouchableOpacity onPress={() => setDocToView(null)} style={styles.docViewerCloseBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: docToView.url }} style={styles.docViewerImage} resizeMode="contain" />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContainer: { width: '100%', maxWidth: 600, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeButton: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },
  content: { flex: 1 },
  
  heroSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9FAFB' },
  avatarWrapper: { position: 'relative', marginBottom: 16 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: '#1D4ED8' },
  verifiedBadgeIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 16, padding: 2 },
  parentName: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  heroBadges: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 13, fontWeight: '700' },

  section: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  
  detailsList: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  bioBox: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  bioText: { fontSize: 15, lineHeight: 24, color: '#4B5563' },

  docsContainer: { gap: 12 },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', padding: 12, borderRadius: 12 },
  docIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  docTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },

  docViewerOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center' },
  docViewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, position: 'absolute', top: Platform.OS === 'ios' ? 40 : 20, left: 0, right: 0, zIndex: 10 },
  docViewerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  docViewerCloseBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  docViewerImage: { width: '100%', height: '80%', marginTop: 60 },
});