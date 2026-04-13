// Parent home greeting — blue CareLink theme

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface GreetingCardProps {
  userName: string;
}

export function GreetingCard({ userName }: GreetingCardProps) {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      <View style={styles.accentStrip} />
      <View style={styles.greetingContent}>
        <Text style={styles.kicker}>Parent Portal</Text>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.subtext}>Find the right helper for your family</Text>
      </View>
      <View style={styles.illustration}>
        <Ionicons name="heart-outline" size={56} color="rgba(255,255,255,0.35)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: theme.radius.xl,
    padding: theme.space.xxl,
    marginBottom: theme.space.xl,
    overflow: 'hidden',
    backgroundColor: theme.color.parent,
    position: 'relative',
  },
  accentStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  greetingContent: {
    flex: 1,
    paddingLeft: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 18,
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
