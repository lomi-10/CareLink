// components/parent/browse/HelperProfileModal.tsx
// Modal to view full helper profile details

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { HelperProfile } from '@/hooks/useBrowseHelpers';

interface HelperProfileModalProps {
  visible: boolean;
  helper: HelperProfile | null;
  onInvite: () => void;
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
  if (!helper) return null;

  const InfoSection = ({ icon, label, value }: { 
    icon: string; 
    label: string; 
    value: string | number | undefined;
  }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={20} color="#666" />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Not specified'}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Helper Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#1A1C1E" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {helper.profile_image ? (
                  <Image 
                    source={{ uri: helper.profile_image }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person" size={48} color="#999" />
                  </View>
                )}
                {helper.verification_status === 'Verified' && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                  </View>
                )}
              </View>

              <Text style={styles.helperName}>{helper.full_name}</Text>
              
              {helper.age && (
                <Text style={styles.helperAge}>{helper.age} years old</Text>
              )}

              {/* Categories */}
              <View style={styles.categoriesContainer}>
                {helper.categories?.map((category, index) => (
                  <View key={index} style={styles.categoryChip}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>

              {/* Rating */}
              {helper.rating_average && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={20} color="#FFB800" />
                  <Text style={styles.ratingText}>
                    {helper.rating_average.toFixed(1)}
                  </Text>
                  {helper.rating_count && (
                    <Text style={styles.ratingCount}>
                      ({helper.rating_count} {helper.rating_count === 1 ? 'review' : 'reviews'})
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Key Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Information</Text>
              
              <InfoSection
                icon="briefcase-outline"
                label="Experience"
                value={helper.experience_years ? `${helper.experience_years} years` : undefined}
              />
              
              <InfoSection
                icon="calendar-outline"
                label="Employment Type"
                value={helper.employment_type}
              />
              
              <InfoSection
                icon="time-outline"
                label="Work Schedule"
                value={helper.work_schedule}
              />
              
              <InfoSection
                icon="cash-outline"
                label="Expected Salary"
                value={helper.expected_salary ? `₱${helper.expected_salary.toLocaleString()}/month` : undefined}
              />
              
              <InfoSection
                icon="location-outline"
                label="Location"
                value={helper.municipality && helper.province 
                  ? `${helper.municipality}, ${helper.province}` 
                  : undefined}
              />
              
              {helper.distance && (
                <InfoSection
                  icon="navigate-outline"
                  label="Distance from you"
                  value={`${helper.distance.toFixed(1)} km away`}
                />
              )}
              
              <InfoSection
                icon="male-female-outline"
                label="Gender"
                value={helper.gender}
              />
            </View>

            {/* Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              
              <View style={styles.statusRow}>
                <View style={styles.statusItem}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: helper.verification_status === 'Verified' ? '#E8F5E9' : '#FFF3E0' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: helper.verification_status === 'Verified' ? '#34C759' : '#FF9500' }
                    ]}>
                      {helper.verification_status}
                    </Text>
                  </View>
                  <Text style={styles.statusLabel}>Verification</Text>
                </View>

                <View style={styles.statusItem}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: helper.availability_status === 'Available' ? '#E8F5E9' : '#FFEBEE' }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: helper.availability_status === 'Available' ? '#34C759' : '#FF3B30' }
                    ]}>
                      {helper.availability_status}
                    </Text>
                  </View>
                  <Text style={styles.statusLabel}>Availability</Text>
                </View>
              </View>
            </View>

            {/* Bio */}
            {helper.bio && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.bioText}>{helper.bio}</Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {onSave && (
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={onSave}
                activeOpacity={0.7}
              >
                <Ionicons name="bookmark-outline" size={20} color="#007AFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.inviteButton} 
              onPress={onInvite}
              activeOpacity={0.7}
            >
              <Text style={styles.inviteButtonText}>Invite to Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  helperName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 16,
  },
  helperAge: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 8,
    backgroundColor: '#F8F9FA',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  inviteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
