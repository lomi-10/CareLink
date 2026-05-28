// Parent profile header — aligned with helper layout + PESO verified badge

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface ProfileHeaderProps {
  profileImage?: string;
  fullName: string;
  bio?: string;
  badge: {
    icon: string;
    text: string;
    color: string;
    variant?: 'peso_verified' | 'default';
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
      <View style={styles.coverPhoto}>
        <View style={styles.coverWash} />
        <View style={styles.coverBand} />
      </View>

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
        <View
          style={[
            styles.miniStatusBadge,
            badge.variant === 'peso_verified' && styles.miniStatusBadgePeso,
            { backgroundColor: badge.color },
          ]}
        >
          <Ionicons
            name={(badge.variant === 'peso_verified' ? 'shield-checkmark' : badge.icon) as any}
            size={badge.variant === 'peso_verified' ? 16 : 12}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{fullName}</Text>
        {badge.variant === 'peso_verified' ? (
          <View
            style={[
              styles.pesoVerifiedBlock,
              { borderColor: badge.color + '55', backgroundColor: theme.color.parentSoft },
            ]}
          >
            <View style={[styles.pesoShieldCircle, { backgroundColor: badge.color }]}>
              <Ionicons name="shield-checkmark" size={30} color="#fff" />
            </View>
            <Text style={styles.pesoVerifiedTitle}>PESO Verified</Text>
            <Text style={styles.pesoVerifiedSub}>Account cleared by PESO</Text>
          </View>
        ) : (
          <View style={[styles.verificationBadge, { backgroundColor: badge.color }]}>
            <Ionicons name={badge.icon as any} size={14} color="#fff" />
            <Text style={styles.badgeText}>{badge.text}</Text>
          </View>
        )}
        {bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {bio}
          </Text>
        )}
      </View>

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
          <Ionicons name="cloud-upload-outline" size={18} color={theme.color.parent} />
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
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    marginBottom: theme.space.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  coverPhoto: {
    height: 112,
    overflow: 'hidden',
    position: 'relative',
  },
  coverWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.color.parentSoft,
  },
  coverBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 36,
    backgroundColor: theme.color.parent,
    opacity: 0.2,
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
    borderColor: theme.color.surfaceElevated,
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
  miniStatusBadgePeso: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  pesoVerifiedBlock: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 12,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
    maxWidth: 320,
  },
  pesoShieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pesoVerifiedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.color.ink,
    letterSpacing: -0.3,
  },
  pesoVerifiedSub: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.color.muted,
    fontWeight: '600',
  },
  info: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.color.ink,
    marginBottom: 8,
    letterSpacing: -0.4,
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
    color: theme.color.muted,
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
    backgroundColor: theme.color.parent,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.color.parent,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtonTextSecondary: {
    color: theme.color.parent,
  },
});
