import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ExperienceVerificationStatus = 'peso_reviewed' | 'platform_confirmed' | 'self_reported' | null | undefined;

export function ExperienceVerificationBadge({ status }: { status: ExperienceVerificationStatus }) {
  const isPlatformConfirmed = status === 'platform_confirmed';
  const isPesoReviewed = status === 'peso_reviewed';
  const label = isPlatformConfirmed
    ? 'Confirmed on CareLink'
    : isPesoReviewed ? 'PESO-reviewed' : 'Self-reported';
  const color = isPlatformConfirmed ? '#18804A' : isPesoReviewed ? '#1D63A5' : '#687386';
  const backgroundColor = isPlatformConfirmed ? '#E8F7EE' : isPesoReviewed ? '#EAF3FC' : '#F0F2F5';

  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor }}>
      <Ionicons
        name={isPlatformConfirmed ? 'checkmark-circle' : isPesoReviewed ? 'shield-checkmark-outline' : 'person-outline'}
        size={13}
        color={color}
      />
      <Text style={{ color, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}
