// components/helper/profile/profileEditModal/AddressSection.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';
import { LocationSearchInput, LocationResult } from '@/components/shared';
import { theme } from '@/constants/theme';

interface Props {
  isWeb: boolean;
  province: string;        setProvince:     (v: string) => void;
  municipality: string;    setMunicipality: (v: string) => void;
  barangay: string;        setBarangay:     (v: string) => void;
  landmark: string;        setLandmark:     (v: string) => void;
  setLatitude?:  (v: number | null) => void;
  setLongitude?: (v: number | null) => void;
}

export function AddressSection({
  isWeb,
  province, setProvince,
  municipality, setMunicipality,
  barangay, setBarangay,
  landmark, setLandmark,
  setLatitude, setLongitude,
}: Props) {

  const handleLocationSelect = (result: LocationResult) => {
    setProvince(result.province);
    setMunicipality(result.municipality);
    setBarangay(result.barangay);
    setLatitude?.(result.latitude);
    setLongitude?.(result.longitude);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#FFF4E5' }]}>
          <Ionicons name="location" size={20} color="#FF9500" />
        </View>
        <Text style={styles.sectionTitleText}>Current Address</Text>
      </View>

      {/* ── Location search (Nominatim / OpenStreetMap) ── */}
      <LocationSearchInput
        province={province}
        municipality={municipality}
        barangay={barangay}
        onSelect={handleLocationSelect}
        accentColor={theme.color.helper}
        label="Search Location"
      />

      {/* ── Manual overrides if needed ── */}
      <View style={isWeb ? styles.webRow : undefined}>
        <View style={isWeb ? { flex: 1, paddingRight: 12 } : undefined}>
          <LabeledInput label="Province" required value={province} onChangeText={v => { setProvince(v); setLatitude?.(null); setLongitude?.(null); }} placeholder="Leyte" />
        </View>
        <View style={isWeb ? { flex: 2 } : undefined}>
          <View style={styles.inputGrid}>
            <View style={styles.inputHalf}>
              <LabeledInput label="Municipality" required value={municipality} onChangeText={v => { setMunicipality(v); setLatitude?.(null); setLongitude?.(null); }} placeholder="Isabel" />
            </View>
            <View style={styles.inputHalf}>
              <LabeledInput label="Barangay" required value={barangay} onChangeText={v => { setBarangay(v); setLatitude?.(null); setLongitude?.(null); }} placeholder="San Jose" />
            </View>
          </View>
        </View>
      </View>

      <LabeledInput label="Landmark / Street" value={landmark} onChangeText={setLandmark} placeholder="Near church / Street name" />
    </View>
  );
}
