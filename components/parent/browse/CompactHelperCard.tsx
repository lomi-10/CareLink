// components/parent/browse/CompactHelperCard.tsx
// Compact helper card for mobile 2-column grid

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HelperProfile } from '@/hooks/useBrowseHelpers';

interface CompactHelperCardProps {
  helper: HelperProfile;
  onPress: () => void;
}

export function CompactHelperCard({ helper, onPress }: CompactHelperCardProps) {
  const getVerificationBadge = () => {
    switch (helper.verification_status) {
      case 'Verified':
        return { icon: 'checkmark-circle', color: '#34C759' };
      case 'Pending':
        return { icon: 'time', color: '#FF9500' };
      default:
        return null;
    }
  };

  const badge = getVerificationBadge();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      {/* Profile Image - Tappable */}
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
            <Ionicons name={badge.icon as any} size={10} color="#fff" />
          </View>
        )}

        {/* Availability Dot */}
        {helper.availability_status === 'Available' && (
          <View style={styles.availableDot} />
        )}
      </View>

      {/* Minimal Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {helper.first_name}
        </Text>

        {/* Primary Category Only */}
        {helper.categories[0] && (
          <Text style={styles.category} numberOfLines={1}>
            {helper.categories[0]}
          </Text>
        )}

        {/* Rating or Experience */}
        <View style={styles.statRow}>
          {helper.rating_average !== undefined && helper.rating_count && helper.rating_count > 0 ? (
            <>
              <Ionicons name="star" size={11} color="#FF9500" />
              <Text style={styles.statText}>{helper.rating_average.toFixed(1)}</Text>
            </>
          ) : helper.experience_years !== undefined ? (
            <>
              <Ionicons name="briefcase-outline" size={11} color="#666" />
              <Text style={styles.statText}>{helper.experience_years}y</Text>
            </>
          ) : null}
        </View>

        {/* Distance */}
        {helper.distance !== undefined && (
          <View style={styles.distanceRow}>
            <Ionicons name="location" size={10} color="#666" />
            <Text style={styles.distanceText}>
              {helper.distance < 1 
                ? `${(helper.distance * 1000).toFixed(0)}m`
                : `${helper.distance.toFixed(1)}km`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  availableDot: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    gap: 3,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: 10,
    color: '#666',
  },
});
