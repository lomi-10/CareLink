// app/(parent)/profile/personal.tsx
// Personal Information detail screen — username, email, contact number.
// PHP: parent/get_profile.php (via useParentProfile)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, ScrollView, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useParentProfile } from '@/hooks/parent';
import { ParentTabBar } from '@/components/parent/home';
import EditParentProfileModal from '@/components/parent/profile/EditParentProfileModal';
import { BG, BROWN, DARK } from '@/components/parent/home/parentWarmTheme';
import { ds } from './detail.styles';

// ─── Component ────────────────────────────────────────────────────────────────

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { profileData, loading, refresh } = useParentProfile();
  const [editOpen, setEditOpen] = useState(false);

  if (loading || !profileData) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const { user, profile } = profileData;

  const rows = [
    { label: 'Username',       value: user?.username        || 'Not specified' },
    { label: 'Email',          value: user?.email           || 'Not specified' },
    { label: 'Contact Number', value: profile?.contact_number || 'Not specified' },
  ];

  return (
    <View style={ds.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={ds.bar}>
          <TouchableOpacity style={ds.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={ds.barTitle}>Personal Information</Text>
          <TouchableOpacity style={ds.editBtn} onPress={() => setEditOpen(true)}>
            <Ionicons name="pencil" size={17} color={BROWN} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={ds.scroll} showsVerticalScrollIndicator={false}>

          <View style={ds.iconHero}>
            <Ionicons name="person" size={34} color={BROWN} />
          </View>

          <View style={ds.card}>
            {rows.map((row, i) => (
              <React.Fragment key={row.label}>
                <FieldRow label={row.label} value={row.value} />
                {i < rows.length - 1 && <View style={ds.rowDiv} />}
              </React.Fragment>
            ))}
          </View>

          <TouchableOpacity style={ds.primaryBtn} onPress={() => setEditOpen(true)} activeOpacity={0.88}>
            <Text style={ds.primaryBtnText}>Edit Information</Text>
          </TouchableOpacity>
        </ScrollView>

        <ParentTabBar />
      </SafeAreaView>

      <EditParentProfileModal
        visible={editOpen}
        onClose={() => setEditOpen(false)}
        onSaveSuccess={() => { setEditOpen(false); refresh(); }}
      />
    </View>
  );
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ds.infoRow}>
      <Text style={ds.infoLabel}>{label}</Text>
      <View style={ds.infoValueBox}>
        <Text style={ds.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}
