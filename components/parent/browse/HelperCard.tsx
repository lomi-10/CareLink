// components/parent/browse/HelperCard.tsx
// Individual helper card in browse grid

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HelperProfile } from '@/hooks/useBrowseHelpers';

interface HelperCardProps {
  helper: HelperProfile;
  onPress: () => void;
  onInvite?: () => void;
}

export function HelperCard({ helper, onPress, onInvite }: HelperCardProps) {
  const getVerificationBadge = () => {
    switch (helper.verification_status) {
      case 'Verified':
        return { icon: 'checkmark-circle', color: '#34C759', text: 'Verified' };
      case 'Pending':
        return { icon: 'time', color: '#FF9500', text: 'Pending' };
      default:
        return null;
    }
  };

  const badge = getVerificationBadge();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Profile Image */}
      <View style={styles.imageContainer}>
        {helper.profile_image ? (
          <Image source={{ uri: helper.profile_image }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="person" size={40} color="#ccc" />
          </View>
        )}
        
        {/* Verification Badge */}
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.color }]}>
            <Ionicons name={badge.icon as any} size={12} color="#fff" />
          </View>
        )}

        {/* Availability Indicator */}
        {helper.availability_status === 'Available' && (
          <View style={styles.availableBadge}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>Available</Text>
          </View>
        )}
      </View>

      {/* Helper Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {helper.full_name}
        </Text>

        {/* Categories */}
        <View style={styles.categoryRow}>
          {helper.categories.slice(0, 2).map((cat, index) => (
            <View key={index} style={styles.categoryPill}>
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ))}
          {helper.categories.length > 2 && (
            <Text style={styles.moreText}>+{helper.categories.length - 2}</Text>
          )}
        </View>

        {/* Experience & Rating */}
        <View style={styles.statsRow}>
          {helper.experience_years !== undefined && (
            <View style={styles.stat}>
              <Ionicons name="briefcase-outline" size={12} color="#666" />
              <Text style={styles.statText}>{helper.experience_years} yrs</Text>
            </View>
          )}
          
          {helper.rating_average !== undefined && helper.rating_count && helper.rating_count > 0 && (
            <View style={styles.stat}>
              <Ionicons name="star" size={12} color="#FF9500" />
              <Text style={styles.statText}>
                {helper.rating_average.toFixed(1)} ({helper.rating_count})
              </Text>
            </View>
          )}
        </View>

        {/* Distance */}
        {helper.distance !== undefined && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.locationText}>
              {helper.distance < 1
                ? `${(helper.distance * 1000).toFixed(0)}m away`
                : `${helper.distance.toFixed(1)} km away`}
            </Text>
          </View>
        )}

        {/* Quick Action Button */}
        {onInvite && (
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={(e) => {
              e.stopPropagation();
              onInvite();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-outline" size={14} color="#007AFF" />
            <Text style={styles.inviteButtonText}>Invite</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  availableBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  availableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryPill: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F8FF',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
});
