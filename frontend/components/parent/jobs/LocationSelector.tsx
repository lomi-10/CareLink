// components/parent/jobs/LocationSelector.tsx
// Job location selector — search powered by OpenStreetMap Nominatim (free)

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { LocationSearchInput, LocationResult } from '@/components/shared';
import { theme } from '@/constants/theme';

interface LocationSelectorProps {
  province: string;
  municipality: string;
  barangay: string;
  onProvinceChange: (value: string) => void;
  onMunicipalityChange: (value: string) => void;
  onBarangayChange: (value: string) => void;
  onLatitudeChange?: (value: number | null) => void;
  onLongitudeChange?: (value: number | null) => void;
  disabled?: boolean;
}

export function LocationSelector({
  province, municipality, barangay,
  onProvinceChange, onMunicipalityChange, onBarangayChange,
  onLatitudeChange, onLongitudeChange,
  disabled = false,
}: LocationSelectorProps) {
  const [parentAddress, setParentAddress] = useState<{
    province: string; municipality: string; barangay: string;
    latitude?: number | null; longitude?: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadParentAddress(); }, []);

  const loadParentAddress = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      const user = JSON.parse(userData);
      const res  = await fetch(`${API_URL}/parent/get_profile.php?user_id=${user.user_id}`);
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        const addr = {
          province:    p.province    || '',
          municipality: p.municipality || '',
          barangay:    p.barangay    || '',
          latitude:    p.latitude  ? parseFloat(p.latitude)  : null,
          longitude:   p.longitude ? parseFloat(p.longitude) : null,
        };
        setParentAddress(addr);
        // Auto-fill from parent profile if job location not set yet
        if (!province && addr.province) {
          onProvinceChange(addr.province);
          onMunicipalityChange(addr.municipality);
          onBarangayChange(addr.barangay);
          if (addr.latitude  !== null) onLatitudeChange?.(addr.latitude ?? null);
          if (addr.longitude !== null) onLongitudeChange?.(addr.longitude ?? null);
        }
      }
    } catch (e) {
      console.error('[LocationSelector] loadParentAddress', e);
    } finally {
      setLoading(false);
    }
  };

  const applyParentAddress = () => {
    if (!parentAddress || disabled) return;
    onProvinceChange(parentAddress.province);
    onMunicipalityChange(parentAddress.municipality);
    onBarangayChange(parentAddress.barangay);
    onLatitudeChange?.(parentAddress.latitude ?? null);
    onLongitudeChange?.(parentAddress.longitude ?? null);
  };

  const getAddressPreview = () => {
    const parts = [barangay, municipality, province].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address set';
  };

  return (
    <View style={s.container}>
      <Text style={s.label}>Job Location <Text style={{ color: '#EF4444' }}>*</Text></Text>
      <Text style={s.hint}>Where will the helper work?</Text>

      {/* Use my address shortcut */}
      {parentAddress && parentAddress.municipality && (
        <TouchableOpacity
          style={[s.myAddressBtn, disabled && { opacity: 0.4 }]}
          onPress={applyParentAddress}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Ionicons name="home-outline" size={15} color={theme.color.parent} />
          <Text style={s.myAddressTxt} numberOfLines={1}>
            Use my address: {[parentAddress.barangay, parentAddress.municipality, parentAddress.province].filter(Boolean).join(', ')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Nominatim location search */}
      {!disabled && (
        <LocationSearchInput
          province={province}
          municipality={municipality}
          barangay={barangay}
          onSelect={(result: LocationResult) => {
            onProvinceChange(result.province);
            onMunicipalityChange(result.municipality);
            onBarangayChange(result.barangay);
            onLatitudeChange?.(result.latitude);
            onLongitudeChange?.(result.longitude);
          }}
          accentColor={theme.color.parent}
        />
      )}

      {/* Manual fields */}
      <View style={s.fieldsRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>Province *</Text>
          <TextInput
            style={[s.input, disabled && s.inputDisabled]}
            placeholder="e.g., Leyte"
            value={province}
            onChangeText={v => { onProvinceChange(v); onLatitudeChange?.(null); onLongitudeChange?.(null); }}
            placeholderTextColor="#999"
            editable={!disabled}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>Municipality *</Text>
          <TextInput
            style={[s.input, disabled && s.inputDisabled]}
            placeholder="e.g., Ormoc City"
            value={municipality}
            onChangeText={v => { onMunicipalityChange(v); onLatitudeChange?.(null); onLongitudeChange?.(null); }}
            placeholderTextColor="#999"
            editable={!disabled}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>Barangay</Text>
          <TextInput
            style={[s.input, disabled && s.inputDisabled]}
            placeholder="e.g., Cogon"
            value={barangay}
            onChangeText={v => { onBarangayChange(v); onLatitudeChange?.(null); onLongitudeChange?.(null); }}
            placeholderTextColor="#999"
            editable={!disabled}
          />
        </View>
      </View>

      {/* Preview */}
      <View style={s.previewBox}>
        <Ionicons name="location" size={15} color={theme.color.parent} />
        <Text style={s.previewText}>{getAddressPreview()}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { marginBottom: 24 },
  label:       { fontSize: 16, fontWeight: '700', color: '#1A1C1E', marginBottom: 4 },
  hint:        { fontSize: 13, color: '#666', marginBottom: 10 },
  myAddressBtn:{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.color.parentSoft, borderWidth: 1.5, borderColor: theme.color.parent + '40', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  myAddressTxt:{ flex: 1, fontSize: 13, color: theme.color.parent, fontWeight: '600' },
  fieldsRow:   { flexDirection: 'row', gap: 8, marginTop: 8 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 4 },
  input:       { backgroundColor: '#fff', borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#1A1C1E' },
  inputDisabled: { backgroundColor: '#F0F0F0', color: '#999' },
  previewBox:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.color.parentSoft, padding: 10, borderRadius: 10, marginTop: 10 },
  previewText: { flex: 1, fontSize: 13, color: theme.color.parent, fontWeight: '600' },
});
