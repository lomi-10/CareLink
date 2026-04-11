// components/parent/browse/HelperProfileModal.tsx
// Premium Modal to view full helper profile details and in-app documents

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HelperProfile } from '@/hooks/parent';

interface HelperProfileModalProps {
  visible: boolean;
  helper: HelperProfile | null;
  onInvite?: () => void;
  onSave?: () => void;
  onClose: () => void;
}

export function HelperProfileModal({
  visible,
  helper,
  onInvite,
  onSave,
  onClose,
}: HelperProfileModalProps) {
  // NEW STATE: Tracks which document is currently being viewed
  const [docToView, setDocToView] = useState<{title: string, url: string} | null>(null);

  if (!helper) return null;

  const h = helper as any;

  // Safely extract data whether it came from 'applications' or 'browse'
  const bio = h.bio || h.helper_bio || '';
  const education = h.education_level || h.helper_education_level || h.education || 'Not specified';
  const religion = h.religion || h.helper_religion || 'Not specified';
  const civilStatus = h.civil_status || h.helper_civil_status || 'Not specified';
  const barangay = h.barangay || h.helper_barangay || '';
  const municipality = h.municipality || h.helper_municipality || 'N/A';
  const province = h.province || h.helper_province || 'N/A';
  const fullAddress = `${barangay ? barangay + ', ' : ''}${municipality}, ${province}`;

  const categories = h.categories || h.helper_categories || [];
  const jobs = h.jobs || h.helper_jobs || [];
  const skills = h.skills || h.helper_skills || [];

  const getInitials = (name: string) => {
    if (!name) return 'H';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase() : names[0][0].toUpperCase();
  };

  // --- URL FORMATTING FUNCTIONS ---
  // Connects the raw database filename to your actual backend folder
  const BASE_API_URL = 'http://localhost/carelink_api';

  const getDocUrl = (filename: string | null | undefined) => {
    if (!filename) return null;
    if (filename.includes('http')) return filename; // Already a full URL
    return `${BASE_API_URL}/uploads/documents/${filename}`;
  };

  const getProfileUrl = (filename: string | null | undefined) => {
    if (!filename) return null;
    if (filename.includes('http')) return filename;
    return `${BASE_API_URL}/uploads/profiles/${filename}`;
  };
  // --------------------------------

  // Format document URLs using the helper functions
  const policeClearance = getDocUrl(h.police_clearance || h.helper_police_clearance);
  const nbiClearance = getDocUrl(h.nbi_clearance || h.helper_nbi_clearance);
  const medicalCert = getDocUrl(h.medical_certificate || h.helper_medical_certificate);
  const tesdaNc2 = getDocUrl(h.tesda_nc2 || h.helper_tesda_nc2);
  
  const hasDocuments = policeClearance || nbiClearance || medicalCert || tesdaNc2;

  // Render clickable document items
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
              <Text style={styles.headerTitle}>Applicant Profile</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              
              {/* HERO SECTION */}
              <View style={styles.heroSection}>
                <View style={styles.avatarWrapper}>
                  {h.profile_image ? (
                    // USED getProfileUrl() HERE
                    <Image source={{ uri: getProfileUrl(h.profile_image) as string }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>{getInitials(h.full_name || h.helper_name)}</Text>
                    </View>
                  )}
                  {h.verification_status === 'Verified' && (
                    <View style={styles.verifiedBadgeIcon}>
                      <Ionicons name="checkmark-circle" size={28} color="#059669" />
                    </View>
                  )}
                </View>

                <Text style={styles.helperName}>{h.full_name || h.helper_name}</Text>
                
                <View style={styles.heroBadges}>
                  {h.verification_status === 'Verified' && (
                    <View style={[styles.badge, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                      <Ionicons name="shield-checkmark" size={12} color="#059669" />
                      <Text style={[styles.badgeText, { color: '#059669' }]}>PESO Verified</Text>
                    </View>
                  )}
                  {h.availability_status === 'Available' && (
                    <View style={[styles.badge, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                      <Ionicons name="briefcase" size={12} color="#1D4ED8" />
                      <Text style={[styles.badgeText, { color: '#1D4ED8' }]}>Available to Work</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* CONTACT INFO */}
              {(h.email || h.phone || h.helper_email || h.helper_phone) && (
                <View style={styles.contactCard}>
                  <Text style={styles.sectionSubtitle}>Contact Information</Text>
                  {(h.email || h.helper_email) && (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconBox}><Ionicons name="mail" size={16} color="#1D4ED8" /></View>
                      <Text style={styles.contactText}>{h.email || h.helper_email}</Text>
                    </View>
                  )}
                  {(h.phone || h.helper_phone) && (
                    <View style={styles.contactRow}>
                      <View style={styles.contactIconBox}><Ionicons name="call" size={16} color="#1D4ED8" /></View>
                      <Text style={styles.contactText}>{h.phone || h.helper_phone}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* QUICK STATS */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <Text style={styles.statValue}>{h.age || h.helper_age || '--'} yrs</Text>
                  <Text style={styles.statLabel}>Age</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="male-female-outline" size={20} color="#6B7280" />
                  <Text style={styles.statValue}>{h.gender || h.helper_gender || 'Any'}</Text>
                  <Text style={styles.statLabel}>Gender</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
                  <Text style={styles.statValue}>{h.experience_years || h.helper_experience_years ? `${h.experience_years || h.helper_experience_years} yrs` : 'New'}</Text>
                  <Text style={styles.statLabel}>Experience</Text>
                </View>
                <View style={styles.statBox}>
                  <Ionicons name="star-outline" size={20} color="#D97706" />
                  <Text style={[styles.statValue, { color: '#D97706' }]}>{h.rating_average || h.helper_rating_average ? Number(h.rating_average || h.helper_rating_average).toFixed(1) : 'No'}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>

              {/* BIO / ABOUT */}
              {bio ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About Me</Text>
                  <View style={styles.bioBox}>
                    <Text style={styles.bioText}>{bio}</Text>
                  </View>
                </View>
              ) : null}

              {/* BACKGROUND DETAILS */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Background & Details</Text>
                <View style={styles.detailsList}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Education Level</Text>
                    <Text style={styles.detailValue}>{education}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Religion</Text>
                    <Text style={styles.detailValue}>{religion}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Civil Status</Text>
                    <Text style={styles.detailValue}>{civilStatus}</Text>
                  </View>
                  <View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={[styles.detailValue, { flex: 1, textAlign: 'right', marginLeft: 16 }]} numberOfLines={2}>
                      {fullAddress}
                    </Text>
                  </View>
                </View>
              </View>

              {/* DOCUMENTS */}
              {hasDocuments ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Verified Documents</Text>
                  <View style={styles.docsContainer}>
                    <DocumentItem title="Police Clearance" url={policeClearance} icon="shield-checkmark" />
                    <DocumentItem title="NBI Clearance" url={nbiClearance} icon="document-text" />
                    <DocumentItem title="Medical Certificate" url={medicalCert} icon="medkit" />
                    <DocumentItem title="TESDA NC II" url={tesdaNc2} icon="school" />
                  </View>
                </View>
              ) : null}

              {/* SKILLS */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Profile</Text>
                
                {categories.length > 0 && (
                  <View style={styles.skillGroup}>
                    <Text style={styles.skillGroupLabel}>Categories</Text>
                    <View style={styles.categoriesContainer}>
                      {categories.map((item: string, idx: number) => (
                        <View key={`cat-${idx}`} style={[styles.categoryChip, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
                          <Text style={[styles.categoryText, { color: '#1D4ED8' }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {jobs.length > 0 && (
                  <View style={styles.skillGroup}>
                    <Text style={styles.skillGroupLabel}>Specific Roles</Text>
                    <View style={styles.categoriesContainer}>
                      {jobs.map((item: string, idx: number) => (
                        <View key={`job-${idx}`} style={[styles.categoryChip, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                          <Text style={[styles.categoryText, { color: '#059669' }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {skills.length > 0 && (
                  <View style={styles.skillGroup}>
                    <Text style={styles.skillGroupLabel}>Skills & Abilities</Text>
                    <View style={styles.categoriesContainer}>
                      {skills.map((item: string, idx: number) => (
                        <View key={`skill-${idx}`} style={styles.categoryChip}>
                          <Text style={styles.categoryText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

            </ScrollView>

            <View style={styles.footer}>
              {onSave && (
                <TouchableOpacity style={styles.saveButton} onPress={onSave}>
                  <Ionicons name="bookmark-outline" size={20} color="#4B5563" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.primaryButton} onPress={onInvite ? onInvite : onClose}>
                {onInvite && <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />}
                <Text style={styles.primaryButtonText}>{onInvite ? "Message Applicant" : "Close Profile"}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* NEW: IN-APP DOCUMENT VIEWER MODAL */}
      {docToView && (
        <Modal visible={!!docToView} animationType="fade" transparent={true} onRequestClose={() => setDocToView(null)}>
          <SafeAreaView style={styles.docViewerOverlay}>
            <View style={styles.docViewerHeader}>
              <Text style={styles.docViewerTitle}>{docToView.title}</Text>
              <TouchableOpacity onPress={() => setDocToView(null)} style={styles.docViewerCloseBtn}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Renders the document as a contained image */}
            <Image 
              source={{ uri: docToView.url }} 
              style={styles.docViewerImage} 
              resizeMode="contain" 
            />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '90%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 10 },
      web: { boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  
  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  verifiedBadgeIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 2,
  },
  helperName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },

  contactCard: {
    margin: 24,
    marginBottom: 0,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    padding: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  contactIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A8A',
  },

  statsGrid: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  section: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  
  detailsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  docsContainer: {
    gap: 12,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 12,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  skillGroup: {
    marginBottom: 16,
  },
  skillGroupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  bioBox: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },

  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // NEW: DOCUMENT VIEWER STYLES
  docViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  docViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  docViewerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  docViewerCloseBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  docViewerImage: {
    width: '100%',
    height: '80%',
    marginTop: 60,
  },
});