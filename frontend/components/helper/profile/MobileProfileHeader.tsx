// components/helper/profile/MobileProfileHeader.tsx
// Mobile profile header with avatar, name, and action buttons

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createMobileProfileHeaderStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surfaceElevated,
      borderRadius: theme.radius.xl,
      padding: 20,
      alignItems: 'center',
      marginBottom: theme.space.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.line,
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
      backgroundColor: c.helperSoft,
    },
    coverBand: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 28,
      backgroundColor: c.helper,
      opacity: 0.22,
    },
    avatarWrapper: {
      marginTop: 48,
      alignItems: 'center',
    },
    avatarInner: {
      position: 'relative',
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
      borderColor: c.surfaceElevated,
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
      color: c.ink,
    },
    pesoVerifiedSub: {
      marginTop: 4,
      fontSize: theme.font.caption,
      color: c.muted,
      fontWeight: '600',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 4,
      borderColor: c.surfaceElevated,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: c.surfaceElevated,
    },
    name: {
      fontSize: 22,
      fontWeight: '800',
      color: c.ink,
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
      color: c.muted,
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
      backgroundColor: c.helper,
      paddingVertical: 12,
      borderRadius: theme.radius.md,
      gap: 6,
    },
    actionSecondary: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 1.5,
      borderColor: c.helper,
    },
    actionText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    actionTextSecondary: {
      color: c.helper,
    },
  });
}

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
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createMobileProfileHeaderStyles(c), [c]);

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
              <Ionicons name="person" size={40} color={c.subtle} />
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
            { borderColor: badge.color + '55', backgroundColor: c.helperSoft },
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
          <Ionicons name="cloud-upload-outline" size={18} color={c.helper} />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Documents</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
