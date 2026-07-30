// app/(helper)/profile/experience.tsx
// Work Experience & References — read view. Editing goes through the shared
// EditHelperProfileModal (opened straight on its Experience section), the same
// way Skills & Specialties does, so every profile section is edited the same way.
// PHP: helper/get_profile.php (read); the modal owns the write.

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHelperProfile } from '@/hooks/helper';
import { HelperTabBar } from '@/components/helper/home';
import EditHelperProfileModal from '@/components/helper/profile/profileEditModal/EditHelperProfileModal';

const PAGE_BG = '#FBF5EC', DARK = '#2A1608', MUTED = '#7A5C3E', ORANGE = '#E86019';
const CARD = '#FFFFFF', LINE = '#EFE0CB', GREEN = '#059669';

export default function ExperienceScreen() {
  const router = useRouter();
  const { profileData, loading, refresh } = useHelperProfile();
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  const [editOpen, setEditOpen] = useState(false);
  // Guided onboarding deep-links here with ?edit=1 to open the editor directly.
  useEffect(() => { if (edit === '1') setEditOpen(true); }, [edit]);

  const workHistory = profileData?.work_history ?? [];
  const p: any = profileData?.profile ?? {};

  const range = (start: string, end?: string | null) => {
    const fmt = (d?: string | null) => {
      if (!d) return '';
      const dt = new Date(String(d).replace(' ', 'T'));
      return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
    };
    return end ? `${fmt(start)} – ${fmt(end)}` : `${fmt(start)} – Present`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Work Experience</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditOpen(true)}>
            <Ionicons name="create-outline" size={16} color={ORANGE} />
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Total Years of Experience</Text>
            <Text style={s.cardValue}>{Number(p.years_experience) > 0 ? `${p.years_experience} years` : 'Not set'}</Text>
          </View>

          {workHistory.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIc}><Ionicons name="briefcase-outline" size={30} color={ORANGE} /></View>
              <Text style={s.emptyTitle}>Add your work history</Text>
              <Text style={s.emptySub}>
                Past employers make you far more trustworthy to families — and you can mark ones happy to be a reference.
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setEditOpen(true)}>
                <Ionicons name="add" size={18} color="#fff" /><Text style={s.emptyBtnText}>Add work history</Text>
              </TouchableOpacity>
            </View>
          ) : (
            workHistory.map((w, i) => (
              <View key={w.history_id ?? i} style={s.card}>
                <View style={s.whHead}>
                  <Text style={s.whRole}>{w.position}</Text>
                  {w.can_contact && (
                    <View style={s.refBadge}>
                      <Ionicons name="call-outline" size={11} color={GREEN} />
                      <Text style={s.refBadgeText}>Reference</Text>
                    </View>
                  )}
                </View>
                <Text style={s.whEmployer}>{w.employer_name}</Text>
                <Text style={s.whDates}>{range(w.start_date, w.end_date)}</Text>
                {!!w.duties && <Text style={s.whDuties}>{w.duties}</Text>}
              </View>
            ))
          )}
        </ScrollView>

        <HelperTabBar />
      </SafeAreaView>

      <EditHelperProfileModal
        visible={editOpen}
        initialSection="experience"
        onClose={() => setEditOpen(false)}
        onSaveSuccess={() => { setEditOpen(false); refresh(); }}
        onProfileUpdated={refresh}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: LINE,
  },
  barBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: DARK },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 42 },
  editText: { fontSize: 15, fontWeight: '700', color: ORANGE },

  scroll: { padding: 16, paddingBottom: 120 },

  card: {
    backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: LINE,
  },
  cardLabel: { fontSize: 12.5, color: MUTED, marginBottom: 4 },
  cardValue: { fontSize: 17, fontWeight: '800', color: DARK },

  empty: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 20 },
  emptyIc: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: '#FDECE1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 16.5, fontWeight: '800', color: DARK, marginBottom: 6 },
  emptySub: { fontSize: 13.5, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ORANGE, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 14.5, fontWeight: '700' },

  whHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  whRole: { flex: 1, fontSize: 16, fontWeight: '800', color: DARK },
  refBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  refBadgeText: { fontSize: 10.5, fontWeight: '700', color: GREEN },
  whEmployer: { fontSize: 14, fontWeight: '600', color: ORANGE, marginTop: 3 },
  whDates: { fontSize: 12.5, color: MUTED, marginTop: 2 },
  whDuties: { fontSize: 13.5, color: DARK, marginTop: 8, lineHeight: 19 },
});
