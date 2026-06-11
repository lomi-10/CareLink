// app/(helper)/profile/public-preview.tsx
// Read-only preview of how this helper's profile appears to parents browsing/reviewing applicants.
// PHP: helper/get_profile.php (via useHelperProfile) — same data parents see via parent/get_applicant_profile.php

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHelperProfile } from '@/hooks/helper';
import { HelperTabBar } from '@/components/helper/home';
import { PAGE_BG, ORANGE, DARK, MUTED, GREEN } from './profile.theme';
import { s } from './public-preview.styles';

export default function PublicProfilePreview() {
  const router = useRouter();
  const { profileData, loading, getFullName } = useHelperProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: PAGE_BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const { profile, mappedSpecialties } = profileData ?? {
    profile: null, mappedSpecialties: { jobs: [], skills: [], languages: [] },
  };

  const fullName   = getFullName();
  const photoUri   = profile?.profile_image ?? null;
  const isVerified = profile?.verification_status === 'Verified';
  const location   = [profile?.city, profile?.province].filter(Boolean).join(', ');
  const jobRoles   = mappedSpecialties?.jobs ?? [];
  const skills     = mappedSpecialties?.skills ?? [];
  const languages  = mappedSpecialties?.languages ?? [];

  const ratingAvg   = Number((profile as any)?.rating_average ?? 0);
  const ratingCount = Number((profile as any)?.rating_count ?? 0);

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Public Profile Preview</Text>
          <View style={s.barSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Notice */}
          <View style={s.noticeBanner}>
            <Ionicons name="eye-outline" size={18} color={ORANGE} />
            <Text style={s.noticeText}>
              This is what parents see when they view your profile or review your job application.
            </Text>
          </View>

          {/* Hero */}
          <View style={s.hero}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.photo} contentFit="cover" />
            ) : (
              <View style={s.photoFallback}>
                <Ionicons name="person" size={40} color={MUTED} />
              </View>
            )}
            <Text style={s.heroName} numberOfLines={2}>{fullName}</Text>

            {location ? (
              <View style={s.heroLoc}>
                <Ionicons name="location-outline" size={14} color={MUTED} />
                <Text style={s.heroLocText}>{location}</Text>
              </View>
            ) : null}

            {isVerified && (
              <View style={s.pesoBadge}>
                <Ionicons name="shield-checkmark" size={14} color={GREEN} />
                <Text style={s.pesoBadgeText}>PESO Verified</Text>
              </View>
            )}

            {ratingCount > 0 && (
              <View style={s.ratingRow}>
                <Ionicons name="star" size={16} color="#D97706" />
                <Text style={s.ratingText}>{ratingAvg.toFixed(1)}</Text>
                <Text style={s.ratingSub}>({ratingCount} review{ratingCount !== 1 ? 's' : ''})</Text>
              </View>
            )}
          </View>

          {/* About */}
          {profile?.bio ? (
            <View style={s.card}>
              <Text style={s.cardTitle}>About</Text>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Work Details */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Work Details</Text>
            <View style={s.detailGrid}>
              <View style={s.detailBlock}>
                <Text style={s.detailLabel}>Experience</Text>
                <Text style={s.detailValue}>
                  {profile?.years_experience ? `${profile.years_experience} years` : 'Not specified'}
                </Text>
              </View>
              <View style={s.detailBlock}>
                <Text style={s.detailLabel}>Employment Type</Text>
                <Text style={s.detailValue}>{profile?.employment_type || 'Any'}</Text>
              </View>
              <View style={s.detailBlock}>
                <Text style={s.detailLabel}>Work Schedule</Text>
                <Text style={s.detailValue}>{profile?.work_schedule || 'Any'}</Text>
              </View>
              <View style={s.detailBlock}>
                <Text style={s.detailLabel}>Expected Salary</Text>
                <Text style={s.detailValue}>
                  {profile?.expected_salary
                    ? `₱${Number(profile.expected_salary).toLocaleString('en-PH')} / ${profile.salary_period?.toLowerCase() || 'month'}`
                    : 'Not specified'}
                </Text>
              </View>
            </View>
          </View>

          {/* Job Roles */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Job Roles</Text>
            {jobRoles.length > 0 ? (
              <View style={s.tagWrap}>
                {jobRoles.map((role, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagText}>{role}</Text></View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyNote}>No job roles listed yet.</Text>
            )}
          </View>

          {/* Skills */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Skills</Text>
            {skills.length > 0 ? (
              <View style={s.tagWrap}>
                {skills.map((skill, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagText}>{skill}</Text></View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyNote}>No skills listed yet.</Text>
            )}
          </View>

          {/* Languages */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Languages</Text>
            {languages.length > 0 ? (
              <View style={s.tagWrap}>
                {languages.map((lang, i) => (
                  <View key={i} style={s.tag}><Text style={s.tagText}>{lang}</Text></View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyNote}>No languages listed yet.</Text>
            )}
          </View>
        </ScrollView>

        <HelperTabBar />
      </SafeAreaView>
    </View>
  );
}
