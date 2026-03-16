// components/helper/profile/MobileProfileHeader.tsx
// Mobile profile header with avatar, name, and action buttons

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MobileProfileHeaderProps {
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

export function MobileProfileHeader({
  profileImage,
  fullName,
  bio,
  badge,
  onEditProfile,
  onManageDocuments,
}: MobileProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.coverPhoto} />
      <View style={styles.avatarWrapper}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color="#ccc" />
          </View>
        )}
      </View>
      <Text style={styles.name}>{fullName}</Text>
      <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
        <Ionicons name={badge.icon as any} size={14} color="#fff" />
        <Text style={styles.badgeText}>{badge.text}</Text>
      </View>
      {bio && (
        <Text style={styles.bio}>{bio}</Text>
      )}

      {/* Mobile Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onEditProfile}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={onManageDocuments}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#007AFF" />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>
            Documents
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  coverPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#007AFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  avatarWrapper: {
    marginTop: 40,
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
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 12,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bio: {
    fontSize: 14,
    color: '#5d390aff',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionTextSecondary: {
    color: '#007AFF',
  },
});
