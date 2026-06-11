// app/(helper)/profile/skills.tsx
// Skills & Specialties + Languages + Experience detail screen.
// PHP: helper/get_profile.php (via useHelperProfile)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, ScrollView,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHelperProfile } from '@/hooks/helper';
import { HelperTabBar } from '@/components/helper/home';
import EditHelperProfileModal from '@/components/helper/profile/profileEditModal/EditHelperProfileModal';
import { DARK, MUTED, ORANGE, GREEN } from './profile.theme';
import { s } from './skills.styles';

// ─── Component ────────────────────────────────────────────────────────────────

export default function SkillsScreen() {
  const router = useRouter();
  const { profileData, loading, refresh } = useHelperProfile();
  const [editOpen, setEditOpen] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FBF5EC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const jobs      = profileData?.mappedSpecialties?.jobs?.filter(Boolean)      ?? [];
  const skills    = profileData?.mappedSpecialties?.skills?.filter(Boolean)    ?? [];
  const languages = profileData?.mappedSpecialties?.languages?.filter(Boolean) ?? [];
  const exp       = profileData?.profile?.years_experience;

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Skills & Specialties</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditOpen(true)}>
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Banner */}
          <View style={[s.banner, { backgroundColor: '#F5F0FF' }]}>
            <View style={[s.bannerIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="sparkles" size={24} color="#7C3AED" />
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>Showcase your strengths</Text>
              <Text style={s.bannerSub}>Add the roles and skills you're confident in.</Text>
            </View>
            {/* ============================================================
                🖼️  DECORATIVE ILLUSTRATION — clipboard + checklist
                ============================================================
            <Image
              source={require("../../../assets/profile/clipboard-decor.png")}
              style={s.bannerIllust}
              contentFit="contain"
              pointerEvents="none"
            />
            */}
          </View>

          {/* Job Roles */}
          <PillSection title="Job Roles"   count={jobs.length}      items={jobs}      highlightFirst accentColor={ORANGE} />
          <PillSection title="Skills"      count={skills.length}    items={skills}    checkmark accentColor={GREEN} />
          <PillSection title="Languages"   count={languages.length} items={languages} checkmark accentColor="#0891B2" />

          {/* Experience */}
          <Text style={s.groupLabel}>Experience</Text>
          <View style={s.expCard}>
            <View style={[s.expIcon, { backgroundColor: '#FEE2D5' }]}>
              <Ionicons name="time" size={22} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.expValue}>{exp ? `${exp} Years` : 'Entry level'}</Text>
              <Text style={s.expLabel}>Total Experience</Text>
            </View>
            <TouchableOpacity onPress={() => setEditOpen(true)}>
              <Text style={s.expEdit}>Update</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <HelperTabBar />
      </SafeAreaView>

      <EditHelperProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSaveSuccess={() => { setEditOpen(false); refresh(); }}
      />
    </View>
  );
}

// ─── PillSection ──────────────────────────────────────────────────────────────

function PillSection({ title, count, items, highlightFirst = false, checkmark = false, accentColor = ORANGE }: {
  title:           string;
  count:           number;
  items:           string[];
  highlightFirst?: boolean;
  checkmark?:      boolean;
  accentColor?:    string;
}) {
  return (
    <View style={s.pillWrap}>
      <View style={s.pillHeader}>
        <Text style={s.pillTitle}>{title}</Text>
        <View style={s.pillBadge}>
          <Text style={s.pillBadgeText}>{count}</Text>
        </View>
      </View>
      {items.length === 0 ? (
        <Text style={s.pillEmpty}>Not specified — tap Edit to add.</Text>
      ) : (
        <View style={s.pillsRow}>
          {items.map((item, i) => {
            const highlighted = highlightFirst && i === 0;
            return (
              <View
                key={item + i}
                style={[
                  s.pill,
                  highlighted
                    ? { backgroundColor: accentColor, borderColor: accentColor }
                    : { backgroundColor: '#FFFFFF', borderColor: '#D4B896' },
                ]}
              >
                <Text style={[s.pillText, { color: highlighted ? '#fff' : DARK }]}>
                  {item}
                </Text>
                {checkmark && !highlighted && (
                  <Ionicons name="checkmark-circle" size={13} color={accentColor} />
                )}
                {highlighted && (
                  <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.8)" />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
