// app/(helper)/feedback/index.tsx
// "Send Feedback" — the persistent instrument (see FeedbackScreen). Works on
// both mobile and web from one file; FeedbackScreen itself is responsive.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FeedbackScreen } from '@/components/shared';

const ORANGE = '#E86019';
const DARK = '#2A1608';
const CARD = '#FFFFFF';
const PAGE = '#FBF5EC';
const LINE = '#EFE2D0';

export default function HelperFeedbackScreen() {
  const router = useRouter();
  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Send Feedback</Text>
          <View style={{ width: 42 }} />
        </View>
        <FeedbackScreen role="helper" accent={ORANGE} messagesRoute="/(helper)/messages" />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: CARD,
    borderBottomWidth: 1, borderBottomColor: LINE,
  },
  barBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: DARK },
});
