// components/helper/profile/ProfileHeader.tsx
// Profile header with avatar, name, verification badge, and action buttons

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  profileImage?: string;
  fullName: string;
  bio?: string;
  badge: {
    icon: string;
    text: string;
    color: string;
  };
  onEditProfile: () => void;
  onManageDocuments: () => void;
}

export function ProfileHeader({
  profileImage,
  fullName,
  bio,
  badge,
  onEditProfile,
  onManageDocuments,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Cover Photo */}
      <View style={styles.coverPhoto} />

      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatarContainer}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={60} color="#ccc" />
            </View>
          )}
        </View>
        <View style={[styles.miniStatusBadge, { backgroundColor: badge.color }]}>
          <Ionicons name={badge.icon as any} size={12} color="#fff" />
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name}>{fullName}</Text>
        <View style={[styles.verificationBadge, { backgroundColor: badge.color }]}>
          <Ionicons name={badge.icon as any} size={14} color="#fff" />
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
        {bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {bio}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={onEditProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionButtonText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButtonPrimary, styles.actionButtonSecondary]}
          onPress={onManageDocuments}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#FF9500" />
          <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
            Manage Documents
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  coverPhoto: {
    height: 120,
    backgroundColor: '#FF9500',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: -50,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  miniStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FF9500',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: '#FF9500',
  },
});
