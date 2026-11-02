import React from 'react';
import { Text } from 'react-native';

export function ExperienceVerificationNotice() {
  return (
    <Text style={{ color: '#687386', fontSize: 12, lineHeight: 17, marginBottom: 10 }}>
      Self-reported details come from the helper. PESO-reviewed means an officer reviewed the entry, not that CareLink guarantees it is true. CareLink work is confirmed only after both people verify it ended.
    </Text>
  );
}
