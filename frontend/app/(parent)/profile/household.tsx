// app/(parent)/profile/household.tsx
// Household Information detail screen — housing type, family size, children/elderly, pets.
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
import { ElderlyList } from '@/components/parent/profile';
import EditParentProfileModal from '@/components/parent/profile/EditParentProfileModal';
import { formatParentHouseholdType } from '@/constants/parentHousehold';
import { BG, BROWN, DARK, MUTED } from '@/components/parent/home/parentWarmTheme';
import { ds } from './detail.styles';

// ─── Component ────────────────────────────────────────────────────────────────

export default function HouseholdInfoScreen() {
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

  const { household, children, elderly } = profileData;

  const rows = [
    { label: 'Housing Type',         value: formatParentHouseholdType(household?.household_type) },
    { label: 'Total Household Size', value: household?.household_size?.toString() || 'Not specified' },
    { label: 'Children',             value: (profileData.children_count ?? 0).toString() },
    { label: 'Elderly Members',      value: (profileData.elderly_count ?? 0).toString() },
    { label: 'Pets',                 value: household?.has_pets ? (household?.pet_details || 'Yes') : 'None' },
  ];

  return (
    <View style={ds.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={ds.bar}>
          <TouchableOpacity style={ds.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={ds.barTitle}>Household Information</Text>
          <TouchableOpacity style={ds.editBtn} onPress={() => setEditOpen(true)}>
            <Ionicons name="pencil" size={17} color={BROWN} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={ds.scroll} showsVerticalScrollIndicator={false}>

          <View style={ds.iconHero}>
            <Ionicons name="home" size={32} color={BROWN} />
          </View>

          <View style={ds.card}>
            {rows.map((row, i) => (
              <React.Fragment key={row.label}>
                <FieldRow label={row.label} value={row.value} />
                {i < rows.length - 1 && <View style={ds.rowDiv} />}
              </React.Fragment>
            ))}
          </View>

          {/* Children Details */}
          {(children?.length ?? 0) > 0 && (
            <>
              <Text style={ds.groupLabel}>Children Details</Text>
              <View style={ds.card}>
                {children!.map((child, i) => (
                  <React.Fragment key={child.child_id}>
                    <View style={ds.childRow}>
                      <View style={ds.childIcon}>
                        <Ionicons
                          name={child.gender === 'Female' ? 'woman' : child.gender === 'Male' ? 'man' : 'person'}
                          size={18} color={BROWN}
                        />
                      </View>
                      <View style={ds.childInfo}>
                        <Text style={ds.childName}>Child {i + 1}</Text>
                        <Text style={ds.childSub}>{child.age} years old</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={MUTED} />
                    </View>
                    {i < children!.length - 1 && <View style={ds.rowDiv} />}
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          <ElderlyList elderly={elderly} />

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
