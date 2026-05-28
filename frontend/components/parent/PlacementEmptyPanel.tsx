import AnimatedPressable from '@/components/shared/AnimatedPressable';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

type Props = {
  title: string;
  message: string;
};

export function PlacementEmptyPanel({ title, message }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.head}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={theme.color.parent} />
        </AnimatedPressable>
        <Text style={styles.pageTitle}>{title}</Text>
      </View>
      <View style={styles.body}>
        <Ionicons name="people-outline" size={48} color={theme.color.lineStrong} />
        <Text style={styles.message}>{message}</Text>
        <AnimatedPressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(parent)/active_helpers' as never)}>
          <Text style={styles.primaryBtnText}>Active helpers</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </AnimatedPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 20, fontWeight: '900', color: theme.color.ink, flex: 1 },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  message: {
    fontSize: 16,
    color: theme.color.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.color.parent,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
