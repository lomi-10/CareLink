import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HelperApplicationGroup } from '@/lib/groupApplicationsByHelper';
import { summarizeGroupStatus } from '@/lib/groupApplicationsByHelper';

type Props = {
  group: HelperApplicationGroup;
  onPress: () => void;
};

export function ApplicantGroupCard({ group, onPress }: Props) {
  const n = group.applications.length;
  const summary = summarizeGroupStatus(group.applications);

  const getInitials = (name: string) => {
    if (!name) return 'H';
    const names = name.split(' ');
    return names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : names[0][0].toUpperCase();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.row}>
        {group.helper_photo ? (
          <Image source={{ uri: group.helper_photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{getInitials(group.helper_name)}</Text>
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {group.helper_name}
          </Text>
          <Text style={styles.sub}>
            {n === 1 ? '1 application to your job posts' : `${n} applications to your job posts`}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: summary.bg }]}>
          <Text style={[styles.badgeText, { color: summary.color }]}>{summary.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
      <Text style={styles.hint}>Tap to review each role</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
    }),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6' },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: '#2563EB' },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 4 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 10, marginLeft: 60 },
});
