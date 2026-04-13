// Parent mobile profile header — PESO badge + parent theme

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface MobileProfileHeaderProps {
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
      <View style={styles.coverPhoto}>
        <View style={styles.coverWash} />
        <View style={styles.coverBand} />
      </View>
      <View style={styles.avatarWrapper}>
        <View style={styles.avatarInner}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#ccc" />
            </View>
          )}
          <View
            style={[
              styles.miniStatusBadge,
              badge.variant === 'peso_verified' && styles.miniStatusBadgePeso,
              { backgroundColor: badge.color },
            ]}
          >
            <Ionicons
              name={(badge.variant === 'peso_verified' ? 'shield-checkmark' : badge.icon) as any}
              size={badge.variant === 'peso_verified' ? 15 : 12}
              color="#fff"
            />
          </View>
        </View>
      </View>
      <Text style={styles.name}>{fullName}</Text>
      {badge.variant === 'peso_verified' ? (
        <View
          style={[
            styles.pesoVerifiedBlock,
            { borderColor: badge.color + '55', backgroundColor: theme.color.parentSoft },
          ]}
        >
          <View style={[styles.pesoShieldCircle, { backgroundColor: badge.color }]}>
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.pesoVerifiedTitle}>PESO Verified</Text>
          <Text style={styles.pesoVerifiedSub}>Account cleared by PESO</Text>
        </View>
      ) : (
        <View style={[styles.statusBadge, { backgroundColor: badge.color }]}>
          <Ionicons name={badge.icon as any} size={14} color="#fff" />
          <Text style={styles.badgeText}>{badge.text}</Text>
        </View>
      )}
      {bio && <Text style={styles.bio}>{bio}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEditProfile} activeOpacity={0.7}>
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={onManageDocuments}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-upload-outline" size={18} color={theme.color.parent} />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Documents</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: theme.space.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  coverPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 88,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    overflow: 'hidden',
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
    height: 28,
    backgroundColor: theme.color.parent,
    opacity: 0.22,
  },
  avatarWrapper: {
    marginTop: 48,
    alignItems: 'center',
  },
  avatarInner: {
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
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.color.surfaceElevated,
  },
  miniStatusBadgePeso: {
    width: 32,
    height: 32,
    borderRadius: 16,
    right: -6,
  },
  pesoVerifiedBlock: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    paddingVertical: theme.space.md,
    paddingHorizontal: theme.space.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5,
  },
  pesoShieldCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pesoVerifiedTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.color.ink,
  },
  pesoVerifiedSub: {
    marginTop: 4,
    fontSize: theme.font.caption,
    color: theme.color.muted,
    fontWeight: '600',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.color.ink,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: -0.3,
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
    color: theme.color.muted,
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
    backgroundColor: theme.color.parent,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 6,
  },
  actionSecondary: {
    backgroundColor: theme.color.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.color.parent,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  actionTextSecondary: {
    color: theme.color.parent,
  },
});
