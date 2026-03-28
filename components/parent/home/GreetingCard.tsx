// components/parent/home/GreetingCard.tsx
// Mobile greeting card with time-based greeting and user name

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GreetingCardProps {
  userName: string;
}

export function GreetingCard({ userName }: GreetingCardProps) {
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={[styles.greetingCard, styles.blueGradient]}>
      <View style={styles.greetingContent}>
        <Text style={styles.greeting}>
          {getGreeting()}
        </Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.subtext}>
          Find the perfect helper for your family
        </Text>
      </View>
      <View style={styles.illustration}>
        <Ionicons name="briefcase" size={60} color="rgba(255,255,255,0.3)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  greetingCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  blueGradient: {
    backgroundColor: '#007AFF',
  },
  greetingContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
