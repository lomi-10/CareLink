// app/(helper)/profile/personal.tsx
// Personal Information + Work Preferences detail screen.
// PHP: helper/get_profile.php (via useHelperProfile)

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator, ScrollView,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHelperProfile } from '@/hooks/helper';
import { HelperTabBar } from '@/components/helper/home';
import EditHelperProfileModal from '@/components/helper/profile/profileEditModal/EditHelperProfileModal';
import { useProfileTheme } from './profile.theme';
import { createStyles } from './personal.styles';

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalInfoScreen() {
  const router = useRouter();
  const t = useProfileTheme();
  const { DARK, MUTED, ORANGE, GREEN } = t;
  const s = useMemo(() => createStyles(t), [t]);
  const { profileData, loading, refresh } = useHelperProfile();
  const [editOpen, setEditOpen] = useState(false);
  // Guided onboarding deep-links here with ?edit=1 to open the editor directly.
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => { if (edit === '1') setEditOpen(true); }, [edit]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FBF5EC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const profile = profileData?.profile;

  // Age is computed from the birth date so it's always accurate (never blank).
  const computeAge = (dob?: string | null): number | null => {
    if (!dob) return null;
    const d = new Date(String(dob).replace(' ', 'T'));
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
    return a >= 0 && a < 120 ? a : null;
  };
  const helperAge = (profile?.age as number | undefined) ?? computeAge(profile?.date_of_birth ?? profile?.birth_date);

  const personalRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'male',              label: 'Gender',          value: profile?.gender           || '—' },
    { icon: 'calendar',          label: 'Date of Birth',   value: profile?.date_of_birth    || '—' },
    { icon: 'person',            label: 'Age',             value: helperAge != null ? `${helperAge} years old` : '—' },
    { icon: 'heart-outline',     label: 'Civil Status',    value: profile?.civil_status     || '—' },
    { icon: 'business-outline',  label: 'Religion',        value: profile?.religion         || '—' },
    { icon: 'school-outline',    label: 'Education Level', value: profile?.education_level  || '—' },
    { icon: 'call-outline',      label: 'Contact Number',  value: profile?.contact_number   || '—' },
  ];

  const workRows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'briefcase-outline', label: 'Employment Type',  value: profile?.employment_type  || '—' },
    { icon: 'time-outline',      label: 'Work Schedule',    value: profile?.work_schedule    || '—' },
    { icon: 'trending-up',       label: 'Years Experience', value: profile?.years_experience ? `${profile.years_experience} years` : 'Entry level' },
    { icon: 'cash-outline',      label: 'Expected Salary',  value: profile?.expected_salary  ? `₱${Number(profile.expected_salary).toLocaleString()} / ${profile.salary_period ?? 'month'}` : 'Negotiable' },
  ];

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Personal Information</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditOpen(true)}>
            <Text style={s.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Info banner */}
          <View style={s.banner}>
            <View style={[s.bannerIcon, { backgroundColor: '#FEE2D5' }]}>
              <Ionicons name="person-circle-outline" size={26} color={ORANGE} />
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>Your personal details</Text>
              <Text style={s.bannerSub}>Keep your information updated for a better match.</Text>
            </View>
            {/* ============================================================
                🖼️  DECORATIVE ILLUSTRATION
                ============================================================
            <Image
              source={require("../../../assets/profile/shield-plant.png")}
              style={s.bannerIllust}
              contentFit="contain"
              pointerEvents="none"
            />
            */}
          </View>

          {/* Personal Info rows */}
          <View style={s.card}>
            {personalRows.map((row, i) => (
              <React.Fragment key={row.label}>
                <InfoRow icon={row.icon} label={row.label} value={row.value} />
                {i < personalRows.length - 1 && <View style={s.rowDiv} />}
              </React.Fragment>
            ))}
          </View>

          {/* Work Preferences */}
          <Text style={s.groupLabel}>Work Preferences</Text>
          <View style={s.card}>
            {workRows.map((row, i) => (
              <React.Fragment key={row.label}>
                <InfoRow icon={row.icon} label={row.label} value={row.value} />
                {i < workRows.length - 1 && <View style={s.rowDiv} />}
              </React.Fragment>
            ))}
          </View>

          {/* Privacy notice */}
          <View style={s.privacyCard}>
            <View style={[s.privacyIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="lock-closed" size={20} color={GREEN} />
            </View>
            <View>
              <Text style={s.privacyTitle}>Your information is secure</Text>
              <Text style={s.privacySub}>CareLink will never share your personal information without your consent.</Text>
            </View>
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

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const t = useProfileTheme();
  const { MUTED } = t;
  const s = useMemo(() => createStyles(t), [t]);
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Ionicons name={icon} size={18} color={MUTED} />
      </View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}
