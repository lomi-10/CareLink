// components/parent/jobs/LocationSelector.tsx
// Job location selector — search powered by OpenStreetMap Nominatim (free)

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { LocationSearchInput, LocationResult } from '@/components/shared';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER, SURFACE } from '../home/parentWarmTheme';

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
  const [editing, setEditing] = useState(false);

  useEffect(() => { loadParentAddress(); }, []);

  // Default to the collapsed summary view once a location is already known
  useEffect(() => {
    if (!loading) {
      setEditing(!(province && municipality));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const loadParentAddress = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;
      const user = JSON.parse(userData);
      const res  = await fetch(`${API_URL}/parent/get_profile.php?user_id=${user.user_id}&requester_id=${user.user_id}`);
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
    setEditing(false);
  };

  const getAddressPreview = () => {
    const parts = [barangay, municipality, province].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address set';
  };

  const hasLocation = Boolean(province && municipality);
  const hasParentAddress = Boolean(parentAddress && parentAddress.municipality);

  return (
    <View style={s.container}>
      <Text style={s.label}>Job Location <Text style={{ color: '#EF4444' }}>*</Text></Text>
      <Text style={s.hint}>Where will the helper work?</Text>

      {!editing && hasLocation ? (
        /* Collapsed summary view */
        <View style={s.summaryBox}>
          <View style={s.summaryRow}>
            <View style={s.summaryIconCircle}>
              <Ionicons name="location" size={18} color={BROWN} />
            </View>
            <Text style={s.summaryText} numberOfLines={2}>{getAddressPreview()}</Text>
            <TouchableOpacity
              style={[s.changeBtn, disabled && { opacity: 0.4 }]}
              onPress={() => setEditing(true)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={s.changeBtnText}>Change</Text>
            </TouchableOpacity>
          </View>

          {hasParentAddress && (
            <TouchableOpacity
              style={[s.myAddressBtn, disabled && { opacity: 0.4 }]}
              onPress={applyParentAddress}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <Ionicons name="home-outline" size={15} color={BROWN} />
              <Text style={s.myAddressTxt} numberOfLines={1}>
                Use my home address: {[parentAddress!.barangay, parentAddress!.municipality, parentAddress!.province].filter(Boolean).join(', ')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* Use my address shortcut */}
          {hasParentAddress && (
            <TouchableOpacity
              style={[s.myAddressBtn, disabled && { opacity: 0.4 }]}
              onPress={applyParentAddress}
              disabled={disabled}
              activeOpacity={0.75}
            >
              <Ionicons name="home-outline" size={15} color={BROWN} />
              <Text style={s.myAddressTxt} numberOfLines={1}>
                Use my home address: {[parentAddress!.barangay, parentAddress!.municipality, parentAddress!.province].filter(Boolean).join(', ')}
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
              accentColor={BROWN}
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
            <Ionicons name="location" size={15} color={BROWN} />
            <Text style={s.previewText}>{getAddressPreview()}</Text>
          </View>

          {hasLocation && (
            <TouchableOpacity
              style={[s.doneBtn, disabled && { opacity: 0.4 }]}
              onPress={() => setEditing(false)}
              disabled={disabled}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { marginBottom: 24 },
  label:       { fontSize: 16, fontWeight: '700', color: DARK, marginBottom: 4 },
  hint:        { fontSize: 13, color: MUTED, marginBottom: 10 },

  summaryBox:  { backgroundColor: SURFACE, borderWidth: 1, borderColor: DIVIDER, borderRadius: 14, padding: 12, gap: 10 },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  summaryText: { flex: 1, fontSize: 14, fontWeight: '600', color: DARK },
  changeBtn:   { borderWidth: 1.5, borderColor: CARAMEL, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  changeBtnText: { fontSize: 13, fontWeight: '700', color: BROWN },

  myAddressBtn:{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: ICON_BG, borderWidth: 1.5, borderColor: CARAMEL, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  myAddressTxt:{ flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },

  fieldsRow:   { flexDirection: 'row', gap: 8, marginTop: 8 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', color: '#333', marginBottom: 4 },
  input:       { backgroundColor: '#fff', borderWidth: 1.5, borderColor: DIVIDER, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#1A1C1E' },
  inputDisabled: { backgroundColor: '#F0F0F0', color: '#999' },

  previewBox:  { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: ICON_BG, padding: 10, borderRadius: 10, marginTop: 10 },
  previewText: { flex: 1, fontSize: 13, color: BROWN, fontWeight: '600' },

  doneBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: BROWN, borderRadius: 10, paddingVertical: 10, marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 18 },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
