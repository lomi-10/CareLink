// components/helper/profile/profileEditModal/AddressSection.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';
import { LocationSearchInput, LocationResult } from '@/components/shared';
import { theme } from '@/constants/theme';
import { useT } from '@/contexts/LocaleContext';

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
  const { t } = useT();

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
        <Text style={styles.sectionTitleText}>{t('helper.setup.currentAddress')}</Text>
      </View>

      {/* ── Location search (Nominatim / OpenStreetMap) ── */}
      <LocationSearchInput
        province={province}
        municipality={municipality}
        barangay={barangay}
        onSelect={handleLocationSelect}
        accentColor={theme.color.helper}
        label={t('helper.setup.searchLocation')}
      />

      {/* ── Manual overrides if needed ── */}
      <View style={isWeb ? styles.webRow : undefined}>
        <View style={isWeb ? { flex: 1, paddingRight: 12 } : undefined}>
          <LabeledInput label={t('helper.setup.province')} required value={province} onChangeText={v => { setProvince(v); setLatitude?.(null); setLongitude?.(null); }} placeholder="Leyte" />
          <LabeledInput label={t('helper.setup.municipality')} required value={municipality} onChangeText={v => { setMunicipality(v); setLatitude?.(null); setLongitude?.(null); }} placeholder="Isabel" />
          <LabeledInput label={t('helper.setup.barangay')} required value={barangay} onChangeText={v => { setBarangay(v); setLatitude?.(null); setLongitude?.(null); }} placeholder="San Jose" />
        </View>
      </View>

      <LabeledInput label={t('helper.setup.landmarkStreet')} value={landmark} onChangeText={setLandmark} placeholder={t('helper.setup.locationHint')} />
    </View>
  );
}
